import type { CSSProperties } from 'react';
import { motion } from 'motion/react';
import type { ChampionId } from '@content/champions/types';
import { content } from '@content/registry';
import type { Roster } from '@engine/champions/instance';
import { canLevel, championXpToNext } from '@engine/champions/xp';
import { t, translate } from '@i18n/index';
import type { ChampionLevelUp } from '@state/campaign';
import { championAvatar } from '@ui/champions/art';
import { DecoFrame } from '@ui/components/Frame/DecoFrame';
import { RARITY_HEX } from '@ui/styles/display-maps';
import styles from './InstantTeam.module.css';

/** When the first card lands after the ledger starts counting, and the beat between cards, in seconds. */
const CARD_DELAY = 0.15;
const CARD_STEP = 0.08;

export interface InstantTeamProps {
  team: readonly string[];
  roster: Roster;
  /** The champion XP each of them took over the batch. */
  xp: number;
  levelUps: readonly ChampionLevelUp[];
  reduced: boolean;
}

/**
 * The team an instant clear sent (docs/tech/UI_DESIGN.md §5.30): each champion framed in their
 * rarity, the level they stand at now and the bar towards the next, what the batch paid them — and
 * a *Level up* badge with the levels climbed when it carried them past one.
 */
export function InstantTeam({ team, roster, xp, levelUps, reduced }: InstantTeamProps) {
  return (
    <section className={styles.team} data-testid="instant-team">
      <h3 className={`display ${styles.heading}`}>{t('instant.team')}</h3>
      <p className={styles.hint}>{t('instant.teamHint')}</p>
      <ul className={styles.cards}>
        {team.map((instanceId, index) => {
          const instance = roster[instanceId];
          const def = instance ? content.championById(instance.defId as ChampionId) : undefined;
          if (!instance || !def) return null;
          const art = championAvatar(def, 256);
          const capped = !canLevel(instance.level, instance.stars);
          const progress = capped ? 1 : Math.min(1, instance.xp / championXpToNext(instance.level));
          const climbed = levelUps.find((up) => up.instanceId === instanceId)?.levelsGained ?? 0;
          return (
            <li
              key={instanceId}
              style={{ '--rarity': RARITY_HEX[def.rarity] } as CSSProperties}
              data-testid={`instant-champion-${instanceId}`}
            >
              <motion.div
                className={styles.card}
                initial={reduced ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: CARD_DELAY + index * CARD_STEP,
                  type: 'spring',
                  stiffness: 300,
                  damping: 24,
                }}
              >
                <DecoFrame frame={3} tint={RARITY_HEX[def.rarity]} thickness={10} className={styles.frame}>
                  <span
                    className={styles.portrait}
                    style={{ backgroundImage: `url("${art.url}")` }}
                    aria-hidden="true"
                  >
                    {art.tint ? (
                      <span
                        className={styles.tint}
                        style={{
                          backgroundColor: art.tint,
                          WebkitMaskImage: `url("${art.url}")`,
                          maskImage: `url("${art.url}")`,
                        }}
                      />
                    ) : null}
                  </span>
                  <span className={`num ${styles.level}`}>{instance.level}</span>
                  {climbed > 0 ? (
                    <span
                      className={`display ${styles.levelUp}`}
                      data-testid={`instant-levelup-${instanceId}`}
                    >
                      {climbed > 1 ? t('instant.levels', { count: climbed }) : t('instant.levelUp')}
                    </span>
                  ) : null}
                </DecoFrame>
                <span className={`display ${styles.name}`}>{translate(def.name)}</span>
                <span className={styles.bar} aria-hidden="true">
                  <span style={{ width: `${progress * 100}%` }} className={capped ? styles.full : ''} />
                </span>
                <span className={`num ${styles.xp}`}>
                  {capped ? t('instant.maxLevel') : t('instant.xp', { amount: xp.toLocaleString('en-US') })}
                </span>
              </motion.div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
