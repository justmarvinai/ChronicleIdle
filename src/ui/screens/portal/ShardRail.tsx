import { playSfx } from '@audio/index';
import type { ShardId } from '@content/balance/summon';
import { translate, t } from '@i18n/index';
import { AssetImage } from '@ui/components/AssetImage/AssetImage';
import { DecoFrame } from '@ui/components/Frame/DecoFrame';
import { CARD_TINT } from '@ui/styles/display-maps';
import type { ShardView } from '@ui/summon/portal-view';
import styles from './ShardRail.module.css';

export interface ShardRailProps {
  shards: readonly ShardView[];
  selected: ShardId;
  onSelect: (shard: ShardId) => void;
}

/** The left rail: four shard cards with what the purse holds and what each may answer with. */
export function ShardRail({ shards, selected, onSelect }: ShardRailProps) {
  return (
    <section className={styles.rail} aria-label={t('portal.shards')}>
      <h2 className={`display ${styles.heading}`}>{t('portal.shards')}</h2>
      {shards.map((view) => {
        const on = view.shard === selected;
        return (
          <DecoFrame
            key={view.shard}
            frame={on ? 13 : 16}
            tint={on ? CARD_TINT.unlocked : CARD_TINT.locked}
            thickness={12}
            role="button"
            tabIndex={0}
            aria-pressed={on}
            className={[styles.card, on ? styles.cardOn : ''].join(' ')}
            data-testid={`portal-shard-${view.shard}`}
            onMouseEnter={() => playSfx('ui.hover')}
            onClick={() => {
              playSfx('ui.tab');
              onSelect(view.shard);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect(view.shard);
              }
            }}
          >
            <AssetImage
              asset={view.icon}
              size={128}
              className={styles.icon}
              alt=""
              {...(view.tint ? { tint: view.tint } : {})}
            />
            <div className={styles.text}>
              <span className={`display ${styles.name}`}>{view.name}</span>
              <span className={`num ${styles.held}`} data-testid={`portal-held-${view.shard}`}>
                {translate('portal.held', { count: view.held })}
              </span>
              <span className={styles.blurb}>{view.blurb}</span>
            </div>
          </DecoFrame>
        );
      })}
    </section>
  );
}
