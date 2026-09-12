import type { ReactNode } from 'react';
import { kitBorder } from '@ui/styles/kit';
import styles from './BottomBar.module.css';

/** Bottom chrome strip for primary actions (hub navigation, Battle/Start). */
export function BottomBar({
  left,
  center,
  right,
}: {
  left?: ReactNode;
  center?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <footer className={styles.bar} style={kitBorder('ui.dark_ember.bg_wide', 0.5)} data-testid="bottombar">
      <div className={styles.left}>{left}</div>
      <div className={styles.center}>{center}</div>
      <div className={styles.right}>{right}</div>
    </footer>
  );
}
