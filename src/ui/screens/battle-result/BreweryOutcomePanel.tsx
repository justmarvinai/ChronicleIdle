import { CURRENCY_BY_ID } from '@content/currencies/index';
import { content } from '@content/registry';
import { t, translate } from '@i18n/index';
import type { BreweryRunSummary } from '@state/brewery';
import { TintedIcon } from '@ui/components/AssetImage/TintedIcon';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { ResultBanner } from './ResultBanner';
import panel from './ResultPanel.module.css';
import styles from './BreweryOutcomePanel.module.css';

/** The beat between one cask landing and the next, in milliseconds. */
const CASK_STEP = 110;

/**
 * What a brewery run poured (docs/design/BREWERY.md §6). A run pays one thing — brews — so the
 * casks themselves are the panel: one per brew, filling in sequence beside the count, over the two
 * things that decide what the player does next — whether the next stage opened, and how many of
 * the day's runs are left.
 */
export function BreweryOutcomePanel({ summary }: { summary: BreweryRunSummary }) {
  const hall = content.breweryByElement(summary.element);
  const brew = CURRENCY_BY_ID[hall.brew];
  const poured = summary.brews.reduce((sum, entry) => sum + entry.amount, 0);
  return (
    <div className={panel.panel} data-testid="brewery-outcome">
      <h2 className={`display ${panel.heading}`}>
        {translate(hall.name)} · {t('brewery.stage', { stage: summary.stage })}
      </h2>
      {summary.cleared ? (
        <>
          <div className={styles.haul}>
            <div className={styles.casks} data-testid="brewery-outcome-brews">
              {/* One cask per brew, so five reads as five without being counted. */}
              {Array.from({ length: poured }, (_, index) => (
                <span
                  key={index}
                  className={styles.cask}
                  style={{ animationDelay: `${index * CASK_STEP}ms` }}
                >
                  <TintedIcon asset={brew.icon} tint={brew.tint} size={48} />
                </span>
              ))}
            </div>
            <p className={styles.gain}>
              <span className={`num ${styles.amount}`}>+{poured}</span>
              <span className={styles.brewName}>{translate(brew.name)}</span>
            </p>
          </div>
          {summary.firstClear && summary.stage < hall.stages.length ? (
            <ResultBanner glyph="glyph.shooting_stars" testId="brewery-outcome-first">
              {t('brewery.result.firstClear', { stage: summary.stage, next: summary.stage + 1 })}
            </ResultBanner>
          ) : null}
        </>
      ) : (
        <ResultBanner glyph="glyph.skull_wreath" tone="ember" testId="brewery-outcome-held">
          {t('brewery.result.lost')}
        </ResultBanner>
      )}
      <p className={panel.line}>
        <Glyph glyph="glyph.hourglass" size={16} color="var(--text-3)" />
        <span className="num" data-testid="brewery-outcome-runs">
          {t('brewery.result.runs', { left: summary.runsLeft })}
        </span>
      </p>
    </div>
  );
}
