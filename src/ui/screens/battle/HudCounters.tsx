import { t } from '@i18n/index';
import { Button } from '@ui/components/Button/Button';
import { Glyph } from '@ui/components/Glyph/Glyph';
import styles from './Hud.module.css';

export interface HudCountersProps {
  wave: number;
  waveCount: number;
  allyTurns: number;
  turnLimit: number;
  /** Milliseconds the fight has run, paused time excluded. */
  elapsed: number;
  onPause: () => void;
}

/**
 * The fight's instruments, top left (docs/tech/UI_DESIGN.md §5.9): the pause, the waves as pips
 * with the one under way lit, the ally turns against the limit with the budget draining under
 * them, and the time.
 */
export function HudCounters({ wave, waveCount, allyTurns, turnLimit, elapsed, onPause }: HudCountersProps) {
  const minutes = Math.floor(elapsed / 60_000);
  const seconds = Math.floor((elapsed % 60_000) / 1000);
  const spent = turnLimit > 0 ? Math.min(1, allyTurns / turnLimit) : 0;
  return (
    <div className={styles.topLeft}>
      <Button
        variant="square"
        size="sm"
        sound="ui.open"
        onClick={onPause}
        aria-label={t('battle.pause')}
        title={t('battle.pause')}
        className={styles.pause}
        data-testid="battle-pause"
      >
        <span className={styles.pauseMark} aria-hidden="true">
          <span />
          <span />
        </span>
      </Button>
      <div className={styles.counters}>
        <div className={styles.waveRow}>
          <span className={`display ${styles.wave}`} data-testid="battle-wave">
            {t('battle.wave', { wave, count: waveCount })}
          </span>
          <span className={styles.pips} aria-hidden="true">
            {Array.from({ length: waveCount }, (_, i) => (
              <span
                key={i}
                className={[
                  styles.pip,
                  i + 1 < wave ? styles.pipDone : '',
                  i + 1 === wave ? styles.pipNow : '',
                ].join(' ')}
              />
            ))}
          </span>
        </div>
        <span className={`num ${styles.turns}`} data-testid="battle-turns">
          {t('battle.turnsUsed', { turns: allyTurns, limit: turnLimit })}
        </span>
        <span className={styles.budget} aria-hidden="true">
          <span style={{ width: `${(1 - spent) * 100}%` }} className={spent > 0.75 ? styles.budgetLow : ''} />
        </span>
        <span className={`num ${styles.time}`}>
          <Glyph glyph="glyph.hourglass" size={14} color="var(--text-3)" />
          {t('battle.time')} {minutes}:{String(seconds).padStart(2, '0')}
        </span>
      </div>
    </div>
  );
}
