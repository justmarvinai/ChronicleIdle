import { useEffect, useMemo, useRef } from 'react';
import type { BattleEvent, BattleView } from '@engine/battle/index';
import { t } from '@i18n/index';
import { Panel } from '@ui/components/Frame/Panel';
import { describeEvents } from './battle-log';
import styles from './BattleScreen.module.css';

/** Info panel: the scrolling battle log built from played events. */
export function InfoPanel({ log, view }: { log: readonly BattleEvent[]; view: BattleView | null }) {
  const lines = useMemo(() => describeEvents(log, view).slice(-120), [log, view]);
  const list = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const node = list.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [lines.length]);
  return (
    <Panel kind="ember-tall" padding={16} className={styles.info} data-testid="battle-info">
      <h2 className={`display ${styles.infoTitle}`}>{t('battle.log')}</h2>
      <ol ref={list} className={styles.logList} data-testid="battle-log">
        {lines.length === 0 ? <li className={styles.logEmpty}>{t('battle.logEmpty')}</li> : null}
        {lines.map((line, i) => (
          <li
            key={`${line.key}-${i}`}
            className={[styles.logLine, styles[`tone_${line.tone}`] ?? ''].join(' ')}
          >
            {line.text}
          </li>
        ))}
      </ol>
      <p className={styles.hotkeys}>{t('battle.hotkeys')}</p>
    </Panel>
  );
}
