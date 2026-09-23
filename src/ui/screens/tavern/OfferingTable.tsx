import type { CSSProperties } from 'react';
import { motion } from 'motion/react';
import { playSfx } from '@audio/index';
import type { ChampionDef } from '@content/champions/types';
import { content } from '@content/registry';
import type { ChampionInstance, Roster } from '@engine/champions/instance';
import { foodXp, type Offering } from '@engine/progression/tavern-level';
import { t, translate } from '@i18n/index';
import { championAvatar } from '@ui/champions/art';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { Slot } from '@ui/components/Slot/Slot';
import { StarRow } from '@ui/components/StarRow/StarRow';
import { RARITY_HEX } from '@ui/styles/display-maps';
import styles from './OfferingTable.module.css';

export interface OfferingTableProps {
  roster: Roster;
  offering: Offering;
  /** Seats in this column: the table is split in two either side of the champion. */
  seats: number;
  /** Index of the first seat this column renders, so a split table keeps its numbering. */
  offset?: number;
  /** A level's seats show what each guest is worth; a rank's show the star tier it asks for. */
  mode: 'level' | 'rank';
  /** The star tier a rank-up's food must be. */
  foodStars?: number | undefined;
  /** Nothing more can be seated: the champion stands at its cap on the Level track. */
  closed?: boolean;
  onAdd: () => void;
  onRemove: (instanceId: string) => void;
}

/**
 * One column of the seats around the champion (docs/tech/UI_DESIGN.md §5.5). An empty seat opens
 * the companion picker; a seated guest shows its face, stars and level — and, on the Level track,
 * the XP it brings — and a click takes it back.
 */
export function OfferingTable({
  roster,
  offering,
  seats,
  offset = 0,
  mode,
  foodStars,
  closed = false,
  onAdd,
  onRemove,
}: OfferingTableProps) {
  const seated: (ChampionInstance | null)[] = Array.from(
    { length: seats },
    (_, index) => roster[offering.food[offset + index] ?? ''] ?? null,
  );

  return (
    <div className={styles.column} data-testid="offering-table">
      {seated.map((instance, index) => {
        const def: ChampionDef | undefined = instance ? content.championById(instance.defId) : undefined;
        const key = instance?.instanceId ?? `empty-${offset + index}`;
        return (
          <motion.div
            key={key}
            layout
            className={styles.cell}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 320, damping: 24 }}
          >
            {instance && def ? (
              <SeatedGuest
                instance={instance}
                def={def}
                mode={mode}
                onRemove={() => {
                  playSfx('ui.cancel');
                  onRemove(instance.instanceId);
                }}
              />
            ) : (
              <Slot
                size="md"
                className={closed ? styles.closed : styles.empty}
                label={
                  mode === 'rank' && foodStars
                    ? t('tavern.offering.addRank', { stars: foodStars })
                    : t('tavern.offering.add')
                }
                data-testid={`seat-empty-${offset + index}`}
                {...(closed ? {} : { onClick: onAdd })}
              >
                <span className={styles.vacant}>
                  <Glyph glyph="glyph.cloaked_figure" size={52} color="rgba(243, 236, 220, 0.2)" />
                  {mode === 'rank' && foodStars ? (
                    <span className={`num ${styles.needs}`}>
                      {t('tavern.seat.needs', { stars: foodStars })}
                    </span>
                  ) : closed ? null : (
                    <span className={styles.plus} aria-hidden="true">
                      +
                    </span>
                  )}
                </span>
              </Slot>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

function SeatedGuest({
  instance,
  def,
  mode,
  onRemove,
}: {
  instance: ChampionInstance;
  def: ChampionDef;
  mode: 'level' | 'rank';
  onRemove: () => void;
}) {
  const art = championAvatar(def, 128);
  const name = translate(def.name);
  return (
    <Slot
      size="md"
      selected
      label={t('tavern.offering.remove', { name })}
      data-testid={`seat-${instance.instanceId}`}
      onClick={onRemove}
      style={{ '--rarity': RARITY_HEX[def.rarity] } as CSSProperties}
    >
      <span className={styles.seated}>
        <span className={styles.portrait} style={{ backgroundImage: `url("${art.url}")` }} aria-hidden="true">
          {art.tint ? (
            <span
              className={styles.tint}
              style={{
                backgroundColor: art.tint,
                WebkitMaskImage: `url("${art.url}")`,
                maskImage: `url("${art.url}")`,
              }}
            />
          ) : null}
        </span>
        {mode === 'level' ? (
          <span className={`num ${styles.worth}`}>
            {t('tavern.seat.worth', { xp: foodXp(def, instance).toLocaleString('en-US') })}
          </span>
        ) : null}
        <span className={styles.foot}>
          <StarRow
            stars={instance.stars}
            max={instance.stars}
            size={12}
            tone="rarity"
            tint={RARITY_HEX[def.rarity]}
          />
          <span className={`num ${styles.level}`}>{instance.level}</span>
        </span>
        <span className={styles.remove} aria-hidden="true">
          ×
        </span>
      </span>
    </Slot>
  );
}
