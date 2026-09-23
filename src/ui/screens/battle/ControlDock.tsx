import { playSfx } from '@audio/index';
import type { BattleSpeed } from '@state/battle/index';
import { t } from '@i18n/index';
import { Glyph } from '@ui/components/Glyph/Glyph';
import styles from './Hud.module.css';

/** Every speed a fight can run at; the ones past the chronicle's reach are drawn dark. */
const SPEEDS: readonly BattleSpeed[] = [1, 2, 3, 4];

export interface ControlDockProps {
  info: boolean;
  auto: boolean;
  speed: BattleSpeed;
  maxSpeed: BattleSpeed;
  onInfo: () => void;
  onAuto: () => void;
  onSpeed: () => void;
}

/**
 * The fight's three switches, bottom left (docs/tech/UI_DESIGN.md §5.9): the log, auto and the
 * speed — each with its key under it, auto lit while it runs the fight, and the speed's pips
 * showing how far the chronicle can quicken a fight and how far it is quickened now.
 */
export function ControlDock({ info, auto, speed, maxSpeed, onInfo, onAuto, onSpeed }: ControlDockProps) {
  return (
    <div className={styles.dock}>
      <button
        type="button"
        className={[styles.control, info ? styles.controlOn : ''].join(' ')}
        aria-pressed={info}
        onMouseEnter={() => playSfx('ui.hover')}
        onClick={onInfo}
        data-testid="battle-info-toggle"
      >
        <Glyph glyph="glyph.spell_book" size={26} color={info ? 'var(--gold-3)' : 'var(--text-2)'} />
        <span className={`display ${styles.controlLabel}`}>{t('battle.info')}</span>
        <kbd className={styles.key}>I</kbd>
      </button>
      <button
        type="button"
        className={[styles.control, auto ? styles.controlOn : ''].join(' ')}
        aria-pressed={auto}
        onMouseEnter={() => playSfx('ui.hover')}
        onClick={onAuto}
        data-testid="battle-auto"
      >
        <Glyph
          glyph="glyph.spirit_vortex"
          size={26}
          color={auto ? 'var(--gold-3)' : 'var(--text-2)'}
          className={auto ? styles.spin : ''}
        />
        <span className={`display ${styles.controlLabel}`}>{t('battle.auto')}</span>
        <kbd className={styles.key}>A</kbd>
      </button>
      <button
        type="button"
        className={styles.control}
        onMouseEnter={() => playSfx('ui.hover')}
        onClick={onSpeed}
        aria-label={t('battle.speed', { speed })}
        title={maxSpeed < SPEEDS.length ? t('battle.speedLocked') : t('battle.speed', { speed })}
        data-testid="battle-speed"
      >
        <span className={`num ${styles.speed}`}>×{speed}</span>
        <span className={styles.speedPips} aria-hidden="true">
          {SPEEDS.map((step) => (
            <span
              key={step}
              className={[
                styles.speedPip,
                step <= speed ? styles.speedPipOn : '',
                step > maxSpeed ? styles.speedPipLocked : '',
              ].join(' ')}
            />
          ))}
        </span>
        <kbd className={styles.key}>+ −</kbd>
      </button>
    </div>
  );
}
