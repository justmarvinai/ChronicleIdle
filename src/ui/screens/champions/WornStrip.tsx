import { GEAR_SLOTS, type GearSlot } from '@content/champions/types';
import type { GearInstance } from '@engine/gear/instance';
import { t, translate } from '@i18n/index';
import { playSfx } from '@audio/index';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { PieceThumb } from '@ui/components/PieceThumb/PieceThumb';
import { SetEmblem } from '@ui/components/SetEmblem/SetEmblem';
import { Tooltip } from '@ui/components/Tooltip/Tooltip';
import { pieceArtwork, pieceName, setLines, slotLabel } from '@ui/gear/gear-view';
import { GEAR_TOOLTIP_WIDTH, GearTooltip } from '@ui/gear/GearTooltip';
import { RARITY_HEX, SLOT_GLYPH } from '@ui/styles/display-maps';
import styles from './WornStrip.module.css';

/** A worn piece's side on the strip, in stage pixels: six of them fill the panel's width. */
const THUMB = 58;
/** The emblem beside a set's name. */
const SET_EMBLEM = 24;

export interface WornStripProps {
  worn: readonly GearInstance[];
  /** Opens the Gear tab, where the slots are changed. */
  onOpen: () => void;
}

/**
 * What the champion wears, under their stats on the Info tab (docs/tech/UI_DESIGN.md §5.4): the
 * six slots in order — each piece's painting with its set's emblem and its level, an empty slot's
 * mark otherwise — and the sets the build completes. A piece says everything on hover; any slot
 * opens the Gear tab.
 */
export function WornStrip({ worn, onOpen }: WornStripProps) {
  const bySlot = new Map<GearSlot, GearInstance>(worn.map((piece) => [piece.slot, piece]));
  const complete = setLines(worn).filter(({ group }) => group.groups > 0);
  const open = (): void => {
    playSfx('ui.tab');
    onOpen();
  };
  return (
    <section className={styles.worn} aria-label={t('champions.worn')} data-testid="info-worn">
      <h3 className={`display ${styles.title}`}>{t('champions.worn')}</h3>
      <div className={styles.slots}>
        {GEAR_SLOTS.map((slot) => {
          const piece = bySlot.get(slot);
          if (!piece)
            return (
              <button
                key={slot}
                type="button"
                className={`${styles.slot} ${styles.empty}`}
                aria-label={t('champions.gear.slotEmpty', { slot: slotLabel(slot) })}
                data-testid={`info-worn-${slot}`}
                onMouseEnter={() => playSfx('ui.hover')}
                onClick={open}
              >
                <Glyph glyph={SLOT_GLYPH[slot]} size={26} color="var(--stone-3)" />
              </button>
            );
          const { art, emblem } = pieceArtwork(piece);
          return (
            <Tooltip key={slot} content={<GearTooltip piece={piece} />} maxWidth={GEAR_TOOLTIP_WIDTH}>
              <button
                type="button"
                className={styles.slot}
                aria-label={pieceName(piece)}
                data-testid={`info-worn-${slot}`}
                onMouseEnter={() => playSfx('ui.hover')}
                onClick={open}
              >
                <PieceThumb art={art} emblem={emblem} tint={RARITY_HEX[piece.rarity]} size={THUMB} />
                <span
                  className={`num ${styles.level}`}
                  style={{ ['--rarity' as string]: RARITY_HEX[piece.rarity] }}
                >
                  {t('gear.level', { level: piece.level })}
                </span>
              </button>
            </Tooltip>
          );
        })}
      </div>
      {complete.length > 0 ? (
        <ul className={styles.sets} data-testid="info-worn-sets">
          {complete.map(({ group }) => (
            <li key={group.set.id} className={styles.set}>
              <SetEmblem emblem={group.set.emblem} size={SET_EMBLEM} />
              <span className={`display ${styles.setName}`}>{translate(group.set.name)}</span>
              {group.groups > 1 ? (
                <span className={`num ${styles.setCount}`}>
                  {t('champions.worn.times', { count: group.groups })}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.none}>{t('champions.gear.sets.none')}</p>
      )}
    </section>
  );
}
