import { CURRENCY_BY_ID } from '@content/currencies/index';
import type { ChampionDef } from '@content/champions/types';
import type { ChampionInstance } from '@engine/champions/instance';
import { levelCap } from '@engine/champions/stats';
import type { FeedPreview } from '@engine/progression/tavern-level';
import { t, translate } from '@i18n/index';
import { TintedIcon } from '@ui/components/AssetImage/TintedIcon';
import { Button } from '@ui/components/Button/Button';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { Tooltip } from '@ui/components/Tooltip/Tooltip';
import { StatPreview } from './StatPreview';
import type { GrowthPreview, TableXp } from './tavern-view';
import styles from './TavernPanel.module.css';

export interface LevelTrackProps {
  def: ChampionDef;
  instance: ChampionInstance;
  preview: FeedPreview | null;
  table: TableXp;
  growth: GrowthPreview | null;
  /** The champion stands at its star tier's cap; `complete` when that tier is its last. */
  atCap: boolean;
  complete: boolean;
  onToRank: () => void;
  onPour: () => void;
  onFill: () => void;
  onClear: () => void;
}

const format = (value: number): string => value.toLocaleString('en-US');

/**
 * The Upgrade Level track (docs/tech/UI_DESIGN.md §5.5): where the table takes the champion, what
 * it holds, what the champion gains — or, at the cap, the way on through Upgrade Rank.
 */
export function LevelTrack(props: LevelTrackProps) {
  const { instance, preview, table, growth } = props;
  const cap = levelCap(instance.stars);
  const universal = CURRENCY_BY_ID.brew_universal;

  if (props.atCap) {
    return (
      <div className={styles.track} data-testid="tavern-level">
        <div className={styles.capped} data-testid="tavern-at-cap">
          <Glyph glyph="glyph.shooting_stars" size={44} color="var(--gold-3)" />
          <strong className={`display ${styles.cappedTitle}`}>
            {t('tavern.capped.title', { level: instance.level, stars: instance.stars })}
          </strong>
          {props.complete ? (
            <p className={styles.cappedBody}>
              {t('tavern.capped.done', { name: translate(props.def.name) })}
            </p>
          ) : (
            <>
              <p className={styles.cappedBody}>
                {t('tavern.capped.body', { cap: levelCap(instance.stars + 1) })}
              </p>
              <Button variant="primary" onClick={props.onToRank} data-testid="tavern-to-rank">
                {t('tavern.capped.toRank')}
              </Button>
            </>
          )}
        </div>
        <p className={`num ${styles.levelBig}`} data-testid="tavern-level-now">
          {t('tavern.levelStays', { level: instance.level })}
          <span className={styles.cap}> / {cap}</span>
        </p>
      </div>
    );
  }

  return (
    <div className={styles.track} data-testid="tavern-level">
      <p className={styles.hint}>{t('tavern.tab.level.hint')}</p>
      <p className={`num ${styles.levelBig}`} data-testid="tavern-level-now">
        {preview && preview.levelsGained > 0
          ? t('tavern.levelPreview', { from: instance.level, to: preview.level })
          : t('tavern.levelStays', { level: instance.level })}
        <span className={styles.cap}> / {cap}</span>
      </p>

      <div className={styles.ledger}>
        <div className={styles.ledgerHead}>
          <span className={`display ${styles.ledgerCaption}`}>{t('tavern.offering')}</span>
          <Button size="sm" variant="ghost" sound="ui.cancel" onClick={props.onClear}>
            {t('tavern.clear')}
          </Button>
        </div>
        <div className={styles.ledgerRow}>
          <TintedIcon asset={universal.icon} tint={universal.tint} size={26} />
          <span className={styles.ledgerName}>{t('tavern.table.brews')}</span>
          <span className={`num ${styles.ledgerCount}`}>
            {t('tavern.table.count', { count: table.brews.count })}
          </span>
          <span className={`num ${styles.ledgerXp}`}>+{format(table.brews.xp)}</span>
        </div>
        <div className={styles.ledgerRow}>
          <Glyph glyph="glyph.cloaked_figure" size={26} color="var(--gold-2)" />
          <span className={styles.ledgerName}>{t('tavern.table.food')}</span>
          <span className={`num ${styles.ledgerCount}`}>
            {t('tavern.table.count', { count: table.food.count })}
          </span>
          <span className={`num ${styles.ledgerXp}`}>+{format(table.food.xp)}</span>
        </div>
        <div className={`${styles.ledgerRow} ${styles.ledgerTotal}`}>
          <span className={`display ${styles.ledgerName}`}>{t('tavern.table.total')}</span>
          {preview ? (
            <span className={`num ${styles.total}`} data-testid="tavern-xp">
              {t('tavern.xpGained', { xp: format(preview.xp) })}
            </span>
          ) : (
            <span className={styles.nothing}>{t('tavern.nothing')}</span>
          )}
        </div>
      </div>

      {preview && preview.wasted > 0 ? (
        <p className={styles.warn}>{t('tavern.wasted', { xp: format(preview.wasted) })}</p>
      ) : null}

      {growth ? <StatPreview growth={growth} testId="tavern-growth" /> : null}

      <div className={styles.actions}>
        <Tooltip content={t('tavern.pour.hint')} maxWidth={320}>
          <Button size="sm" variant="secondary" onClick={props.onPour} data-testid="tavern-pour">
            {t('tavern.pour')}
          </Button>
        </Tooltip>
        <Tooltip content={t('tavern.autofill.levelHint')} maxWidth={320}>
          <Button size="sm" variant="secondary" onClick={props.onFill} data-testid="tavern-autofill">
            {t('tavern.autofill.level')}
          </Button>
        </Tooltip>
      </div>
    </div>
  );
}
