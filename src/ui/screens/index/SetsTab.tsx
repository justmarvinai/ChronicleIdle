import { imageUrl } from '@assets/manifest';
import { content } from '@content/registry';
import { t, translate } from '@i18n/index';
import { Panel } from '@ui/components/Frame/Panel';
import { ScrollArea } from '@ui/components/ScrollArea/ScrollArea';
import styles from './IndexScreen.module.css';

/**
 * The fourteen gear sets (GEAR.md §5): the crest a piece wears, how many it takes to complete one,
 * what it gives the wearer, and which settlements favour it when a piece drops.
 */
export function SetsTab() {
  return (
    <ScrollArea height={880} className={styles.scroller}>
      <div className={styles.setGrid} data-testid="index-sets">
        {content.gearSets.map((set) => (
          <Panel
            key={set.id}
            kind="thin"
            padding={16}
            className={styles.setCard}
            contentClassName={styles.setBody}
            data-testid={`index-set-${set.id}`}
          >
            <div className={styles.setHead}>
              <span
                className={styles.crest}
                style={{ backgroundImage: `url("${imageUrl(set.icon, 'full')}")` }}
                aria-hidden="true"
              />
              <div>
                <div className={`display ${styles.setName}`}>{translate(set.name)}</div>
                <div className={`num ${styles.setPieces}`}>
                  {t('index.set.pieces', { pieces: set.pieces })}
                </div>
              </div>
            </div>
            {/* The set's own description is what its passives do, written for a player; printing
                both said the same sentence twice, and three times for a set with two passives. */}
            <p className={styles.setBonus}>{translate(set.description)}</p>
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
        ))}
      </div>
    </ScrollArea>
  );
}
