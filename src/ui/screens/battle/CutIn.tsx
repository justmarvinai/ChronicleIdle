import { AnimatePresence, motion } from 'motion/react';
import { content } from '@content/registry';
import type { ChampionId } from '@content/champions/types';
import { translate } from '@i18n/index';
import { championAvatar } from '@ui/champions/art';
import styles from './BattleScreen.module.css';

export interface CutInState {
  unitDefId: string;
  abilityId: string;
  ms: number;
  key: number;
}

/** Ultimate cut-in (UI_DESIGN.md §6.6): avatar slides across a dark slash with the ability name. */
export function CutIn({ state }: { state: CutInState | null }) {
  const def = state ? content.championById(state.unitDefId as ChampionId) : undefined;
  const art = def ? championAvatar(def, 512) : null;
  const seconds = state ? state.ms / 1000 : 0.5;
  return (
    <AnimatePresence>
      {state && def && art ? (
        <motion.div
          key={state.key}
          className={styles.cutIn}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: Math.min(0.15, seconds * 0.3) }}
          aria-hidden="true"
          data-testid="cut-in"
        >
          <motion.div
            className={styles.cutInSlash}
            initial={{ x: -1400 }}
            animate={{ x: 0 }}
            exit={{ x: 1400 }}
            transition={{ duration: seconds * 0.5, ease: [0.2, 0.9, 0.2, 1] }}
          >
            <div className={styles.cutInArt} style={{ backgroundImage: `url("${art.url}")` }} />
            {art.tint ? (
              <div
                className={styles.cutInTint}
                style={{
                  backgroundColor: art.tint,
                  WebkitMaskImage: `url("${art.url}")`,
                  maskImage: `url("${art.url}")`,
                }}
              />
            ) : null}
            <div className={styles.cutInText}>
              <span className={`display ${styles.cutInName}`}>{translate(def.name)}</span>
              <span className={`display ${styles.cutInAbility}`}>{translate(`${state.abilityId}.name`)}</span>
            </div>
            <div className={styles.speedLines} />
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
