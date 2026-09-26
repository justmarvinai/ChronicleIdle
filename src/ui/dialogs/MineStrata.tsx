import type { CSSProperties } from 'react';
import { MINE_LEVELS, MINE_MAX_LEVEL } from '@content/balance/mine';
import { CURRENCY_BY_ID } from '@content/currencies/index';
import { t } from '@i18n/index';
import { TintedIcon } from '@ui/components/AssetImage/TintedIcon';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { stratumName } from './mine-text';
import styles from './MineStrata.module.css';

/** Where a stratum stands against the Mine: behind the crews, under them, next, or still dark. */
type StratumState = 'dug' | 'here' | 'next' | 'deep';

function stateOf(stratum: number, level: number): StratumState {
  if (stratum < level) return 'dug';
  if (stratum === level) return 'here';
  return stratum === level + 1 ? 'next' : 'deep';
}

/** The line under a stratum's name: dug, worked, next, or the chronicle level that opens it. */
function StratumNote({ state, open, opensAt }: { state: StratumState; open: boolean; opensAt: number }) {
  if (state === 'dug')
    return (
      <span className={`${styles.note} ${styles.noteDug}`}>
        <Glyph glyph="glyph.pickaxe" size={13} color="var(--mine)" />
        {t('mine.stratum.dug')}
      </span>
    );
  if (state === 'here')
    return <span className={`${styles.note} ${styles.noteHere}`}>{t('mine.stratum.here')}</span>;
  if (!open)
    return (
      <span className={styles.note}>
        <Glyph glyph="glyph.broken_shackle" size={13} color="var(--text-3)" />
        {t('mine.stratum.opens', { level: opensAt })}
      </span>
    );
  return state === 'next' ? (
    <span className={`${styles.note} ${styles.noteNext}`}>{t('mine.stratum.next')}</span>
  ) : null;
}

/**
 * The Deepvein top to bottom (docs/tech/UI_DESIGN.md §5.29): ten strata, the ones dug lit by the
 * crews' lanterns, the one they work now marked, the next outlined, the rest in the dark with the
 * chronicle level that opens them. The rock darkens and the vein brightens with depth, so how far
 * down a chronicle has dug reads before a single number does. Every stratum names its state on a
 * line under its name and its gems a day on the right, so no note ever crowds a name out.
 */
export function MineStrata({
  level,
  playerLevel,
  fresh,
}: {
  level: number;
  playerLevel: number;
  /** A level dug this sitting: it flashes as the rock gives way. */
  fresh: number | null;
}) {
  const gem = CURRENCY_BY_ID.gems;
  return (
    <section className={styles.shaft}>
      <h3 className={`display ${styles.heading}`}>{t('mine.depths')}</h3>
      <p className={styles.hint}>{t('mine.depths.hint')}</p>
      <ol className={styles.strata} data-testid="mine-strata">
        {MINE_LEVELS.map((def) => {
          const state = stateOf(def.level, level);
          const open = playerLevel >= def.opensAt;
          const depth = { '--depth': (def.level - 1) / (MINE_MAX_LEVEL - 1) } as CSSProperties;
          return (
            <li
              key={`${def.level}-${fresh === def.level ? 'fresh' : 'set'}`}
              className={styles.stratum}
              style={depth}
              data-state={state}
              data-open={open}
              data-fresh={fresh === def.level}
              data-testid={`mine-stratum-${def.level}`}
            >
              <span className={`num ${styles.depth}`}>{def.level}</span>
              <span className={styles.name}>
                <span className={styles.title}>{stratumName(def.level)}</span>
                <StratumNote state={state} open={open} opensAt={def.opensAt} />
              </span>
              <span className={`num ${styles.rate}`}>
                <TintedIcon asset={gem.icon} tint={gem.tint} size={20} />
                {def.gemsPerDay}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
