import { t } from '@i18n/index';
import type { TowerFloorSummary } from '@state/tower';
import { ResultBanner } from './ResultBanner';
import { currencyTile, xpTile } from './reward-tile';
import { RewardTiles } from './RewardTiles';
import panel from './ResultPanel.module.css';

/**
 * What a tower floor paid (docs/design/ETERNAL_TOWER.md §4). A floor is not a damage race, so this
 * reads like the campaign's spoils: the climb as a banner — a new best in gold, a floor that held in
 * red — then what the floor left as tiles. A boss floor's shards are the reason to fight one again,
 * so they come last and in their own light.
 */
export function TowerOutcomePanel({ summary }: { summary: TowerFloorSummary }) {
  const gains = summary.changes.filter((change) => change.delta > 0);
  return (
    <div className={panel.panel} data-testid="tower-outcome">
      <h2 className={`display ${panel.heading}`}>
        {summary.boss
          ? t('tower.result.bossFloor', { floor: summary.floor })
          : t('tower.result.floor', { floor: summary.floor })}
      </h2>
      <ResultBanner
        glyph={
          !summary.cleared
            ? 'glyph.skull_wreath'
            : summary.newBest
              ? 'glyph.shooting_stars'
              : 'glyph.eagle_staff'
        }
        tone={!summary.cleared ? 'ember' : summary.newBest ? 'gold' : 'plain'}
        testId="tower-outcome-climb"
      >
        {!summary.cleared
          ? t('tower.result.held')
          : summary.newBest
            ? t('tower.result.newBest', { floor: summary.highestFloor })
            : t('tower.result.cleared', { floor: summary.highestFloor })}
      </ResultBanner>
      {summary.cleared ? (
        <RewardTiles
          testId="tower-outcome-rewards"
          tiles={[
            ...gains.map((change) => currencyTile(change.currency, change.delta)),
            ...(summary.championXp > 0 ? [xpTile('champion', summary.championXp)] : []),
            ...(summary.playerXp > 0 ? [xpTile('player', summary.playerXp)] : []),
          ]}
        />
      ) : null}
      {summary.shards.length ? (
        <div className={panel.panel} data-testid="tower-outcome-shards">
          <ResultBanner glyph="glyph.spirit_vortex" tone="purple">
            {t('tower.result.shards')}
          </ResultBanner>
          <RewardTiles
            tiles={summary.shards.map((shard) => ({
              ...currencyTile(shard.currency, shard.amount, 'rare'),
              amount: t('tower.result.shardCount', { count: shard.amount }),
            }))}
          />
        </div>
      ) : null}
    </div>
  );
}
