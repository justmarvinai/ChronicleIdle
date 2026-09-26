import { playSfx } from '@audio/index';
import { t } from '@i18n/index';
import { Button } from '@ui/components/Button/Button';
import { Dropdown } from '@ui/components/Dropdown/Dropdown';
import { Glyph } from '@ui/components/Glyph/Glyph';
import styles from './LaunchPanel.module.css';

/** The repeat selector's width: half the column, beside the control switch. */
const REPEAT_WIDTH = 212;

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

/**
 * A mastered stand's second press (CAMPAIGN.md §10): the same runs, written into the chronicle
 * rather than fought. Shown from the level it opens at; dead, with the reason under it, on a stand
 * short of its stars or a purse short of a run.
 */
export interface InstantChoice {
  /** `Instant ×10`, or `Instant clear` for one run or none. */
  label: string;
  /** What the runs cost in all, or null when none can be cleared. */
  price: string | null;
  canPress: boolean;
  /** One line under the button: what it does, or why it cannot. */
  note: string;
  onPress: () => void;
}

export interface LaunchPanelProps {
  /** The price on the button: `6 ⚡`, `1 key`, `One run` — or nothing for a free fight. */
  price: string | null;
  repeat: RepeatChoice | null;
  instant?: InstantChoice | null;
  auto: boolean;
  onAuto: (auto: boolean) => void;
  error: string | null;
  canStart: boolean;
  onStart: () => void;
}

/**
 * The column the fight is launched from (docs/tech/UI_DESIGN.md §5.8): how many runs and who
 * commands them, side by side; on a mastered stand the press that writes them down instead; and
 * the one press that starts them — with the price on it.
 */
export function LaunchPanel({
  price,
  repeat,
  instant = null,
  auto,
  onAuto,
  error,
  canStart,
  onStart,
}: LaunchPanelProps) {
  return (
    <section className={styles.panel} aria-label={t('battleSetup.launch')}>
      <div className={repeat ? styles.fields : styles.fieldsSingle}>
        {repeat ? (
          <div className={styles.field} data-testid="auto-repeat">
            <span className={`display ${styles.label}`}>{t('campaignRun.repeat')}</span>
            <Dropdown<number>
              width={REPEAT_WIDTH}
              value={repeat.value}
              options={repeat.options.map((runs) => ({
                value: runs,
                label:
                  runs === 1 ? t('campaignRun.repeatOnce') : t('campaignRun.repeatTimes', { count: runs }),
                ...(repeat.open.includes(runs)
                  ? {}
                  : { icon: <Glyph glyph="glyph.broken_shackle" size={16} color="var(--text-3)" /> }),
              }))}
              onChange={repeat.onChange}
            />
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
                <Glyph
                  glyph="glyph.spirit_vortex"
                  size={18}
                  color={auto ? 'var(--gold-3)' : 'var(--text-3)'}
                />
                {t('battleSetup.auto')}
              </span>
            </button>
          </span>
        </div>
      </div>
      {repeat && repeat.value > 1 ? (
        <span className={`num ${styles.note}`} data-testid="repeat-affordable">
          {t('battleSetup.covers', { count: repeat.affordable, total: repeat.value })}
        </span>
      ) : null}

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      {instant ? (
        <div className={styles.instant} data-testid="instant">
          <Button
            variant="secondary"
            size="md"
            disabled={!instant.canPress}
            icon={<Glyph glyph="glyph.magic_feather" size={22} color="var(--gold-3)" />}
            onClick={instant.onPress}
            className={styles.instantButton}
            data-testid="instant-clear"
          >
            {instant.label}
            {instant.price ? (
              <>
                <span className={styles.dot} aria-hidden="true">
                  {' · '}
                </span>
                <span className={`num ${styles.price}`}>{instant.price}</span>
              </>
            ) : null}
          </Button>
          {/* The error line speaks for the column while there is one. */}
          {error ? null : (
            <span className={styles.instantNote} data-testid="instant-note">
              {instant.note}
            </span>
          )}
        </div>
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
