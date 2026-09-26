import { tierNumeral } from './deed-text';
import styles from './DeedCard.module.css';

export interface TierPipsProps {
  /** Tiers claimed. */
  claimed: number;
  /** Tiers met and waiting, from the first unclaimed one on. */
  waiting: number;
  tiers: number;
}

/**
 * An achievement's five tiers as five diamonds under its emblem: gold for claimed, lit and
 * breathing for waiting, dark for still to earn — the chain is read at a glance, the number after.
 */
export function TierPips({ claimed, waiting, tiers }: TierPipsProps) {
  return (
    <span className={styles.pips} role="img" aria-label={`${claimed} / ${tiers}`}>
      {Array.from({ length: tiers }, (_, index) => {
        const state = index < claimed ? 'claimed' : index < claimed + waiting ? 'waiting' : 'locked';
        return <span key={index} className={styles.pip} data-state={state} title={tierNumeral(index + 1)} />;
      })}
    </span>
  );
}
