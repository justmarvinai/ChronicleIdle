import type { CSSProperties } from 'react';
import { motion } from 'motion/react';
import type { RosterEntry } from '@engine/champions/query';
import { levelCap } from '@engine/champions/stats';
import { t } from '@i18n/index';
import { championAvatar } from '@ui/champions/art';
import { DecoFrame } from '@ui/components/Frame/DecoFrame';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { SpriteView } from '@ui/components/SpriteView/SpriteView';
import { StarRow } from '@ui/components/StarRow/StarRow';
import { ELEMENT_COLOR, ELEMENT_GLYPH, RARITY_HEX, ROLE_GLYPH } from '@ui/styles/display-maps';
import { kitBorder } from '@ui/styles/kit';
import { KitStrip } from './KitStrip';
import { championName, elementLabel, rarityLabel, roleLabel } from './roster-view';
import styles from './ChampionHero.module.css';

/**
 * The idle sprite's scale. The models are 84–92 px cells, so 4 stands the figure about as tall as
 * a third of the portrait — a companion to the painting rather than a badge on it.
 */
const SPRITE_SCALE = 4;
/** A name this long steps down a size, so the longest in the roster still fits the painting's foot. */
const LONG_NAME = 18;

export interface ChampionHeroProps {
  entry: RosterEntry;
  /** Opens the Abilities tab; the kit strip under the portrait is a preview of it. */
  onAbility: () => void;
}

/**
 * The selected champion (docs/tech/UI_DESIGN.md §5.3): the portrait with its name, rarity, element,
 * role, stars and level set into the foot of the painting, the idle sprite stepping out of the
 * frame's corner onto a glow of its element, and the kit strip beneath.
 */
export function ChampionHero({ entry, onAbility }: ChampionHeroProps) {
  const { def, instance } = entry;
  const name = championName(def);
  const art = championAvatar(def, 512);
  const color = RARITY_HEX[def.rarity];
  const tone = {
    '--rarity': color,
    '--element': ELEMENT_COLOR[def.element],
  } as CSSProperties;
  return (
    <motion.section
      key={instance.instanceId}
      className={styles.hero}
      initial={{ opacity: 0, x: 18 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
      data-testid="champion-hero"
      aria-label={name}
    >
      <div className={styles.stage} style={tone}>
        <div className={styles.aura} aria-hidden="true" />
        <DecoFrame
          frame={def.rarity === 'mythic' ? 26 : def.rarity === 'legendary' ? 13 : 3}
          tint={color}
          thickness={18}
          className={styles.portraitFrame}
        >
          <div className={styles.portrait} style={{ backgroundImage: `url("${art.url}")` }}>
            {art.tint ? (
              <div
                className={styles.tint}
                style={{
                  backgroundColor: art.tint,
                  WebkitMaskImage: `url("${art.url}")`,
                  maskImage: `url("${art.url}")`,
                }}
                aria-hidden="true"
              />
            ) : null}
            <div className={styles.shade} />
            {def.rarity === 'legendary' || def.rarity === 'mythic' ? (
              <div className={styles.shimmer} aria-hidden="true" />
            ) : null}
            <span
              className={`display ${styles.ribbon}`}
              style={kitBorder('ui.dark_ember.banner_plain', 0.28)}
              data-testid="hero-rarity"
            >
              {rarityLabel(def.rarity)}
            </span>
            {art.placeholder ? (
              <div
                className={styles.placeholder}
                title={t('champions.placeholder.hint')}
                data-testid="hero-placeholder"
              >
                <Glyph glyph="glyph.burning_scroll" size={18} color="var(--gold-3)" />
                <span className="display">{t('champions.placeholder')}</span>
              </div>
            ) : null}
            <div className={styles.title}>
              <h2
                className={[`display ${styles.name}`, name.length >= LONG_NAME ? styles.long : ''].join(' ')}
                data-testid="hero-name"
              >
                {name}
              </h2>
              <div className={styles.tags}>
                <span className={styles.tag}>
                  <span className={`${styles.sigil} ${styles.sigilElement}`}>
                    <Glyph glyph={ELEMENT_GLYPH[def.element]} size={20} color="var(--text-1)" />
                  </span>
                  <span className={styles.elementName}>{elementLabel(def.element)}</span>
                </span>
                <span className={styles.tag}>
                  <span className={styles.sigil}>
                    <Glyph glyph={ROLE_GLYPH[def.role]} size={20} color="var(--gold-3)" />
                  </span>
                  <span>{roleLabel(def.role)}</span>
                </span>
              </div>
              <div className={styles.rank}>
                <StarRow stars={instance.stars} max={6} size={20} tone="rarity" tint={color} />
                <span className={`num ${styles.level}`} data-testid="hero-level">
                  {t('champions.level', { level: instance.level, cap: levelCap(instance.stars) })}
                </span>
              </div>
            </div>
          </div>
        </DecoFrame>
        <div className={styles.figure} aria-hidden="true">
          <span className={styles.ground} />
          <span className={styles.sprite}>
            <SpriteView model={def.art.model} scale={SPRITE_SCALE} facing="left" tint={def.art.tint} />
          </span>
        </div>
        <KitStrip def={def} instance={instance} onOpen={onAbility} className={styles.kit} />
      </div>
    </motion.section>
  );
}
