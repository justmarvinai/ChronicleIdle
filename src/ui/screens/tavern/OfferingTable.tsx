import { motion } from 'motion/react';
import { playSfx } from '@audio/index';
import type { CurrencyId } from '@content/currencies/types';
import type { ChampionDef } from '@content/champions/types';
import { content } from '@content/registry';
import type { ChampionInstance, Roster } from '@engine/champions/instance';
import type { Offering } from '@engine/progression/tavern-level';
import { t, translate } from '@i18n/index';
import { championAvatar } from '@ui/champions/art';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { Slot } from '@ui/components/Slot/Slot';
import { StarRow } from '@ui/components/StarRow/StarRow';
import { brewName } from './tavern-view';
import styles from './OfferingTable.module.css';

export interface OfferingTableProps {
  roster: Roster;
  /** 'flank' stacks the seats in one column, for the two rails beside the champion. */
  layout?: 'grid' | 'flank';
  /** Index of the first seat this table renders, so a split table keeps its numbering. */
  offset?: number;
  offering: Offering;
  /** Seats at the table: six on the Level track, the rank's requirement on the Rank track. */
  seats: number;
  onAdd: () => void;
  onRemove: (instanceId: string) => void;
  /** Brews are poured on the Level track only. */
  brews?: {
    order: readonly CurrencyId[];
    held: Readonly<Record<string, number>>;
    onChange: (currency: CurrencyId, amount: number) => void;
  };
}

/** The six seats around the champion, plus the brew row beneath them (`UI_DESIGN.md` §5.5). */
export function OfferingTable({
  roster,
  offering,
  seats,
  onAdd,
  onRemove,
  brews,
  layout = 'grid',
  offset = 0,
}: OfferingTableProps) {
  const seated: (ChampionInstance | null)[] = Array.from(
    { length: seats },
    (_, index) => roster[offering.food[offset + index] ?? ''] ?? null,
  );

  return (
    <div className={styles.table} data-testid="offering-table">
      <div className={[styles.seats, layout === 'flank' ? styles.flank : ''].join(' ')}>
        {seated.map((instance, index) => {
          const def: ChampionDef | undefined = instance ? content.championById(instance.defId) : undefined;
          const art = def ? championAvatar(def, 128) : null;
          const key = instance?.instanceId ?? `empty-${index}`;
          return (
            <motion.div
              key={key}
              layout
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 320, damping: 24 }}
            >
              <Slot
                size="sm"
                emptyGlyph="glyph.spell_book"
                selected={Boolean(instance)}
                label={
                  instance && def
                    ? t('tavern.offering.remove', { name: translate(def.name) })
                    : t('tavern.offering.add')
                }
                data-testid={instance ? `seat-${instance.instanceId}` : `seat-empty-${offset + index}`}
                onClick={() => {
                  if (instance) {
                    playSfx('ui.cancel');
                    onRemove(instance.instanceId);
                  } else {
                    onAdd();
                  }
                }}
              >
                {instance && def && art ? (
                  <span className={styles.seated}>
                    <span
                      className={styles.portrait}
                      style={{ backgroundImage: `url("${art.url}")` }}
                      aria-hidden="true"
                    >
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
                    <span className={styles.seatFoot}>
                      <StarRow stars={instance.stars} max={instance.stars} size={11} />
                      <span className={`num ${styles.seatLevel}`}>{instance.level}</span>
                    </span>
                  </span>
                ) : null}
              </Slot>
            </motion.div>
          );
        })}
      </div>

      {brews ? (
        <div className={styles.brews} data-testid="brew-row">
          <span className={styles.brewsLabel}>{t('tavern.brews')}</span>
          {brews.order.map((currency) => {
            const held = brews.held[currency] ?? 0;
            const poured = offering.brews[currency] ?? 0;
            return (
              <div key={currency} className={styles.brew} data-testid={`brew-${currency}`}>
                <Glyph glyph="glyph.health_potion" size={26} color="var(--gold-3)" />
                <span className={styles.brewName}>{brewName(currency)}</span>
                <div className={styles.stepper}>
                  <button
                    type="button"
                    className={styles.step}
                    aria-label={`${brewName(currency)} −1`}
                    data-testid={`brew-minus-${currency}`}
                    disabled={poured <= 0}
                    onClick={() => (playSfx('ui.cancel'), brews.onChange(currency, poured - 1))}
                  >
                    −
                  </button>
                  <span className={`num ${styles.poured}`} data-testid={`brew-count-${currency}`}>
                    {poured}
                  </span>
                  <button
                    type="button"
                    className={styles.step}
                    aria-label={`${brewName(currency)} +1`}
                    data-testid={`brew-plus-${currency}`}
                    disabled={poured >= held}
                    onClick={() => (playSfx('ui.tab'), brews.onChange(currency, poured + 1))}
                  >
                    +
                  </button>
                </div>
                <span className={`num ${styles.held}`}>
                  {t('tavern.brew.have', { count: held - poured })}
                </span>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
