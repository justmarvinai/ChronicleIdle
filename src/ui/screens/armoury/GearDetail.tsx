import { useState } from 'react';
import { playSfx } from '@audio/index';
import { GEAR_MAX_LEVEL } from '@content/balance/gear';
import type { ChampionInstance } from '@engine/champions/instance';
import type { GearInstance } from '@engine/gear/instance';
import { piecePower } from '@engine/gear/stats';
import { t, translate } from '@i18n/index';
import { levelCostTotal } from '@state/gear';
import { selectActions, selectWallet } from '@state/selectors';
import { useGameStore } from '@state/store';
import { AssetImage } from '@ui/components/AssetImage/AssetImage';
import { Button } from '@ui/components/Button/Button';
import { Divider } from '@ui/components/Divider/Divider';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { Panel } from '@ui/components/Frame/Panel';
import { ScrollArea } from '@ui/components/ScrollArea/ScrollArea';
import { SetEmblem } from '@ui/components/SetEmblem/SetEmblem';
import { StarRow } from '@ui/components/StarRow/StarRow';
import { RARITY_COLOR, RARITY_HEX, SLOT_GLYPH } from '@ui/styles/display-maps';
import {
  atMaxLevel,
  mainStatLine,
  nextRollLevel,
  pieceArtwork,
  pieceName,
  setOf,
  slotLabel,
  subStatLine,
} from '@ui/gear/gear-view';
import styles from './GearDetail.module.css';

/** The levels an upgrade press buys; "+4" is the doc's running-total button (GEAR.md §3). */
const STEPS = [1, 4] as const;
/** The emblem on the painting's corner, and the one leading the set's section, in CSS pixels. */
const ART_EMBLEM = 30;
const SET_EMBLEM = 34;

export interface GearDetailProps {
  piece: GearInstance;
  wearer: ChampionInstance | null;
  wearerName: string | null;
  onUnequip: () => void;
  onOpenWearer: () => void;
}

/** The bench: what the piece carries, what a level costs, and the two buttons that change it. */
export function GearDetail({ piece, wearer, wearerName, onUnequip, onOpenWearer }: GearDetailProps) {
  const actions = useGameStore(selectActions);
  const wallet = useGameStore(selectWallet);
  const [error, setError] = useState<string | null>(null);
  const set = setOf(piece);
  const { art, emblem } = pieceArtwork(piece);
  const gold = wallet?.gold ?? 0;
  const maxed = atMaxLevel(piece);
  const nextRoll = nextRollLevel(piece);

  const buy = (levels: number): void => {
    const result = actions.levelGear(piece.instanceId, levels);
    if (!result.ok) {
      playSfx('ui.error');
      setError(t('armoury.upgrade.tooPoor'));
      return;
    }
    setError(null);
    playSfx(result.value.rolls.length > 0 ? 'reward.large' : 'ui.confirm');
  };

  return (
    <aside className={styles.panel} data-testid="gear-detail">
      <Panel kind="stone" padding={20} className={styles.body} contentClassName={styles.bodyContent}>
        <ScrollArea height="100%">
          <header className={styles.head}>
            <div
              className={styles.art}
              style={{ ['--rarity' as string]: RARITY_HEX[piece.rarity] }}
              aria-hidden="true"
            >
              {art ? <AssetImage asset={art} size={256} className={styles.icon} /> : null}
              {emblem ? (
                <SetEmblem emblem={emblem} size={ART_EMBLEM} kind="plate" className={styles.artEmblem} />
              ) : null}
            </div>
            <div className={styles.headText}>
              <h2 className={`display ${styles.name}`} data-testid="gear-detail-name">
                {pieceName(piece)}
              </h2>
              <div className={styles.meta}>
                <Glyph glyph={SLOT_GLYPH[piece.slot]} size={20} color="var(--text-2)" />
                <span>{slotLabel(piece.slot)}</span>
                <span style={{ color: RARITY_COLOR[piece.rarity] }}>{t(`rarity.${piece.rarity}`)}</span>
                <span className={`num ${styles.level}`} data-testid="gear-detail-level">
                  {t('gear.level', { level: piece.level })}
                </span>
              </div>
              <StarRow stars={piece.stars} max={6} size={18} tone="rarity" tint={RARITY_HEX[piece.rarity]} />
            </div>
          </header>

          <div className={styles.powerRow}>
            <span className={`display ${styles.powerLabel}`}>{t('armoury.detail.power')}</span>
            <span className={`num ${styles.power}`} data-testid="gear-detail-power">
              {piecePower(piece).toLocaleString('en-US')}
            </span>
          </div>

          <Divider kind="deco" index={2} width="100%" />

          <h3 className={`display ${styles.section}`}>{t('armoury.detail.main')}</h3>
          <p className={`num ${styles.main}`} data-testid="gear-detail-main">
            {mainStatLine(piece)}
          </p>

          <h3 className={`display ${styles.section}`}>{t('armoury.detail.subs')}</h3>
          {piece.subs.length === 0 ? (
            <p className={styles.hint}>{t('armoury.detail.noSubs')}</p>
          ) : (
            <ul className={styles.subs} data-testid="gear-detail-subs">
              {piece.subs.map((sub) => (
                <li key={sub.stat} className={styles.sub}>
                  <span className={`num ${styles.subValue}`}>{subStatLine(sub)}</span>
                  <span className={styles.rolls}>
                    {sub.rolls > 1 ? t('gear.rolls', { count: sub.rolls }) : t('gear.roll')}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {set ? (
            <>
              <h3 className={`display ${styles.section}`}>{t('armoury.detail.set')}</h3>
              <p className={styles.setName} data-testid="gear-detail-set">
                <SetEmblem emblem={set.emblem} size={SET_EMBLEM} />
                <span>{translate(set.name)}</span>
              </p>
              <p className={styles.hint}>{translate(set.description)}</p>
            </>
          ) : null}

          <Divider kind="deco" index={4} width="100%" />

          <p className={styles.meta} data-testid="gear-detail-wearer">
            {wearer && wearerName ? (
              <button type="button" className={styles.wearer} onClick={onOpenWearer}>
                {t('armoury.detail.wornBy', { name: wearerName })}
              </button>
            ) : (
              t('armoury.detail.spare')
            )}
          </p>
          <p className={styles.meta}>
            {t('armoury.detail.acquired', { date: new Date(piece.acquiredAt).toLocaleDateString() })}
          </p>
          <p className={styles.hint}>
            {maxed
              ? t('armoury.detail.maxLevel')
              : nextRoll
                ? t('armoury.detail.nextRoll', { level: nextRoll })
                : ''}
          </p>
        </ScrollArea>
      </Panel>

      <div className={styles.actions}>
        {STEPS.map((levels) => {
          const cost = levelCostTotal(piece, levels);
          const to = Math.min(GEAR_MAX_LEVEL, piece.level + levels);
          return (
            <Button
              key={levels}
              variant={levels === 1 ? 'secondary' : 'primary'}
              size="md"
              disabled={maxed || cost === 0 || cost > gold}
              onClick={() => buy(levels)}
              data-testid={`gear-upgrade-${levels}`}
            >
              <span className={styles.buy}>
                <span className="display">{t('armoury.upgrade.by', { levels: to - piece.level })}</span>
                <span className={`num ${styles.cost}`}>
                  {t('armoury.upgrade.cost', { gold: cost.toLocaleString('en-US') })}
                </span>
              </span>
            </Button>
          );
        })}
      </div>
      {error ? (
        <p className={styles.error} role="alert" data-testid="gear-upgrade-error">
          {error}
        </p>
      ) : null}
      <div className={styles.actions}>
        <Button
          variant={piece.locked ? 'primary' : 'secondary'}
          size="sm"
          icon={<Glyph glyph="glyph.broken_shackle" size={20} color="currentColor" />}
          aria-pressed={piece.locked}
          onClick={() => {
            playSfx(piece.locked ? 'ui.cancel' : 'ui.confirm');
            actions.setGearLocked(piece.instanceId, !piece.locked);
          }}
          data-testid="gear-lock"
        >
          {piece.locked ? t('armoury.unlock') : t('armoury.lock')}
        </Button>
        {wearer ? (
          <Button variant="secondary" size="sm" onClick={onUnequip} data-testid="gear-unequip">
            {t('armoury.unequip')}
          </Button>
        ) : null}
      </div>
      <p className={styles.hint}>{t('armoury.locked.hint')}</p>
    </aside>
  );
}
