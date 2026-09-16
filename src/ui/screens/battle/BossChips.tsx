import { motion } from 'motion/react';
import { BOSS_ENRAGE_STEP } from '@content/balance/battle';
import { STATUS_BY_ID } from '@content/statuses/index';
import type { BossUnitView } from '@engine/battle/index';
import { t, translate, type I18nKey } from '@i18n/index';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { Tooltip } from '@ui/components/Tooltip/Tooltip';
import styles from './BossChips.module.css';

/** The own turn the next enrage step lands on (BOSSES.md §1: `enrageTurn`, then every cadence). */
function nextStepAt(boss: BossUnitView): number {
  return (boss.enrageAfterTurn ?? 0) + boss.enrageEvery * (boss.enrageSteps + 1);
}

/** Compounded ATK growth after `steps` enrage steps, as a whole percentage. */
function enragePercent(steps: number): number {
  return Math.round(((1 + BOSS_ENRAGE_STEP) ** steps - 1) * 100);
}

/**
 * What a boss fight needs on screen beyond the pool bar (docs/design/BOSSES.md §4): what it
 * shrugs off, which gear the fight is in, how much of a hit its escort is taking, how close its
 * enrage is, and the moment a counting passive gives way.
 *
 * `standing` is how many of its adds are still on their feet — the HUD reads that off the same
 * view the plates do, so a Chorister falling changes the chip on the beat the sprite drops.
 */
export function BossChips({ boss, standing = 0 }: { boss: BossUnitView; standing?: number }) {
  const enraged = boss.enrageSteps > 0;
  const untilStep = Math.max(0, nextStepAt(boss) - boss.turnsTaken);
  const guard = boss.adds && standing > 0 ? boss.adds.percent : 0;
  return (
    <div className={styles.chips} data-testid="boss-chips">
      {boss.phaseCount > 1 ? (
        <Tooltip content={t('battle.boss.phaseHint')}>
          {/* The gear change is the fight's turning point, so the chip lands on it. */}
          <motion.span
            key={boss.phase}
            className={[styles.chip, styles.phase].join(' ')}
            initial={{ scale: 1.6, opacity: 0.2 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, ease: 'backOut' }}
            data-testid="boss-phase"
          >
            <Glyph glyph="glyph.cursed_eye" size={18} color="var(--rarity-legendary)" />
            <span className="num">{t('battle.boss.phase', { phase: boss.phase, of: boss.phaseCount })}</span>
          </motion.span>
        </Tooltip>
      ) : null}

      {guard > 0 ? (
        <Tooltip content={t('battle.boss.guardedHint', { count: standing, percent: guard })}>
          <span className={[styles.chip, styles.guarded].join(' ')} data-testid="boss-guarded">
            <Glyph glyph="glyph.shield_block" size={18} color="var(--rarity-epic)" />
            <span className="num">{t('battle.boss.guarded', { percent: guard })}</span>
          </span>
        </Tooltip>
      ) : null}

      {boss.immunities.length ? (
        <Tooltip
          content={t('battle.boss.unshakeableHint', {
            list: boss.immunities.map((id) => translate(STATUS_BY_ID[id].name)).join(', '),
          })}
        >
          <span className={styles.chip} data-testid="boss-unshakeable">
            <Glyph glyph="glyph.shield_block" size={18} color="var(--text-2)" />
            <span className="display">{t('battle.boss.unshakeable')}</span>
          </span>
        </Tooltip>
      ) : null}

      {boss.enrageAfterTurn !== null ? (
        <Tooltip
          content={t('battle.boss.enrageHint', {
            every: boss.enrageEvery,
            turn: boss.enrageAfterTurn,
            step: Math.round(BOSS_ENRAGE_STEP * 100),
          })}
        >
          <span className={[styles.chip, enraged ? styles.enraged : ''].join(' ')} data-testid="boss-enrage">
            <Glyph glyph="glyph.magic_flame" size={18} color={enraged ? 'var(--ember-3)' : 'var(--text-3)'} />
            <span className="num">
              {enraged
                ? t('battle.boss.enraged', {
                    steps: boss.enrageSteps,
                    percent: enragePercent(boss.enrageSteps),
                  })
                : t('battle.boss.enragesIn', { turns: untilStep })}
            </span>
          </span>
        </Tooltip>
      ) : null}

      {boss.brokenPassives.map((passiveId) => (
        <Tooltip key={passiveId} content={t('battle.boss.brokenHint')}>
          {/* The break is the fight's one puzzle solved, so the chip lands with a flash. */}
          <motion.span
            className={[styles.chip, styles.broken].join(' ')}
            initial={{ scale: 1.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.45, ease: 'backOut' }}
            data-testid="boss-broken"
          >
            <Glyph glyph="glyph.broken_shackle" size={18} color="var(--buff)" />
            <span className="display">
              {t('battle.boss.broken', { name: translate(`${passiveId}.name` as I18nKey) })}
            </span>
          </motion.span>
        </Tooltip>
      ))}
    </div>
  );
}
