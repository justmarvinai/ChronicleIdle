import { useMemo, useState } from 'react';
import { playSfx } from '@audio/index';
import { GEAR_MAX_STARS } from '@content/balance/gear';
import type { CurrencyAmount } from '@content/currencies/types';
import { t, translate } from '@i18n/index';
import { canSacrifice, refineCost } from '@engine/forge/refine';
import type { GearInstance } from '@engine/gear/instance';
import { gearEntries, sortAndFilterGear, type GearEntry } from '@engine/gear/query';
import { mainStatValue } from '@engine/gear/stats';
import { unlockLevel } from '@engine/progression/unlocks';
import {
  selectActions,
  selectFeatureUnlocked,
  selectGearView,
  selectInventory,
  selectRoster,
  selectWallet,
} from '@state/selectors';
import { useGameStore } from '@state/store';
import { Button } from '@ui/components/Button/Button';
import { CurrencyLabel } from '@ui/components/CurrencyLabel/CurrencyLabel';
import { Panel } from '@ui/components/Frame/Panel';
import { GearCard } from '@ui/components/GearCard/GearCard';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { PieceThumb } from '@ui/components/PieceThumb/PieceThumb';
import { ScrollArea } from '@ui/components/ScrollArea/ScrollArea';
import { StarRow } from '@ui/components/StarRow/StarRow';
import { RARITY_HEX } from '@ui/styles/display-maps';
import { formatGearValue, mainStatLine, pieceArtwork, pieceName, setOf, slotLabel } from '@ui/gear/gear-view';
import { pieceTooltip } from '@ui/gear/piece-tooltip';
import { Storeroom } from './Storeroom';
import styles from './RefineBench.module.css';

const selectRefineUnlocked = selectFeatureUnlocked('gear_refine');

/**
 * The Refine bench (docs/tech/UI_DESIGN.md §5.11): two racks — the piece to raise, then the twins
 * that may feed it — and the whetstone beside them, showing the piece as it is and as it will be,
 * what it keeps, what it costs, and the press.
 */
export function RefineBench() {
  const actions = useGameStore(selectActions);
  const inventory = useGameStore(selectInventory);
  const roster = useGameStore(selectRoster);
  const view = useGameStore(selectGearView);
  const wallet = useGameStore(selectWallet);
  const unlocked = useGameStore(selectRefineUnlocked);
  const [targetId, setTarget] = useState<string | null>(null);
  const [sacrificeId, setSacrifice] = useState<string | null>(null);

  const entries = useMemo(
    () => sortAndFilterGear(gearEntries(inventory, roster), view),
    [inventory, roster, view],
  );
  const climbable = useMemo(
    () => entries.filter((entry) => !entry.piece.locked && entry.piece.stars < GEAR_MAX_STARS),
    [entries],
  );
  const target = targetId ? (inventory[targetId] ?? null) : null;
  const twins = useMemo(
    () => (target ? entries.filter((entry) => canSacrifice(target, entry.piece)) : []),
    [entries, target],
  );
  const sacrifice = sacrificeId ? (inventory[sacrificeId] ?? null) : null;

  const cost = target ? refineCost(target.stars) : null;
  const held = (currency: string): number => wallet?.[currency as 'gold'] ?? 0;
  const canPay = cost !== null && cost.amounts.every((entry) => held(entry.currency) >= entry.amount);

  const press = (): void => {
    if (!target || !sacrifice) return;
    const result = actions.refineGear(target.instanceId, sacrifice.instanceId);
    if (!result.ok) {
      playSfx('ui.error');
      actions.toast('error', 'forge.refine.tooPoor');
      return;
    }
    playSfx('reward.large');
    actions.toast('reward', 'forge.refine.done', {
      piece: pieceName(result.value.piece),
      stars: result.value.to,
    });
    setSacrifice(null);
  };

  if (!unlocked) {
    return (
      <>
        <Storeroom />
        <div className={styles.lockedBench} data-testid="forge-refine">
          <div className={styles.locked}>
            <Glyph glyph="glyph.broken_shackle" size={64} color="var(--gold-2)" />
            <p className={styles.lockedTitle} data-testid="refine-locked">
              {t('forge.locked', { level: unlockLevel('gear_refine') })}
            </p>
            <p className={styles.lockedBody}>{t('forge.refine.lockedBody')}</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Storeroom spends={cost?.amounts ?? []} />
      <div className={styles.bench} data-testid="forge-refine">
        <section className={styles.racks}>
          <header className={styles.head}>
            <span className={`num ${styles.index}`}>1</span>
            <h3 className={`display ${styles.title}`}>{t('forge.refine.piece')}</h3>
            <span className={styles.note}>{t('forge.refine.pieceNote')}</span>
          </header>
          {climbable.length === 0 ? (
            <p className={styles.hint} data-testid="refine-none">
              {t('forge.refine.none')}
            </p>
          ) : (
            <ScrollArea height="100%" className={styles.scroll}>
              <Rack
                entries={climbable}
                selected={targetId}
                onPick={(id) => {
                  setTarget(id);
                  setSacrifice(null);
                }}
              />
            </ScrollArea>
          )}

          <header className={styles.head}>
            <span className={`num ${styles.index}`}>2</span>
            <h3 className={`display ${styles.title}`}>{t('forge.refine.sacrifice')}</h3>
            {target ? (
              <span className={styles.note}>
                {t('forge.refine.chooseSacrifice', { slot: slotLabel(target.slot), stars: target.stars })}
              </span>
            ) : null}
          </header>
          {!target ? (
            <p className={styles.hint}>{t('forge.refine.choose')}</p>
          ) : twins.length === 0 ? (
            <p className={styles.hint} data-testid="refine-no-twin">
              {t('forge.refine.noSacrifice', { slot: slotLabel(target.slot), stars: target.stars })}
            </p>
          ) : (
            <ScrollArea height="100%" className={styles.scroll}>
              <Rack entries={twins} selected={sacrificeId} onPick={setSacrifice} />
            </ScrollArea>
          )}
        </section>

        <Panel
          kind="ember-tall"
          padding={16}
          className={styles.stone}
          contentClassName={styles.stoneContent}
          data-testid="refine-panel"
        >
          <h3 className={`display ${styles.title}`}>{t('forge.refine.whetstone')}</h3>
          {target && cost ? (
            <Whetstone
              target={target}
              sacrifice={sacrifice}
              cost={cost.amounts}
              held={held}
              cores={held('mat_refining_core')}
              ready={sacrifice !== null && canPay}
              onPress={press}
            />
          ) : (
            <div className={styles.rules}>
              <Glyph glyph="glyph.shooting_stars" size={56} color="var(--gold-2)" />
              <p className={styles.lead}>{t('forge.tab.refine.hint')}</p>
              <ul className={styles.ruleList}>
                <li>{t('forge.refine.rule.twin')}</li>
                <li>{t('forge.refine.rule.eaten')}</li>
                <li>{t('forge.refine.rule.keeps')}</li>
              </ul>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}

/** A rack of pieces that each pick one, in the Armoury's own order. */
function Rack({
  entries,
  selected,
  onPick,
}: {
  entries: readonly GearEntry[];
  selected: string | null;
  onPick: (id: string) => void;
}) {
  return (
    <div className={styles.grid}>
      {entries.map((entry) => {
        const set = setOf(entry.piece);
        return (
          <GearCard
            key={entry.piece.instanceId}
            rarity={entry.piece.rarity}
            stars={entry.piece.stars}
            level={entry.piece.level}
            slot={entry.piece.slot}
            {...pieceArtwork(entry.piece)}
            {...pieceTooltip(entry.piece)}
            mainStat={mainStatLine(entry.piece)}
            setName={set ? translate(set.name) : entry.piece.setId}
            size={128}
            selected={selected === entry.piece.instanceId}
            locked={entry.piece.locked}
            onClick={() => {
              playSfx('ui.tab');
              onPick(entry.piece.instanceId);
            }}
          />
        );
      })}
    </div>
  );
}

/** The piece as it is and as it will be, what it keeps, its twin, the price and the press. */
function Whetstone({
  target,
  sacrifice,
  cost,
  held,
  cores,
  ready,
  onPress,
}: {
  target: GearInstance;
  sacrifice: GearInstance | null;
  cost: readonly CurrencyAmount[];
  held: (currency: string) => number;
  cores: number;
  ready: boolean;
  onPress: () => void;
}) {
  const set = setOf(target);
  const art = pieceArtwork(target);
  const color = RARITY_HEX[target.rarity];
  const twinArt = sacrifice ? pieceArtwork(sacrifice) : null;
  return (
    <div className={styles.whetstone}>
      <strong className={`display ${styles.name}`} style={{ color }}>
        {pieceName(target)}
      </strong>
      <div className={styles.climb}>
        <div className={styles.side}>
          <GearCard
            rarity={target.rarity}
            stars={target.stars}
            level={target.level}
            slot={target.slot}
            {...art}
            mainStat={mainStatLine(target)}
            setName={set ? translate(set.name) : target.setId}
            size={128}
          />
        </div>
        <span className={`display ${styles.arrow}`} aria-hidden="true">
          →
        </span>
        <div className={`${styles.side} ${styles.after}`}>
          <GearCard
            rarity={target.rarity}
            stars={target.stars + 1}
            level={target.level}
            slot={target.slot}
            {...art}
            mainStat={mainStatLine({ ...target, stars: target.stars + 1 })}
            setName={set ? translate(set.name) : target.setId}
            size={128}
          />
        </div>
      </div>
      <div className={styles.stars}>
        <StarRow stars={target.stars + 1} max={6} size={22} tone="rarity" tint={color} />
        <span className={`num ${styles.climbLine}`} data-testid="refine-climb">
          {t('forge.refine.result', { from: target.stars, to: target.stars + 1 })}
        </span>
      </div>
      <p className={`num ${styles.main}`} data-testid="refine-main">
        {t('forge.refine.mainStat', {
          from: formatGearValue(target.mainStat, mainStatValue(target.mainStat, target.stars, target.level)),
          to: formatGearValue(
            target.mainStat,
            mainStatValue(target.mainStat, target.stars + 1, target.level),
          ),
        })}
      </p>
      <p className={styles.keeps}>{t('forge.refine.keeps')}</p>

      <div className={styles.twin}>
        {sacrifice && twinArt ? (
          <>
            <PieceThumb
              art={twinArt.art}
              emblem={twinArt.emblem}
              tint={RARITY_HEX[sacrifice.rarity]}
              size={48}
            />
            <span className={styles.twinText}>
              <span className={styles.twinLabel}>{t('forge.refine.feeds')}</span>
              <strong style={{ color: RARITY_HEX[sacrifice.rarity] }}>{pieceName(sacrifice)}</strong>
            </span>
          </>
        ) : (
          <span className={styles.twinLabel}>{t('forge.refine.pickTwin')}</span>
        )}
      </div>

      <div className={styles.press}>
        <ul className={`num ${styles.cost}`} data-testid="refine-cost">
          {cost.map((entry) => (
            <li key={entry.currency} className={held(entry.currency) < entry.amount ? styles.short : ''}>
              <CurrencyLabel currency={entry.currency} amount={entry.amount} size={24} />
            </li>
          ))}
        </ul>
        <p className={`num ${styles.held}`}>{t('forge.refine.coresHeld', { count: cores })}</p>
        <Button
          variant="primary"
          size="lg"
          disabled={!ready}
          onClick={onPress}
          data-testid="refine-press"
          icon={<Glyph glyph="glyph.shooting_stars" size={26} color="var(--gold-3)" />}
        >
          {t('forge.refine.press')}
        </Button>
      </div>
    </div>
  );
}
