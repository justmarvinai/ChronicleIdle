import type { CSSProperties } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { ChampionId } from '@content/champions/types';
import { content } from '@content/registry';
import type { UnitView } from '@engine/battle/index';
import { t, translate } from '@i18n/index';
import { championAvatar } from '@ui/champions/art';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { prefersReducedMotion } from '@ui/hooks/reducedMotion';
import { ELEMENT_COLOR, ELEMENT_GLYPH } from '@ui/styles/display-maps';
import styles from './Hud.module.css';

export interface TurnBannerProps {
  /** Whose turn it is, or null between turns. */
  unit: UnitView | null;
  /** The player is being asked for this unit's move. */
  asking: boolean;
  /** Provoked: only the basic attack, and only on this enemy (BATTLE.md §5). */
  provokedBy: string | null;
  /** A boss's pool bar holds the top of the screen, so the banner steps down under it. */
  lowered: boolean;
}

/**
 * Whose turn it is, top centre (docs/tech/UI_DESIGN.md §5.9): a champion's face and name on gold
 * when the move is the player's, an enemy's element and name on ember when it is theirs. Each turn
 * slides in over the last, so a fight at speed still reads as a sequence of turns.
 */
export function TurnBanner({ unit, asking, provokedBy, lowered }: TurnBannerProps) {
  const reduced = prefersReducedMotion();
  const def = unit?.side === 'ally' ? content.championById(unit.defId as ChampionId) : undefined;
  const art = def ? championAvatar(def, 128) : null;
  return (
    <div className={[styles.turnBanner, lowered ? styles.lowered : ''].join(' ')} data-testid="turn-banner">
      <AnimatePresence mode="popLayout" initial={false}>
        {unit ? (
          <motion.div
            key={unit.id}
            className={[styles.turn, unit.side === 'ally' ? styles.turnAlly : styles.turnEnemy].join(' ')}
            initial={reduced ? false : { opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            {art ? (
              <span
                className={styles.turnFace}
                style={{ backgroundImage: `url("${art.url}")` }}
                aria-hidden="true"
              />
            ) : (
              <span
                className={styles.turnSigil}
                style={{ '--element': ELEMENT_COLOR[unit.element] } as CSSProperties}
                aria-hidden="true"
              >
                <Glyph glyph={ELEMENT_GLYPH[unit.element]} size={20} color="var(--text-1)" />
              </span>
            )}
            <span className={`display ${styles.turnText}`}>
              {unit.side === 'ally' || asking
                ? t('battle.yourTurn', { name: translate(unit.name) })
                : t('battle.enemyActs', { name: translate(unit.name) })}
            </span>
            {provokedBy ? (
              <span className={styles.provoked}>{t('battle.provoked', { name: provokedBy })}</span>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
