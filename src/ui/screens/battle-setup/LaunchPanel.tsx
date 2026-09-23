import { playSfx } from '@audio/index';
import { t } from '@i18n/index';
import { Button } from '@ui/components/Button/Button';
import { Dropdown } from '@ui/components/Dropdown/Dropdown';
import { Glyph } from '@ui/components/Glyph/Glyph';
import styles from './LaunchPanel.module.css';

/** How many runs the auto-repeat selector offers, which of them are open, and what they cost. */
export interface RepeatChoice {
  value: number;
  /** Every tier the selector lists, 1 first; the locked ones say so. */
  options: readonly number[];
  open: readonly number[];
  /** Runs the purse pays for at the chosen count. */
  affordable: number;
  onChange: (runs: number) => void;
}

export interface LaunchPanelProps {
  /** The price on the button: `6 ⚡`, `1 key`, `One run` — or nothing for a free fight. */
  price: string | null;
  repeat: RepeatChoice | null;
  auto: boolean;
  onAuto: (auto: boolean) => void;
  error: string | null;
  canStart: boolean;
  onStart: () => void;
}

/**
 * The column the fight is launched from (docs/tech/UI_DESIGN.md §5.8): how many runs, who
 * commands them, and the one press that starts them — with the price on it.
 */
export function LaunchPanel({ price, repeat, auto, onAuto, error, canStart, onStart }: LaunchPanelProps) {
  return (
    <section className={styles.panel} aria-label={t('battleSetup.launch')}>
      {repeat ? (
        <div className={styles.field} data-testid="auto-repeat">
          <span className={`display ${styles.label}`}>{t('campaignRun.repeat')}</span>
          <Dropdown<number>
            width={372}
            value={repeat.value}
            options={repeat.options.map((runs) => ({
              value: runs,
              label: runs === 1 ? t('campaignRun.repeatOnce') : t('campaignRun.repeatTimes', { count: runs }),
              ...(repeat.open.includes(runs)
                ? {}
                : { icon: <Glyph glyph="glyph.broken_shackle" size={16} color="var(--text-3)" /> }),
            }))}
            onChange={repeat.onChange}
          />
          {repeat.value > 1 ? (
            <span className={`num ${styles.note}`} data-testid="repeat-affordable">
              {t('battleSetup.covers', { count: repeat.affordable, total: repeat.value })}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className={styles.field}>
        <span className={`display ${styles.label}`}>{t('battleSetup.control')}</span>
        <span className={styles.switchWrap} data-testid="setup-auto">
          <button
            type="button"
            role="switch"
            aria-checked={auto}
            aria-label={t('battleSetup.autoLabel')}
            className={styles.switch}
            onMouseEnter={() => playSfx('ui.hover')}
            onClick={() => {
              playSfx('ui.tab');
              onAuto(!auto);
            }}
          >
            <span className={[styles.half, auto ? '' : styles.chosen].join(' ')}>
              <Glyph glyph="glyph.fist_punch" size={18} color={auto ? 'var(--text-3)' : 'var(--gold-3)'} />
              {t('battleSetup.manual')}
            </span>
            <span className={[styles.half, auto ? styles.chosen : ''].join(' ')}>
              <Glyph glyph="glyph.spirit_vortex" size={18} color={auto ? 'var(--gold-3)' : 'var(--text-3)'} />
              {t('battleSetup.auto')}
            </span>
          </button>
        </span>
      </div>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      <Button
        variant="primary"
        size="lg"
        disabled={!canStart}
        icon={<Glyph glyph="glyph.sword_clash" size={28} color="var(--gold-3)" />}
        onClick={onStart}
        className={styles.start}
        data-testid="start-battle"
      >
        {t('battleSetup.start')}
        {price ? (
          <>
            <span className={styles.dot} aria-hidden="true">
              {' · '}
            </span>
            <span className={`num ${styles.price}`}>{price}</span>
          </>
        ) : null}
      </Button>
    </section>
  );
}
