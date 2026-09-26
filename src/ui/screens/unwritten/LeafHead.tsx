import { Glyph } from '@ui/components/Glyph/Glyph';
import type { PassageKind } from '@content/unwritten/types';
import { PASSAGE_GLYPH, PASSAGE_TINT } from './marks';
import styles from './Panels.module.css';

/** A leaf's heading: the passage's glyph, a kicker above, a title, and a line under it. */
export function LeafHead({
  kind,
  kicker,
  title,
  sub,
}: {
  kind: PassageKind;
  kicker: string;
  title: string;
  sub?: string | null;
}) {
  return (
    <header className={styles.head}>
      <Glyph glyph={PASSAGE_GLYPH[kind]} size={54} color={PASSAGE_TINT[kind]} />
      <div className={styles.headText}>
        <span className={styles.kicker}>{kicker}</span>
        <h2 className={`display ${styles.title}`}>{title}</h2>
        {sub ? <p className={styles.sub}>{sub}</p> : null}
      </div>
    </header>
  );
}
