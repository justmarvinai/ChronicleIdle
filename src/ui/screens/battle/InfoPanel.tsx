import { useEffect, useMemo, useRef } from 'react';
import { STATUS_BY_ID } from '@content/statuses/index';
import type { GlyphKey } from '@assets/manifest.generated';
import type { BattleEvent, BattleView } from '@engine/battle/index';
import { t, templateParts } from '@i18n/index';
import { Panel } from '@ui/components/Frame/Panel';
import { Glyph } from '@ui/components/Glyph/Glyph';
import {
  describeEvents,
  lineText,
  type LogKind,
  type LogLine,
  type LogTone,
  type LogValue,
} from './battle-log';
import styles from './BattleScreen.module.css';

/**
 * How each kind of line is drawn: the glyph that opens its row, so the log is scanned by shape
 * before it is read — a sword for a blow, a potion for a heal, a skull for a fall — and the class
 * that carries its accent rail.
 */
const KIND_STYLE: Record<LogKind, { glyph: GlyphKey; row: string | undefined }> = {
  turn: { glyph: 'glyph.hourglass', row: styles.rowTurn },
  cast: { glyph: 'glyph.spell_casting', row: styles.rowCast },
  hit: { glyph: 'glyph.sword_clash', row: styles.rowHit },
  crit: { glyph: 'glyph.crossed_swords', row: styles.rowCrit },
  heal: { glyph: 'glyph.health_potion', row: styles.rowHeal },
  shield: { glyph: 'glyph.shield_block', row: styles.rowShield },
  buff: { glyph: 'glyph.holy_totem', row: styles.rowBuff },
  debuff: { glyph: 'glyph.evil_eye', row: styles.rowDebuff },
  refused: { glyph: 'glyph.nature_shield', row: styles.rowRefused },
  dot: { glyph: 'glyph.magic_flame', row: styles.rowDot },
  death: { glyph: 'glyph.skull_wreath', row: styles.rowDeath },
  revive: { glyph: 'glyph.phoenix', row: styles.rowRevive },
  boss: { glyph: 'glyph.flaming_skull', row: styles.rowBoss },
  system: { glyph: 'glyph.burning_scroll', row: styles.rowSystem },
};

/** What an amount is: damage in ember, a heal in green, a shield in the justice blue. */
const TONE_CLASS: Record<LogTone, string | undefined> = {
  damage: styles.amountDamage,
  heal: styles.amountHeal,
  shield: styles.amountShield,
};

/** Info panel: the scrolling battle log built from played events. */
export function InfoPanel({ log, view }: { log: readonly BattleEvent[]; view: BattleView | null }) {
  const lines = useMemo(() => describeEvents(log, view).slice(-120), [log, view]);
  const list = useRef<HTMLUListElement>(null);
  useEffect(() => {
    const node = list.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [lines.length]);
  return (
    <Panel
      kind="ember-tall"
      padding={16}
      className={styles.info}
      contentClassName={styles.infoBody}
      data-testid="battle-info"
    >
      <h2 className={`display ${styles.infoTitle}`}>{t('battle.log')}</h2>
      <ul ref={list} className={styles.logList} data-testid="battle-log">
        {lines.length === 0 ? <li className={styles.logEmpty}>{t('battle.logEmpty')}</li> : null}
        {lines.map((line, i) => (
          <LogRow key={`${line.key}-${i}`} line={line} />
        ))}
      </ul>
      <p className={styles.hotkeys}>{t('battle.hotkeys')}</p>
    </Panel>
  );
}

/** One event: its glyph, then the sentence with every slot drawn as what it is. */
function LogRow({ line }: { line: LogLine }) {
  const parts = templateParts(line.template);
  const kind = KIND_STYLE[line.kind];
  return (
    <li
      className={[styles.logLine, kind.row ?? ''].join(' ')}
      data-kind={line.kind}
      aria-label={lineText(line)}
    >
      <Glyph glyph={kind.glyph} size={15} className={styles.logGlyph ?? ''} />
      <span className={styles.logText}>
        {parts.map((part, index) =>
          part.kind === 'text' ? (
            <span key={index}>{part.text}</span>
          ) : (
            <Slot key={index} value={line.values[part.name]} />
          ),
        )}
      </span>
    </li>
  );
}

/** A sentence's slot: a name in its colour, a number in its weight, a status as its own icon. */
function Slot({ value }: { value: LogValue | undefined }) {
  if (!value) return null;
  switch (value.kind) {
    case 'unit':
      return (
        <span
          className={[styles.logName, value.boss ? styles.logBoss : ''].join(' ')}
          style={{ color: value.colour }}
        >
          {value.name}
        </span>
      );
    case 'amount':
      return (
        <span className={`num ${styles.logAmount} ${TONE_CLASS[value.tone] ?? ''}`}>
          {value.value.toLocaleString('en-US')}
        </span>
      );
    case 'status': {
      const meta = STATUS_BY_ID[value.id];
      const tone = value.status === 'buff' ? styles.logBuff : styles.logDebuff;
      return (
        <span className={[styles.logStatus, tone ?? ''].join(' ')}>
          {meta ? <Glyph glyph={meta.glyph} size={14} className={styles.logStatusGlyph ?? ''} /> : null}
          {value.name}
        </span>
      );
    }
    default:
      return <span className={styles.logPlain}>{value.text}</span>;
  }
}
