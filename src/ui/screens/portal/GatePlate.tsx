import { MULTI_PULL } from '@content/balance/summon';
import { t } from '@i18n/index';
import { AssetImage } from '@ui/components/AssetImage/AssetImage';
import { Button } from '@ui/components/Button/Button';
import { SHARD_HEX } from '@ui/styles/display-maps';
import type { ShardView } from '@ui/summon/portal-view';
import { RarityRange } from './RarityRange';
import styles from './GatePlate.module.css';

export interface GatePlateProps {
  view: ShardView;
  /** What the purse holds, or why the last press was refused. */
  status: string;
  refused: boolean;
  /** Stood aside while a press plays out: the reveal's way out takes its place. */
  hidden: boolean;
  onSummon: (count: number) => void;
}

/**
 * Under the gate (docs/tech/UI_DESIGN.md §5.12): the name of the shard hanging in the ring, what it
 * can answer with, and the two presses — each saying what it costs in that shard.
 */
export function GatePlate({ view, status, refused, hidden, onSummon }: GatePlateProps) {
  const press = (count: number, label: string, variant: 'primary' | 'secondary', testId: string) => (
    <Button
      size="lg"
      variant={variant}
      className={styles.press ?? ''}
      disabled={view.held < count}
      onClick={() => onSummon(count)}
      data-testid={testId}
    >
      <span className={styles.pressInner}>
        <span className={styles.pressLabel}>{label}</span>
        <span className={styles.cost}>
          <AssetImage asset={view.icon} size={64} className={styles.costIcon} alt="" />
          <span className="num">{count}</span>
        </span>
      </span>
    </Button>
  );

  return (
    <div
      className={styles.plate}
      style={{ ['--shard' as string]: SHARD_HEX[view.shard] }}
      data-hidden={hidden}
      aria-hidden={hidden}
    >
      <div className={styles.nameplate}>
        <span className={styles.rule} aria-hidden="true" />
        <h2 className={`display ${styles.name}`} data-testid="portal-gate-shard">
          {view.name}
        </h2>
        <span className={styles.rule} aria-hidden="true" />
      </div>
      <RarityRange shard={view.shard} size="lg" />
      <div className={styles.presses}>
        {press(1, t('portal.summonOne'), 'secondary', 'portal-summon-1')}
        {press(MULTI_PULL, t('portal.summonTen'), 'primary', 'portal-summon-10')}
      </div>
      <span className={styles.status} data-refused={refused} data-testid="portal-status">
        {status}
      </span>
    </div>
  );
}
