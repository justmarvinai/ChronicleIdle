import type { ChampionDef } from '@content/champions/types';
import type { ChampionInstance } from '@engine/champions/instance';
import { levelCap } from '@engine/champions/stats';
import type { RankRequirement } from '@engine/progression/tavern-rank';
import { t, translate } from '@i18n/index';
import { Button } from '@ui/components/Button/Button';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { StarRow } from '@ui/components/StarRow/StarRow';
import { Tooltip } from '@ui/components/Tooltip/Tooltip';
import { RARITY_HEX } from '@ui/styles/display-maps';
import { StatPreview } from './StatPreview';
import type { GrowthPreview } from './tavern-view';
import styles from './TavernPanel.module.css';

export interface RankTrackProps {
  def: ChampionDef;
  instance: ChampionInstance;
  requirement: RankRequirement | null;
  seated: number;
  /** Free champions of the star tier asked for. */
  spares: number;
  growth: GrowthPreview | null;
  onAutoFill: () => void;
  onClear: () => void;
}

/**
 * The Upgrade Rank track (docs/tech/UI_DESIGN.md §5.5): the star it lights, the champions it
 * asks for and how many are seated, and what the star brings — a higher cap and a stronger sheet.
 */
export function RankTrack({
  def,
  instance,
  requirement,
  seated,
  spares,
  growth,
  onAutoFill,
  onClear,
}: RankTrackProps) {
  if (!requirement) {
    return (
      <div className={styles.track} data-testid="tavern-rank">
        <div className={styles.capped}>
          <Glyph glyph="glyph.trophy_cup" size={44} color="var(--gold-3)" />
          <p className={styles.cappedBody} data-testid="tavern-rank-maxed">
            {t('tavern.rank.maxed', { name: translate(def.name) })}
          </p>
        </div>
      </div>
    );
  }
  const color = RARITY_HEX[def.rarity];
  return (
    <div className={styles.track} data-testid="tavern-rank">
      <p className={styles.hint}>
        {t('tavern.tab.rank.hint', { count: requirement.count, stars: requirement.foodStars })}
      </p>
      <div className={styles.rankTitle}>
        <StarRow stars={requirement.to} max={6} size={26} tone="rarity" tint={color} />
        <span className={`num ${styles.levelBig}`}>
          {t('tavern.rank.title', { from: requirement.from, to: requirement.to })}
        </span>
      </div>

      <div className={styles.need}>
        <p className={`num ${styles.needLine}`} data-testid="tavern-rank-need">
          {t('tavern.rank.requirement', { count: requirement.count, stars: requirement.foodStars })}
        </p>
        <div className={styles.pips} aria-hidden="true">
          {Array.from({ length: requirement.count }, (_, index) => (
            <span key={index} className={index < seated ? styles.pipOn : styles.pip} />
          ))}
        </div>
        <div className={styles.needFoot}>
          <span className={`num ${styles.seatedLine}`} data-testid="tavern-rank-seated">
            {t('tavern.rank.have', { have: seated, need: requirement.count })}
          </span>
          <span className={`num ${styles.spareLine}`}>{t('tavern.rank.freeCount', { count: spares })}</span>
        </div>
      </div>

      <div className={styles.gainLine}>
        <Glyph glyph="glyph.shooting_stars" size={22} color="var(--gold-3)" />
        <span className="num">
          {t('tavern.rank.cap', { from: levelCap(requirement.from), to: levelCap(requirement.to) })}
        </span>
      </div>
      <p className={styles.hint}>{t('tavern.rank.keeps', { level: instance.level })}</p>

      {growth ? <StatPreview growth={growth} testId="tavern-rank-growth" /> : null}

      <div className={styles.actions}>
        <Tooltip content={t('tavern.autofill.rankHint')} maxWidth={320}>
          <Button size="sm" variant="secondary" onClick={onAutoFill} data-testid="tavern-autofill-rank">
            {t('tavern.autofill')}
          </Button>
        </Tooltip>
        <Button size="sm" variant="ghost" sound="ui.cancel" onClick={onClear}>
          {t('tavern.clear')}
        </Button>
      </div>
    </div>
  );
}
