import type { ShardId } from '@content/balance/summon';
import { t } from '@i18n/index';
import { RARITY_HEX } from '@ui/styles/display-maps';
import { shardRange } from '@ui/summon/portal-view';
import styles from './RarityRange.module.css';

export interface RarityRangeProps {
  shard: ShardId;
  /** The nameplate under the gate draws it larger than a rail card does. */
  size?: 'sm' | 'lg';
  className?: string;
}

/**
 * What a shard can answer with, at a glance: a lit diamond for each rarity it can give, then the
 * least and the most by name, each in its own colour (SUMMONING.md §1).
 */
export function RarityRange({ shard, size = 'sm', className }: RarityRangeProps) {
  const range = shardRange(shard);
  const least = range[0];
  const most = range.at(-1);
  if (!least || !most) return null;
  return (
    <span className={[styles.range, styles[size], className ?? ''].join(' ')}>
      <span className={styles.pips} aria-hidden="true">
        {range.map((rarity) => (
          <i key={rarity} className={styles.pip} style={{ ['--pip' as string]: RARITY_HEX[rarity] }} />
        ))}
      </span>
      <span className={styles.words}>
        <span style={{ color: RARITY_HEX[least] }}>{t(`rarity.${least}`)}</span>
        {least !== most ? (
          <>
            {' '}
            <span className={styles.to}>{t('portal.range.to')}</span>{' '}
            <span style={{ color: RARITY_HEX[most] }}>{t(`rarity.${most}`)}</span>
          </>
        ) : null}
      </span>
    </span>
  );
}
