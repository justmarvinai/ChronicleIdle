import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { playSfx } from '@audio/index';
import { CURRENCY_BY_ID } from '@content/currencies/index';
import type { CurrencyAmount, CurrencyId } from '@content/currencies/types';
import type { Element } from '@content/champions/types';
import { IDLE_CAPACITY_BANDS, IDLE_CHANCES, type IdleChanceDef } from '@content/balance/idle';
import { content } from '@content/registry';
import { idleGuaranteed } from '@engine/economy/idle';
import { BREW_OF_ELEMENT, UNIVERSAL_BREW } from '@engine/progression/tavern-level';
import { formatDuration } from '@engine/time/clock';
import { t, translate, type I18nKey } from '@i18n/index';
import { idleView, type IdleClaimSummary } from '@state/idle';
import { selectActions, selectSave } from '@state/selectors';
import { useGameStore } from '@state/store';
import { AssetImage } from '@ui/components/AssetImage/AssetImage';
import { TintedIcon } from '@ui/components/AssetImage/TintedIcon';
import { Button } from '@ui/components/Button/Button';
import { Dialog } from '@ui/components/Dialog/Dialog';
import { FillRing } from '@ui/components/FillRing/FillRing';
import { FxSprite } from '@ui/components/FxSprite/FxSprite';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { ScrollArea } from '@ui/components/ScrollArea/ScrollArea';
import { prefersReducedMotion } from '@ui/hooks/reducedMotion';
import { useNow } from '@ui/hooks/useNow';
import { ELEMENT_COLOR, ELEMENT_GLYPH } from '@ui/styles/display-maps';
import styles from './IdleChestDialog.module.css';

/** Hours as the chest talks about them: "4h 20m", minutes under an hour, and "0m" for nothing. */
function hoursLabel(hours: number): string {
  if (hours <= 0) return '0m';
  return formatDuration(Math.round(hours * 3_600_000));
}

/** The vault's ring around the chest, in stage pixels. */
const VAULT = 300;
/** How far apart the reward cards arrive after the chest opens, in seconds. */
const STAGGER = 0.07;
/** The contents column's scroll height: the preview's cards and its four luck rows fit unscrolled. */
const CONTENTS_HEIGHT = 520;
/** Where the glints catch the light on a full chest, as % of the vault, with their size and beat. */
const GLINTS = [
  { x: 31, y: 33, size: 30, delay: 0 },
  { x: 71, y: 36, size: 22, delay: 0.9 },
  { x: 64, y: 70, size: 18, delay: 1.7 },
  { x: 35, y: 66, size: 14, delay: 2.4 },
] as const;
/** Screens where the Campaign already is, so the way there only has to close the dialog. */
const CAMPAIGN_SCREENS: ReadonlySet<string> = new Set(['campaign', 'settlement']);

/** The vault's four looks: asleep before a farm, filling, brimming, and just emptied. */
type VaultState = 'dormant' | 'filling' | 'brimming' | 'opened';

/**
 * The Idle Chest (docs/design/ECONOMY.md §6, docs/tech/UI_DESIGN.md §5.2): the chest in its vault
 * with the fill drawn round it, the wait, the capacity bands the chronicle climbs through, what is
 * waiting inside as cards with the pace each fills at, the luck it may turn up — and, once opened,
 * the haul. Everything here is derived from one stored instant, so the dialog cannot disagree with
 * the wait.
 */
export function IdleChestDialog({ onClose }: { onClose: () => void }) {
  const actions = useGameStore(selectActions);
  const save = useGameStore(selectSave);
  const screen = useGameStore((state) => state.ui.stack[state.ui.stack.length - 1]?.name);
  // Re-read twice a minute: the chest accrues at that resolution and nothing here ticks faster.
  const now = useNow(30_000);
  const [haul, setHaul] = useState<IdleClaimSummary | null>(null);
  const reduced = prefersReducedMotion();

  // The save is replaced whenever anything is written to it, opening the chest included, so the
  // view recomputes on a claim without the dialog having to watch the timestamp itself.
  const view = useMemo(() => (save ? idleView(save, now) : null), [save, now]);

  const open = (): void => {
    const result = actions.claimIdleChest();
    if (!result.ok) {
      playSfx('ui.error');
      return;
    }
    playSfx('chest.open');
    setHaul(result.value);
    actions.toast('reward', 'idle.toast', { hours: hoursLabel(result.value.hours) });
  };

  const toCampaign = (): void => {
    if (screen && CAMPAIGN_SCREENS.has(screen)) onClose();
    else actions.push({ name: 'campaign' });
  };

  if (!view) return null;
  const { fill, guaranteed } = view;
  const farming = view.tier > 0;
  const element = content.settlementByIndex(view.settlementIndex)?.element ?? null;
  const rows = haul ? haul.rewards : guaranteed.currencies;
  const playerXp = haul ? haul.playerXp : guaranteed.playerXp;
  const level = save?.profile.level ?? 1;
  const state: VaultState = haul ? 'opened' : !farming ? 'dormant' : fill.full ? 'brimming' : 'filling';
  // The pace of the farm the chest is on (or, before one, of the first): what an hour puts in it.
  const pace = idleGuaranteed({ tier: Math.max(1, view.tier), hours: 1, brewElement: element });
  const paceOf = (currency: CurrencyId): number =>
    pace.currencies.find((entry) => entry.currency === currency)?.amount ?? 0;
  const fraction = haul ? 0 : fill.fraction;

  return (
    <Dialog
      title={t('idle.title')}
      onClose={onClose}
      width={1000}
      testId="dialog-idle-chest"
      footer={
        haul ? (
          <Button variant="primary" onClick={onClose} data-testid="idle-continue">
            {t('common.continue')}
          </Button>
        ) : (
          <Button
            variant="primary"
            size="lg"
            disabled={!fill.claimable || !farming}
            onClick={open}
            data-testid="idle-claim"
          >
            {fill.claimable ? t('idle.claim') : t('idle.claimWait')}
          </Button>
        )
      }
    >
      <div className={styles.layout}>
        <section className={styles.stage}>
          <p className={styles.subtitle}>{t('idle.subtitle')}</p>
          <div className={styles.vault} data-state={state} data-testid="idle-vault">
            <span className={styles.glow} aria-hidden="true" />
            {state === 'brimming' ? <span className={styles.rays} aria-hidden="true" /> : null}
            <FillRing
              fraction={fraction}
              size={VAULT - 24}
              thickness={12}
              color={!farming ? 'var(--gold-1)' : fill.full ? 'var(--gold-3)' : 'var(--ok)'}
              className={styles.ring ?? ''}
            />
            <motion.div
              className={styles.chest}
              animate={reduced || state !== 'brimming' ? {} : { y: [0, -8, 0], rotate: [0, -1.5, 1.5, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            >
              <AssetImage asset="ui.stone_vine.icon_chest" className={styles.chestArt} alt="" />
            </motion.div>
            {state === 'brimming' && !reduced
              ? GLINTS.map((glint) => (
                  <span
                    key={`${glint.x}-${glint.y}`}
                    className={styles.glint}
                    aria-hidden="true"
                    style={
                      {
                        left: `${glint.x}%`,
                        top: `${glint.y}%`,
                        '--glint': `${glint.size}px`,
                        animationDelay: `${glint.delay}s`,
                      } as CSSProperties
                    }
                  />
                ))
              : null}
            {haul && !reduced ? (
              <FxSprite effect="fx.gamefx.medium_star" size={260} playKey={1} className={styles.burst} />
            ) : null}
            <span className={`num ${styles.percent}`}>{Math.round(fraction * 100)}%</span>
          </div>

          <p
            className={`${styles.readout} ${fill.full && farming && !haul ? styles.readoutFull : ''}`}
            data-testid="idle-timer"
          >
            {fill.full
              ? farming
                ? t('idle.full')
                : t('idle.fullNoFarm')
              : translate('idle.filling', { time: formatDuration(fill.msToFull) })}
          </p>
          <p className={`num ${styles.fillLine}`}>
            {translate('idle.fill', {
              hours: hoursLabel(haul ? 0 : fill.hours),
              capacity: hoursLabel(view.capacityHours),
            })}
          </p>

          <CapacityTrack level={level} capacity={view.capacityHours} />
          <p className={styles.capacity} data-testid="idle-capacity">
            {view.nextCapacity
              ? translate('idle.capacity', {
                  hours: hoursLabel(view.capacityHours),
                  next: hoursLabel(view.nextCapacity.hours),
                  level: view.nextCapacity.level,
                })
              : translate('idle.capacityMax', { hours: hoursLabel(view.capacityHours) })}
          </p>
        </section>

        <section className={styles.contents}>
          {farming ? (
            <>
              <FarmLine settlementIndex={view.settlementIndex} tier={view.tier} element={element} />
              <ScrollArea height={CONTENTS_HEIGHT} className={styles.scroll}>
                <h3 className={`display ${styles.heading}`}>{haul ? t('idle.haul') : t('idle.preview')}</h3>
                {rows.length === 0 && playerXp === 0 ? (
                  <p className={styles.empty}>{t('idle.empty')}</p>
                ) : (
                  <ul className={styles.rewards} data-testid="idle-rewards">
                    {rows.map((entry, index) => (
                      <RewardCard
                        key={entry.currency}
                        entry={entry}
                        index={index}
                        arriving={haul !== null}
                        note={haul ? undefined : paceNote(paceOf(entry.currency))}
                      />
                    ))}
                    {playerXp > 0 ? (
                      <XpCard
                        amount={playerXp}
                        index={rows.length}
                        arriving={haul !== null}
                        note={haul ? undefined : paceNote(pace.playerXp)}
                      />
                    ) : null}
                  </ul>
                )}

                {haul ? (
                  <Lucky procs={haul.procs} element={element} />
                ) : (
                  <section className={styles.luck}>
                    <h3 className={`display ${styles.heading}`}>{t('idle.luck')}</h3>
                    <ul className={styles.luckList}>
                      {IDLE_CHANCES.map((def) => (
                        <li key={def.id} className={styles.luckRow}>
                          <LuckIcon def={def} element={element} />
                          <span className={styles.luckName}>{luckName(def, element)}</span>
                          <span className={`num ${styles.luckChance}`}>
                            {t('idle.luck.chance', { chance: Math.round(chanceAt(def, view.tier) * 100) })}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <p className={styles.hint}>{t('idle.previewHint')}</p>
                  </section>
                )}

                {haul?.wasFull ? (
                  <p className={styles.overflow} data-testid="idle-overflow">
                    {translate('idle.overflow', { hours: hoursLabel(view.capacityHours) })}
                  </p>
                ) : null}
              </ScrollArea>
            </>
          ) : (
            <QuietDocks pace={pace.currencies} playerXp={pace.playerXp} onCampaign={toCampaign} />
          )}
        </section>
      </div>
    </Dialog>
  );
}

/** "1,440 an hour" — the pace a card fills at, or nothing where the farm adds none. */
function paceNote(amount: number): string | undefined {
  return amount > 0 ? t('idle.rate', { amount: amount.toLocaleString('en-US') }) : undefined;
}

/** A luck roll's chance per hour at a farm tier: the better odds once the tier reaches them. */
function chanceAt(def: IdleChanceDef, tier: number): number {
  return def.betterChance !== undefined && def.betterFrom !== undefined && tier >= def.betterFrom
    ? def.betterChance
    : def.chance;
}

/** The currency a luck roll pays: a brew is the farm's own element, everything else names itself. */
function luckCurrency(def: IdleChanceDef, element: Element | null): CurrencyId {
  if (def.brew) return element ? BREW_OF_ELEMENT[element] : UNIVERSAL_BREW;
  return def.currency ?? UNIVERSAL_BREW;
}

/** A luck roll by name — the brew by the one the farm turns up, where there is a farm. */
function luckName(def: IdleChanceDef, element: Element | null): string {
  return def.brew && element
    ? translate(CURRENCY_BY_ID[luckCurrency(def, element)].name)
    : t(`idle.luck.${def.id}` as I18nKey);
}

function LuckIcon({ def, element }: { def: IdleChanceDef; element: Element | null }) {
  const currency = CURRENCY_BY_ID[luckCurrency(def, element)];
  return (
    <span className={styles.luckIcon}>
      <TintedIcon asset={currency.icon} tint={def.brew ? undefined : currency.tint} size={32} />
    </span>
  );
}

/** The settlement the chest farms, in its element's colour, and the tier that sets the pace. */
function FarmLine({
  settlementIndex,
  tier,
  element,
}: {
  settlementIndex: number;
  tier: number;
  element: Element | null;
}) {
  const settlement = content.settlementByIndex(settlementIndex);
  const tone = { '--element': element ? ELEMENT_COLOR[element] : 'var(--gold-2)' } as CSSProperties;
  return (
    <p className={styles.farm} style={tone} data-testid="idle-tier">
      {element ? (
        <span className={styles.farmMark}>
          <Glyph glyph={ELEMENT_GLYPH[element]} size={22} color="var(--element)" />
        </span>
      ) : null}
      <span className={styles.farmName}>
        {translate('idle.farming', {
          settlement: settlement ? t(settlement.name as I18nKey) : String(settlementIndex),
        })}
      </span>
      <span className={`display ${styles.tierChip}`}>{t('idle.tierChip', { tier })}</span>
    </p>
  );
}

/** What the chest turned up besides the rest — the rolls that fired, by what they paid. */
function Lucky({ procs, element }: { procs: Readonly<Record<string, number>>; element: Element | null }) {
  const fired = IDLE_CHANCES.filter((def) => (procs[def.id] ?? 0) > 0);
  if (fired.length === 0) return null;
  return (
    <section className={styles.luck} data-testid="idle-lucky">
      <h3 className={`display ${styles.heading}`}>{t('idle.lucky')}</h3>
      <ul className={styles.luckList}>
        {fired.map((def) => (
          <li key={def.id} className={`${styles.luckRow} ${styles.luckHit}`}>
            <LuckIcon def={def} element={element} />
            <span className={styles.luckName}>
              {t(`idle.lucky.${def.id}` as I18nKey)}
              {(procs[def.id] ?? 0) > 1 ? ` ×${procs[def.id]}` : ''}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Before the first boss falls the chest farms nothing: say so, show what the first farm will pay
 * an hour so the wait has a point, and offer the way to the boss.
 */
function QuietDocks({
  pace,
  playerXp,
  onCampaign,
}: {
  pace: readonly CurrencyAmount[];
  playerXp: number;
  onCampaign: () => void;
}) {
  return (
    <div className={styles.quiet} data-testid="idle-no-farm">
      <span className={styles.quietMark} aria-hidden="true">
        <span className={styles.quietDisc} />
        <AssetImage asset="ui.dark_ember.frame_round_lg" className={styles.quietRing} alt="" />
        <Glyph glyph="glyph.skull_wreath" size={46} color="var(--gold-2)" className={styles.quietGlyph} />
      </span>
      <h3 className={`display ${styles.quietTitle}`}>{t('idle.noFarm')}</h3>
      <p className={styles.quietBody}>{t('idle.noFarmBody')}</p>
      <Button
        onClick={onCampaign}
        icon={<Glyph glyph="glyph.crossed_swords" size={22} color="var(--gold-3)" />}
        data-testid="idle-to-campaign"
      >
        {t('idle.toCampaign')}
      </Button>
      <h4 className={`display ${styles.heading} ${styles.quietHeading}`}>{t('idle.firstFarm')}</h4>
      <ul className={styles.rewards} data-testid="idle-first-farm">
        {pace.map((entry, index) => (
          <RewardCard
            key={entry.currency}
            entry={entry}
            index={index}
            arriving={false}
            note={t('idle.perHour')}
          />
        ))}
        {playerXp > 0 ? (
          <XpCard amount={playerXp} index={pace.length} arriving={false} note={t('idle.perHour')} />
        ) : null}
      </ul>
    </div>
  );
}

interface CardProps {
  index: number;
  /** The chest has just been opened: the card pops in, one after another. */
  arriving: boolean;
  /** The line under the name — the pace it fills at. */
  note: string | undefined;
}

function RewardCard({ entry, ...card }: CardProps & { entry: CurrencyAmount }) {
  const def = CURRENCY_BY_ID[entry.currency];
  return (
    <Card {...card} name={translate(def.name)} amount={entry.amount}>
      <TintedIcon asset={def.icon} tint={def.tint} size={44} />
    </Card>
  );
}

function XpCard({ amount, ...card }: CardProps & { amount: number }) {
  return (
    <Card {...card} name={t('idle.playerXp')} amount={amount} testId="idle-player-xp">
      <AssetImage asset="ui.stone_vine.icon_star" className={styles.xpIcon} alt="" />
    </Card>
  );
}

/** One line of the chest's contents: the icon, the name with its pace under it, and the amount. */
function Card({
  index,
  arriving,
  note,
  name,
  amount,
  testId,
  children,
}: CardProps & { name: string; amount: number; testId?: string; children: ReactNode }) {
  const reduced = prefersReducedMotion();
  return (
    <motion.li
      className={styles.card}
      data-testid={testId}
      initial={arriving && !reduced ? { opacity: 0, y: 12, scale: 0.9 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * STAGGER, duration: 0.3 }}
    >
      <span className={styles.cardIcon}>{children}</span>
      <span className={styles.cardText}>
        <span className={styles.cardName}>{name}</span>
        {note ? <span className={`num ${styles.cardNote}`}>{note}</span> : null}
      </span>
      <span className={`num ${styles.cardAmount}`}>+{amount.toLocaleString('en-US')}</span>
    </motion.li>
  );
}

/** Each capacity band with the chronicle level it starts at: the band before it ends one short. */
const BANDS = IDLE_CAPACITY_BANDS.map((band, index) => ({
  hours: band.hours,
  from: index === 0 ? 1 : (IDLE_CAPACITY_BANDS[index - 1]?.upTo ?? 0) + 1,
}));

/**
 * The capacity bands as a road (ECONOMY.md §6): each band's hours on a notch, the ones the
 * chronicle has passed lit, the one it holds now bright, and the level that opens the next.
 */
function CapacityTrack({ level, capacity }: { level: number; capacity: number }) {
  return (
    <ol className={styles.track} aria-label={t('idle.bands')}>
      {BANDS.map((band) => {
        const state = band.hours === capacity ? 'now' : level >= band.from ? 'past' : 'ahead';
        return (
          <li key={band.hours} className={styles.band} data-state={state}>
            <span className={styles.notch} />
            <span className={`num ${styles.bandHours}`}>{band.hours}h</span>
            <span className={`num ${styles.bandLevel}`}>{t('idle.bandLevel', { level: band.from })}</span>
          </li>
        );
      })}
    </ol>
  );
}
