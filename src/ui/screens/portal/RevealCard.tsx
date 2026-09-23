import { motion } from 'motion/react';
import type { AssetKey } from '@assets/manifest.generated';
import { RARITIES } from '@content/champions/types';
import { content } from '@content/registry';
import { t } from '@i18n/index';
import type { SummonedChampion } from '@state/summon';
import { AssetImage } from '@ui/components/AssetImage/AssetImage';
import { ChampionCard } from '@ui/components/ChampionCard/ChampionCard';
import { RARITY_HEX } from '@ui/styles/display-maps';
import styles from './RevealCard.module.css';

/** The rarities that are stamped under their card (SUMMONING.md §5.3). */
const STAMPED = RARITIES.indexOf('epic');

export interface RevealCardProps {
  pull: SummonedChampion;
  index: number;
  /** 192 px for a single pull, 128 px in the grid of ten. */
  size: 128 | 192;
  /** Turned over yet: a card of ten is dealt face down and turned in order. */
  faceUp: boolean;
  /** The press's best, marked under a grid of ten. */
  best: boolean;
  /** The shard the card came out of, on its back. */
  shardIcon: AssetKey;
  shardTint: string | null;
  shardGlow: string;
  /** Where the card starts from, relative to where it lands: the heart of the gate. */
  dealFrom: { x: number; y: number };
  /** Milliseconds after it lands that a single card's stars pop in. */
  starsPopAfter?: number;
  reduced: boolean;
}

/**
 * One card of a reveal: dealt out of the gate, face down, and turned over in its turn — a single
 * pull spins in whole. Its rarity is stamped under it (loudly for an Epic or better), then its
 * name and whether it is new (SUMMONING.md §5.3–§5.4).
 */
export function RevealCard({
  pull,
  index,
  size,
  faceUp,
  best,
  shardIcon,
  shardTint,
  shardGlow,
  dealFrom,
  starsPopAfter,
  reduced,
}: RevealCardProps) {
  const def = content.championById(pull.record.championId);
  if (!def) return null;
  const rarity = def.rarity;
  const loud = RARITIES.indexOf(rarity) >= STAMPED;
  const single = size === 192;
  const name = t(def.name as 'champ.anuria.name');
  const height = Math.round(size * 1.28);
  const entrance = reduced
    ? { initial: { opacity: 1 }, transition: { duration: 0 } }
    : single
      ? {
          initial: { scale: 0.3, opacity: 0, rotateY: -720 },
          transition: { duration: 0.75, ease: [0.16, 0.84, 0.3, 1] as const },
        }
      : {
          initial: { x: dealFrom.x, y: dealFrom.y, scale: 0.25, opacity: 0, rotate: -12 },
          transition: { duration: 0.42, delay: index * 0.045, ease: [0.2, 0.9, 0.3, 1] as const },
        };

  return (
    <div
      className={styles.cell}
      data-testid={`summon-card-${index}`}
      data-face={faceUp ? 'up' : 'down'}
      data-rarity={rarity}
      style={{ ['--rarity' as string]: RARITY_HEX[rarity], ['--shard' as string]: shardGlow }}
    >
      <motion.div
        className={styles.spinner}
        style={{ width: size, height, transformPerspective: 1000 }}
        initial={entrance.initial}
        animate={{ x: 0, y: 0, scale: 1, opacity: 1, rotate: 0, rotateY: 0 }}
        transition={entrance.transition}
      >
        <div className={styles.flipper} data-face={faceUp ? 'up' : 'down'}>
          <div className={styles.front}>
            {loud && faceUp ? <span className={styles.flare} aria-hidden="true" /> : null}
            <ChampionCard
              name={name}
              rarity={rarity}
              element={def.element}
              role={def.role}
              stars={pull.instance.stars}
              level={pull.instance.level}
              avatar={def.art.avatar}
              tint={def.art.tint}
              placeholder={def.art.placeholder}
              placeholderLabel={t('champions.placeholder')}
              size={size}
              testId={`summon-champion-${pull.instance.instanceId}`}
              {...(starsPopAfter !== undefined && faceUp ? { starsPopAfter } : {})}
            />
          </div>
          <div className={styles.back} aria-hidden="true">
            <span className={styles.sigil} />
            <AssetImage
              asset={shardIcon}
              size={size >= 192 ? 128 : 64}
              className={styles.backIcon}
              alt=""
              {...(shardTint ? { tint: shardTint } : {})}
            />
          </div>
        </div>
      </motion.div>
      <div className={styles.labels} data-shown={faceUp} data-single={single}>
        <span className={`display ${styles.stamp}`} data-loud={loud} data-single={single}>
          {t(`rarity.${rarity}`)}
        </span>
        <span className={styles.name}>{name}</span>
        <span className={styles.note}>
          {pull.copiesBefore === 0 ? (
            <strong className={styles.new}>{t('summon.reveal.new')}</strong>
          ) : single ? (
            t('summon.reveal.duplicate')
          ) : (
            // Ten to a grid: the short word, so every label keeps to one line.
            t('portal.history.duplicate')
          )}
        </span>
        {best ? <span className={styles.best}>{t('summon.result.best')}</span> : null}
      </div>
    </div>
  );
}
