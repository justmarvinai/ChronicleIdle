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
import { championName, elementLabel, rarityLabel, roleLabel } from './roster-view';
import styles from './ChampionHero.module.css';

/** Large portrait of the selected champion with its idle sprite at the feet (UI_DESIGN.md §5.3). */
export function ChampionHero({ entry }: { entry: RosterEntry }) {
  const { def, instance } = entry;
  const art = championAvatar(def, 512);
  const color = RARITY_HEX[def.rarity];
  return (
    <motion.section
      key={instance.instanceId}
      className={styles.hero}
      initial={{ opacity: 0, x: 18 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
      data-testid="champion-hero"
      aria-label={championName(def)}
    >
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
          <div className={styles.sprite}>
            <SpriteView model={def.art.model} scale={3} facing="right" tint={def.art.tint} />
          </div>
        </div>
      </DecoFrame>
      <div className={styles.nameplate} style={kitBorder('ui.dark_ember.banner_plain', 0.32)}>
        <div className={styles.sigils}>
          <span
            className={styles.sigil}
            style={{
              background: `radial-gradient(circle, ${ELEMENT_COLOR[def.element]} 0%, rgba(11,10,13,0.9) 75%)`,
            }}
            title={elementLabel(def.element)}
          >
            <Glyph
              glyph={ELEMENT_GLYPH[def.element]}
              size={22}
              color="var(--text-1)"
              label={elementLabel(def.element)}
            />
          </span>
          <span className={styles.sigil} title={roleLabel(def.role)}>
            <Glyph glyph={ROLE_GLYPH[def.role]} size={22} color="var(--text-2)" label={roleLabel(def.role)} />
          </span>
        </div>
        <div className={styles.names}>
          <h2 className={`display ${styles.name}`} data-testid="hero-name">
            {championName(def)}
          </h2>
          <div className={styles.sub}>
            <span className={`display ${styles.rarity}`} style={{ color }}>
              {rarityLabel(def.rarity)}
            </span>
            <span className={styles.dot}>·</span>
            <span>{elementLabel(def.element)}</span>
            <span className={styles.dot}>·</span>
            <span>{roleLabel(def.role)}</span>
          </div>
        </div>
        <div className={styles.rank}>
          <StarRow stars={instance.stars} max={6} size={18} tone="rarity" tint={color} />
          <span className={`num ${styles.level}`} data-testid="hero-level">
            {t('champions.level', { level: instance.level, cap: levelCap(instance.stars) })}
          </span>
        </div>
      </div>
    </motion.section>
  );
}
