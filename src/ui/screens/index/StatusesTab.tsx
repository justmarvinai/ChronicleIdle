import { STATUSES } from '@content/statuses/index';
import { t, translate } from '@i18n/index';
import { Panel } from '@ui/components/Frame/Panel';
import { ScrollArea } from '@ui/components/ScrollArea/ScrollArea';
import { StatusIcon } from '@ui/components/StatusIcon/StatusIcon';
import styles from './IndexScreen.module.css';

/** Every status a fight can carry (BATTLE.md §5): buffs first, then the debuffs. */
export function StatusesTab() {
  const buffs = STATUSES.filter((s) => s.kind === 'buff');
  const debuffs = STATUSES.filter((s) => s.kind === 'debuff');
  return (
    <ScrollArea height={880} className={styles.scroller}>
      <div data-testid="index-statuses">
        {(
          [
            ['index.status.buffs', buffs],
            ['index.status.debuffs', debuffs],
          ] as const
        ).map(([heading, list]) => (
          <section key={heading}>
            <h3 className={`display ${styles.section}`}>{t(heading)}</h3>
            <div className={styles.statusGrid}>
              {list.map((status) => (
                <Panel
                  key={status.id}
                  kind="thin"
                  padding={12}
                  className={styles.statusCard}
                  contentClassName={styles.statusBody}
                  data-testid={`index-status-${status.id}`}
                >
                  <StatusIcon
                    glyph={status.glyph}
                    kind={status.kind}
                    label={translate(status.name)}
                    size={34}
                  />
                  <div>
                    <div className={`display ${styles.statusName}`}>{translate(status.name)}</div>
                    <p className={styles.statusText}>
                      {/* A status's text is written for one cast ("by {value} %"); in a glossary
                          there is no cast, so the amount stands as the placeholder it is. */}
                      {translate(status.description, { value: t('index.status.amount') })}
                    </p>
                  </div>
                </Panel>
              ))}
            </div>
          </section>
        ))}
      </div>
    </ScrollArea>
  );
}
