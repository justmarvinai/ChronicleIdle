import type { CSSProperties } from 'react';
import { motion } from 'motion/react';
import type { ChampionDef } from '@content/champions/types';
import type { ChampionInstance } from '@engine/champions/instance';
import { levelCap } from '@engine/champions/stats';
import { t, translate } from '@i18n/index';
import { championAvatar } from '@ui/champions/art';
import { DecoFrame } from '@ui/components/Frame/DecoFrame';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { StarRow } from '@ui/components/StarRow/StarRow';
import { prefersReducedMotion } from '@ui/hooks/reducedMotion';
import { ELEMENT_COLOR, ELEMENT_GLYPH, RARITY_HEX } from '@ui/styles/display-maps';
import { kitBorder } from '@ui/styles/kit';
import { elementLabel, rarityLabel } from '@ui/screens/champions/roster-view';
import styles from './TavernHero.module.css';

export interface TavernHeroProps {
  def: ChampionDef;
  instance: ChampionInstance;
  /** The celebration after a press: a warm flare for a level, a gold one for a star. */
  flash: { id: number; kind: 'level' | 'rank' } | null;
}

/**
 * The champion on the stool (docs/tech/UI_DESIGN.md §5.5): the painting in a frame of its
 * rarity, the rarity on a banner at its head, and the name, element, stars and level set into
 * its foot — the same card the Champions hall shows, sized for the table around it.
 */
export function TavernHero({ def, instance, flash }: TavernHeroProps) {
  const art = championAvatar(def, 512);
  const color = RARITY_HEX[def.rarity];
  const tone = { '--rarity': color, '--element': ELEMENT_COLOR[def.element] } as CSSProperties;
  return (
    <div className={styles.hero} style={tone}>
      <div className={styles.aura} aria-hidden="true" />
      {flash && !prefersReducedMotion() ? (
        <motion.span
          key={flash.id}
          className={flash.kind === 'rank' ? styles.burstGold : styles.burst}
          aria-hidden="true"
          data-testid="tavern-flash"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: [0, 0.9, 0], scale: [0.6, 1.25, 1.5] }}
          transition={{ duration: 1.1, ease: 'easeOut' }}
        />
      ) : null}
      <DecoFrame
        frame={def.rarity === 'mythic' ? 26 : def.rarity === 'legendary' ? 13 : 3}
        tint={color}
        thickness={16}
        className={styles.frame}
      >
        <span
          className={styles.portrait}
          style={{ backgroundImage: `url("${art.url}")` }}
          data-testid="tavern-portrait"
          data-champion={def.id}
        >
          {art.tint ? (
            <span
              className={styles.tint}
              style={{
                backgroundColor: art.tint,
                WebkitMaskImage: `url("${art.url}")`,
                maskImage: `url("${art.url}")`,
              }}
              aria-hidden="true"
            />
          ) : null}
        </span>
        <span className={styles.shade} aria-hidden="true" />
        {def.rarity === 'legendary' || def.rarity === 'mythic' ? (
          <span className={styles.shimmer} aria-hidden="true" />
        ) : null}
        <span className={`display ${styles.ribbon}`} style={kitBorder('ui.dark_ember.banner_plain', 0.24)}>
          {rarityLabel(def.rarity)}
        </span>
        <span className={styles.title}>
          <span className={styles.nameRow}>
            <span className={styles.sigil} title={elementLabel(def.element)}>
              <Glyph glyph={ELEMENT_GLYPH[def.element]} size={20} color="var(--text-1)" />
            </span>
            <h2 className={`display ${styles.name}`}>{translate(def.name)}</h2>
          </span>
          <span className={styles.rank}>
            <StarRow stars={instance.stars} max={6} size={20} tone="rarity" tint={color} />
            <span className={styles.levelLine}>
              <span className={`num ${styles.levelNow}`} data-testid="tavern-champion-level">
                {t('common.level', { level: instance.level })}
              </span>
              <span className={`num ${styles.levelCap}`}>/ {levelCap(instance.stars)}</span>
            </span>
          </span>
        </span>
      </DecoFrame>
    </div>
  );
}
