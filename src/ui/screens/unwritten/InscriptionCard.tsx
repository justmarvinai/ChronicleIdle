import type { CSSProperties, ReactNode } from 'react';
import { playSfx } from '@audio/index';
import { INK_ELEMENT, type Bearer, type InscriptionDef } from '@content/unwritten/types';
import { AbilityIcon } from '@ui/components/AbilityIcon/AbilityIcon';
import { elementLabel } from '@ui/screens/champions/roster-view';
import { INK_COLOUR, INK_NAME, RARITY_COLOUR, RARITY_NAME, numeral } from './marks';
import { line, u } from './strings';
import styles from './InscriptionCard.module.css';

/** Whom an inscription is written into, as the card says it. */
function bearerLine(bearer: Bearer): string | null {
  if (bearer === 'each') return null;
  if (bearer === 'leader') return u('unwritten.ui.bearer.leader');
  return u('unwritten.ui.bearer.element', { element: elementLabel(bearer.element) });
}

/** The card's ink: one colour, or a blend's two meeting in the middle. */
function inkStyle(def: InscriptionDef): CSSProperties {
  const [first, second] = def.inks;
  const a = INK_COLOUR[first];
  const b = second ? INK_COLOUR[second] : a;
  return {
    '--ink-a': a,
    '--ink-b': b,
    '--rarity': RARITY_COLOUR[def.rarity],
  } as CSSProperties;
}

export interface InscriptionCardProps {
  def: InscriptionDef;
  /** The level this card writes, 1–3. */
  level: number;
  /** Whether the company already holds it (at `level − 1`): the card then deepens it. */
  deepens?: boolean;
  /** What the card costs, when it is on the Peddler's cloth. */
  price?: ReactNode;
  disabled?: boolean;
  /** A smaller card, for the Peddler's cloth where five wares share a row. */
  compact?: boolean;
  onClick?: () => void;
  testId?: string;
}

/**
 * A tall inscription card (UNWRITTEN.md §7): its ink down the spine, its rarity in the gem, the
 * line at the level it would be written at, and the three levels as marks — the written ones lit.
 */
export function InscriptionCard({
  def,
  level,
  deepens = false,
  price,
  disabled,
  compact = false,
  onClick,
  testId,
}: InscriptionCardProps) {
  const show = def.levels[level - 1]?.show ?? {};
  const bearer = bearerLine(def.bearer);
  const blend = def.inks.length > 1;
  return (
    <button
      type="button"
      className={[
        styles.card,
        blend ? styles.blend : '',
        compact ? styles.compact : '',
        onClick ? styles.live : '',
      ].join(' ')}
      style={inkStyle(def)}
      disabled={disabled}
      onMouseEnter={() => onClick && !disabled && playSfx('ui.hover')}
      onClick={onClick}
      data-testid={testId}
    >
      <span className={styles.spine} aria-hidden="true" />
      <span className={styles.head}>
        <span className={styles.rarity}>{u(RARITY_NAME[def.rarity])}</span>
        <span className={styles.inks}>
          {def.inks.map((ink) => (
            <span key={ink} className={styles.ink} style={{ color: INK_COLOUR[ink] }}>
              {u(INK_NAME[ink])}
            </span>
          ))}
        </span>
      </span>
      <span className={styles.icon}>
        <AbilityIcon icon={def.icon} label={line(def.name, {})} size={compact ? 64 : 92} passive decorative />
      </span>
      <span className={`display ${styles.name}`}>{line(def.name, {})}</span>
      <span className={styles.level} aria-label={u('unwritten.ui.card.level', { level: numeral(level) })}>
        {[1, 2, 3].map((mark) => (
          <span
            key={mark}
            className={[
              styles.mark,
              mark < level ? styles.markHeld : '',
              mark === level ? styles.markNew : '',
            ].join(' ')}
          >
            {numeral(mark)}
          </span>
        ))}
      </span>
      <span className={styles.line}>{line(def.text, show)}</span>
      <span className={styles.foot}>
        {bearer ? <span className={styles.bearer}>{bearer}</span> : null}
        {deepens ? (
          <span className={styles.deepens}>
            {u('unwritten.ui.card.deepens', { from: numeral(level - 1), to: numeral(level) })}
          </span>
        ) : (
          <span className={styles.fresh}>{u('unwritten.ui.card.new')}</span>
        )}
        {blend ? (
          <span className={styles.kin}>
            {def.inks.map((ink) => elementLabel(INK_ELEMENT[ink])).join(' · ')}
          </span>
        ) : null}
      </span>
      {price !== undefined ? <span className={styles.price}>{price}</span> : null}
    </button>
  );
}

export interface InscriptionRowProps {
  def: InscriptionDef;
  level: number;
  selected?: boolean;
  onClick?: () => void;
  testId?: string;
}

/** An inscription as the codex lists it: its icon, its name, its level, and the line beneath. */
export function InscriptionRow({ def, level, selected, onClick, testId }: InscriptionRowProps) {
  const show = def.levels[level - 1]?.show ?? {};
  return (
    <button
      type="button"
      className={[styles.row, selected ? styles.rowOn : '', onClick ? styles.live : ''].join(' ')}
      style={inkStyle(def)}
      disabled={!onClick}
      onClick={onClick}
      data-testid={testId}
    >
      <AbilityIcon icon={def.icon} label={line(def.name, {})} size={44} passive decorative />
      <span className={styles.rowText}>
        <span className={styles.rowHead}>
          <span className={`display ${styles.rowName}`}>{line(def.name, {})}</span>
          <span className={styles.rowLevel}>{numeral(level)}</span>
        </span>
        <span className={styles.rowLine}>{line(def.text, show)}</span>
      </span>
    </button>
  );
}
