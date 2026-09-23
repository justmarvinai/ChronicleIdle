import { GEAR_SLOTS } from '@content/champions/types';
import { content } from '@content/registry';
import { t, translate } from '@i18n/index';
import { Panel } from '@ui/components/Frame/Panel';
import { PieceThumb } from '@ui/components/PieceThumb/PieceThumb';
import { ScrollArea } from '@ui/components/ScrollArea/ScrollArea';
import { SetEmblem } from '@ui/components/SetEmblem/SetEmblem';
import { Tooltip } from '@ui/components/Tooltip/Tooltip';
import { slotLabel } from '@ui/gear/gear-view';
import styles from './IndexScreen.module.css';

/** The set's emblem plate at the head of its entry, in CSS pixels. */
const EMBLEM = 92;
/** Each of the six pieces in the row beneath: six of these and their gaps fill a card's width. */
const PIECE = 78;

/**
 * The fourteen gear sets (GEAR.md §5): the emblem that names the set wherever one of its pieces
 * turns up, the six pieces themselves, how many it takes to complete a group, what that gives the
 * wearer, and which settlements favour the set when a piece drops.
 */
export function SetsTab() {
  return (
    <ScrollArea height={880} className={styles.scroller}>
      <div className={styles.setGrid} data-testid="index-sets">
        {content.gearSets.map((set) => {
          const name = translate(set.name);
          return (
            <Panel
              key={set.id}
              kind="thin"
              padding={16}
              className={styles.setCard}
              contentClassName={styles.setBody}
              data-testid={`index-set-${set.id}`}
            >
              <div className={styles.setHead}>
                <SetEmblem emblem={set.emblem} size={EMBLEM} kind="plate" />
                <div className={styles.setTitle}>
                  <div className={`display ${styles.setName}`}>{name}</div>
                  <div className={`num ${styles.setPieces}`}>
                    {t('index.set.pieces', { pieces: set.pieces })}
                  </div>
                  {/* The set's own description is what its passives do, written for a player;
                      printing both said the same sentence twice, and three times for a set with
                      two passives. */}
                  <p className={styles.setBonus}>{translate(set.description)}</p>
                </div>
              </div>
              <ul className={styles.setPieceRow} aria-label={t('index.set.piecesOf', { set: name })}>
                {GEAR_SLOTS.map((slot) => {
                  const piece = t('gear.piece', { set: name, slot: slotLabel(slot) });
                  return (
                    <li key={slot} data-testid={`index-set-piece-${slot}`}>
                      <Tooltip content={piece} delayMs={120}>
                        <span className={styles.setPiece} role="img" aria-label={piece}>
                          <PieceThumb art={set.art[slot]} tint="var(--gold-2)" size={PIECE} />
                        </span>
                      </Tooltip>
                    </li>
                  );
                })}
              </ul>
              <p className={styles.setHomes}>
                {t('index.set.homes', {
                  homes: set.homes
                    .map((index) => {
                      const settlement = content.settlementByIndex(index);
                      return settlement ? translate(settlement.name) : String(index);
                    })
                    .join(', '),
                })}
              </p>
            </Panel>
          );
        })}
      </div>
    </ScrollArea>
  );
}
