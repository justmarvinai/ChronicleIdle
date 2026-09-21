import { CURRENCY_BY_ID } from '@content/currencies/index';
import { content } from '@content/registry';
import { t, translate } from '@i18n/index';
import type { BreweryRunSummary } from '@state/brewery';
import { TintedIcon } from '@ui/components/AssetImage/TintedIcon';
import styles from './BreweryOutcomePanel.module.css';

/**
 * What a brewery run poured (docs/design/BREWERY.md §6). A run pays one thing — brews — so the
 * casks themselves are the panel: one per brew, filling in sequence, over the two numbers that
 * decide what the player does next (whether the next stage opened, and how many runs the day
 * has left).
 */
export function BreweryOutcomePanel({ summary }: { summary: BreweryRunSummary }) {
  const hall = content.breweryByElement(summary.element);
  const brew = CURRENCY_BY_ID[hall.brew];
  const poured = summary.brews.reduce((sum, entry) => sum + entry.amount, 0);
  return (
    <div className={styles.panel} data-testid="brewery-outcome">
      <h3 className={`display ${styles.title}`}>
        {translate(hall.name)} · {t('brewery.stage', { stage: summary.stage })}
      </h3>
      {summary.cleared ? (
        <>
          <div className={styles.casks} data-testid="brewery-outcome-brews">
            {/* One cask per brew, so five reads as five without being counted. */}
            {Array.from({ length: poured }, (_, index) => (
              <span key={index} className={styles.cask} style={{ animationDelay: `${index * 110}ms` }}>
                <TintedIcon asset={brew.icon} tint={brew.tint} size={40} />
              </span>
            ))}
          </div>
          <p className={`num ${styles.gain}`}>
            +{poured} {translate(brew.name)}
          </p>
          {summary.firstClear && summary.stage < hall.stages.length ? (
            <p className={styles.note} data-testid="brewery-outcome-first">
              {t('brewery.result.firstClear', { stage: summary.stage, next: summary.stage + 1 })}
            </p>
          ) : null}
        </>
      ) : (
        <p className={styles.held} data-testid="brewery-outcome-held">
          {t('brewery.result.lost')}
        </p>
      )}
      <p className={`num ${styles.runs}`} data-testid="brewery-outcome-runs">
        {t('brewery.result.runs', { left: summary.runsLeft })}
      </p>
    </div>
  );
}
