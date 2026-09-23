import { content } from '@content/registry';
import { t, translate } from '@i18n/index';
import type { BossFightSummary } from '@state/bosses';
import { Bar } from '@ui/components/Bar/Bar';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { ResultBanner } from './ResultBanner';
import { xpTile } from './reward-tile';
import { RewardTiles } from './RewardTiles';
import panel from './ResultPanel.module.css';
import styles from './BossOutcomePanel.module.css';

const count = (value: number): string => Math.round(value).toLocaleString('en-US');

/**
 * What a key bought (docs/design/BOSSES.md §1): the damage this fight did, large; the period's pool
 * after it, as a bar marked at each chest's threshold and lit where the pool has reached; then the
 * record and the chests this fight earned as banners. A boss fight has no stars and no spoils of its
 * own — the chests at the gate are the spoils.
 */
export function BossOutcomePanel({ summary }: { summary: BossFightSummary }) {
  const tier = content.bossTier(summary.bossId, summary.tierId);
  if (!tier) return null;
  return (
    <div className={panel.panel} data-testid="result-boss">
      <div className={styles.hero}>
        <h2 className={`display ${panel.heading}`}>{t('bosses.result.damage')}</h2>
        <p className={`num ${styles.damage}`} data-testid="result-boss-damage">
          {count(summary.damage)}
        </p>
      </div>

      <div className={styles.pool}>
        {/* The line under the bar says the numbers, so the bar itself carries only its notches. */}
        <div
          className={styles.track}
          role="img"
          aria-label={translate('bosses.damageOf', {
            damage: count(summary.total),
            pool: count(tier.stats.hp),
          })}
        >
          <Bar value={summary.total} max={tier.stats.hp} kind="ember" height={26} />
          {/* A notch at every chest's threshold, lit once the pool has reached it. */}
          {tier.chests.map((chest) =>
            chest.pct < 100 ? (
              <span
                key={chest.pct}
                className={[styles.notch, summary.percent >= chest.pct ? styles.notchOn : ''].join(' ')}
                style={{ left: `${chest.pct}%` }}
                aria-hidden="true"
              />
            ) : null,
          )}
        </div>
        <ol className={styles.chests} aria-hidden="true">
          {tier.chests.map((chest) => (
            <li
              key={chest.pct}
              className={summary.percent >= chest.pct ? styles.chestOn : ''}
              style={{ left: `${chest.pct}%` }}
            >
              <Glyph
                glyph="glyph.trophy_cup"
                size={14}
                color={summary.percent >= chest.pct ? 'var(--gold-3)' : 'var(--text-3)'}
              />
              <span className="num">{chest.pct} %</span>
            </li>
          ))}
        </ol>
      </div>
      <p className={panel.line} data-testid="result-boss-total">
        {translate('bosses.result.total', {
          damage: count(summary.total),
          pct: Math.floor(summary.percent),
        })}
      </p>

      {summary.newRecord ? (
        <ResultBanner glyph="glyph.shooting_stars" testId="result-boss-record">
          {t('bosses.result.record')}
        </ResultBanner>
      ) : null}
      {summary.unlocked.length ? (
        <ResultBanner glyph="glyph.trophy_cup" testId="result-boss-chests">
          {translate('bosses.result.unlocked', {
            list: summary.unlocked.map((pct) => `${pct} %`).join(', '),
          })}
        </ResultBanner>
      ) : null}
      {summary.playerXp > 0 ? <RewardTiles tiles={[xpTile('player', summary.playerXp)]} /> : null}
    </div>
  );
}
