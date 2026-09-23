import { piecePower } from '@engine/gear/stats';
import type { GearInstance } from '@engine/gear/instance';
import { t, translate, type I18nKey } from '@i18n/index';
import { PieceThumb } from '@ui/components/PieceThumb/PieceThumb';
import { SetEmblem } from '@ui/components/SetEmblem/SetEmblem';
import { StarRow } from '@ui/components/StarRow/StarRow';
import { RARITY_COLOR, RARITY_HEX } from '@ui/styles/display-maps';
import { mainStatLine, pieceArtwork, pieceName, setOf, slotLabel, subStatLine } from './gear-view';
import styles from './GearTooltip.module.css';

/** The piece's picture at the head of the tooltip, in CSS pixels. */
const THUMB = 58;
/** The set's emblem leading its bonus line. */
const SET_EMBLEM = 22;
/** Wide enough for "Chestplate · Legendary · +16" and a two-line set bonus. */
export const GEAR_TOOLTIP_WIDTH = 340;

export interface GearTooltipProps {
  piece: GearInstance;
  /**
   * Who wears it, for a list that mixes worn and spare pieces; `null` says it is on the racks.
   * Left out where the answer is already on screen — a champion's own slots, say.
   */
  wearer?: string | null;
}

/**
 * What a piece is, on hover (the owner's request): everything the Armoury's bench would say about
 * it, without leaving the list it is in — name, rarity, level and stars, its power, its main stat,
 * every substat with the rolls behind it, and its set with what a complete group gives.
 */
export function GearTooltip({ piece, wearer }: GearTooltipProps) {
  const set = setOf(piece);
  const { art, emblem } = pieceArtwork(piece);
  return (
    <div className={styles.tip} data-testid="gear-tooltip">
      <header className={styles.head}>
        <PieceThumb art={art} emblem={emblem} tint={RARITY_HEX[piece.rarity]} size={THUMB} />
        <div className={styles.headText}>
          <strong className={`display ${styles.name}`} style={{ color: RARITY_COLOR[piece.rarity] }}>
            {pieceName(piece)}
          </strong>
          <span className={styles.meta}>
            {slotLabel(piece.slot)} · {t(`rarity.${piece.rarity}` as I18nKey)} ·{' '}
            <span className="num">{t('gear.level', { level: piece.level })}</span>
          </span>
          <StarRow stars={piece.stars} max={6} size={13} tone="rarity" tint={RARITY_HEX[piece.rarity]} />
        </div>
      </header>

      <div className={styles.power}>
        <span className={styles.label}>{t('armoury.detail.power')}</span>
        <span className="num">{piecePower(piece).toLocaleString('en-US')}</span>
      </div>

      <div className={styles.section}>
        <span className={styles.label}>{t('armoury.detail.main')}</span>
        <span className={`num ${styles.main}`}>{mainStatLine(piece)}</span>
      </div>

      <div className={styles.section}>
        <span className={styles.label}>{t('armoury.detail.subs')}</span>
        {piece.subs.length === 0 ? (
          <span className={styles.none}>{t('armoury.detail.noSubs')}</span>
        ) : (
          <ul className={styles.subs}>
            {piece.subs.map((sub) => (
              <li key={sub.stat}>
                <span className="num">{subStatLine(sub)}</span>
                <span className={styles.rolls}>
                  {sub.rolls > 1 ? t('gear.rolls', { count: sub.rolls }) : t('gear.roll')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {set ? (
        <div className={styles.set}>
          <div className={styles.setHead}>
            <SetEmblem emblem={set.emblem} size={SET_EMBLEM} />
            <span className={`display ${styles.setName}`}>{translate(set.name)}</span>
            <span className={styles.setSize}>{t('armoury.set.pieces', { pieces: set.pieces })}</span>
          </div>
          <p className={styles.setBonus}>{translate(set.description)}</p>
        </div>
      ) : null}

      {wearer === undefined ? null : (
        <p className={styles.wearer}>
          {wearer ? t('armoury.detail.wornBy', { name: wearer }) : t('armoury.detail.spare')}
        </p>
      )}
    </div>
  );
}
