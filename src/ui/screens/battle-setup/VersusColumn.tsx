import { imageUrl } from '@assets/manifest';
import type { EncounterDef } from '@content/encounters/types';
import { t } from '@i18n/index';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { powerShare } from './setup-view';
import styles from './VersusColumn.module.css';

/** What a campaign stand asks for its stars, and what this chronicle has already taken from it. */
export interface StandStakes {
  /** Stars already earned on this stand at this difficulty, 0–3. */
  earned: number;
  /** Ally turns inside which the third star is earned. */
  turns3Star: number;
  /** The fewest ally turns it has been cleared in, or null before the first clear. */
  best: number | null;
}

export interface VersusColumnProps {
  encounter: EncounterDef;
  teamPower: number;
  /** The strongest wave's power, or null where a sum of stats would mislead (a boss gate). */
  enemyPower: number | null;
  stand: StandStakes | null;
}

/**
 * The seam between the two sides (docs/tech/UI_DESIGN.md §5.8): the VS mark, the two powers
 * weighed on one bar, and what the fight is for — a stand's three stars with the ones already
 * earned lit — and how it is lost.
 */
export function VersusColumn({ encounter, teamPower, enemyPower, stand }: VersusColumnProps) {
  const star = imageUrl('ui.stone_vine.icon_star');
  const share = enemyPower === null ? null : powerShare(teamPower, enemyPower);
  const conditions = stand
    ? [t('settlement.star1'), t('settlement.star2'), t('settlement.star3', { turns: stand.turns3Star })]
    : [];
  return (
    <div className={styles.column}>
      <div className={styles.emblem} aria-hidden="true">
        <span className={styles.rule} />
        <span className={styles.medal}>
          <Glyph
            glyph="glyph.crossed_swords"
            size={92}
            color="rgba(240, 213, 122, 0.16)"
            className={styles.swords}
          />
          <span className={`display ${styles.vs}`}>{t('battleSetup.versus')}</span>
        </span>
        <span className={styles.rule} />
      </div>

      {share !== null && enemyPower !== null ? (
        <div className={styles.duel} data-testid="setup-duel">
          <div className={styles.duelNumbers}>
            <span className={styles.side}>
              <span className={styles.sideLabel}>{t('battleSetup.yours')}</span>
              <span className={`num ${styles.ours}`}>{teamPower.toLocaleString('en-US')}</span>
            </span>
            <span className={[styles.side, styles.right].join(' ')}>
              <span className={styles.sideLabel}>{t('battleSetup.theirs')}</span>
              <span className={`num ${styles.theirs}`} data-testid="enemy-power">
                {enemyPower.toLocaleString('en-US')}
              </span>
            </span>
          </div>
          <span className={styles.bar} aria-hidden="true">
            <span className={styles.barOurs} style={{ width: `${share * 100}%` }} />
            <span className={styles.barTheirs} />
          </span>
        </div>
      ) : null}

      <div className={styles.stakes}>
        {stand ? (
          <div className={styles.stars} data-testid="star-conditions">
            <span className={`display ${styles.stakesTitle}`}>{t('settlement.starConditions')}</span>
            <ol className={styles.conditions}>
              {conditions.map((line, i) => {
                const lit = i < stand.earned;
                return (
                  <li key={line} className={lit ? styles.lit : ''} data-earned={lit}>
                    <span
                      className={styles.star}
                      style={{ backgroundImage: `url("${star}")` }}
                      aria-hidden="true"
                    />
                    <span>{line}</span>
                  </li>
                );
              })}
            </ol>
            <span className={`num ${styles.best}`}>
              {stand.best === null
                ? t('settlement.noRecord')
                : t('settlement.bestTurns', { turns: stand.best })}
            </span>
          </div>
        ) : null}
        <p className={styles.limit} data-testid="setup-limit">
          <Glyph glyph="glyph.hourglass" size={20} color="var(--text-3)" />
          {encounter.timeUpIsDefeat
            ? t(encounter.turnLimitMode === 'ally' ? 'settlement.turnLimit' : 'battleSetup.limit.all', {
                turns: encounter.turnLimit,
              })
            : t('battleSetup.limit.race', { turns: encounter.turnLimit })}
        </p>
      </div>
    </div>
  );
}
