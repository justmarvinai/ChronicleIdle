import { useRef, type CSSProperties } from 'react';
import type { EncounterDef } from '@content/encounters/types';
import type { EnemyDef } from '@content/enemies/types';
import { scaledEnemyStats } from '@engine/battle/index';
import { formatAmount } from '@engine/economy/wallet';
import { t, translate } from '@i18n/index';
import { DecoFrame } from '@ui/components/Frame/DecoFrame';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { SpriteView } from '@ui/components/SpriteView/SpriteView';
import { useFitText } from '@ui/hooks/useFitText';
import { elementLabel, roleLabel } from '@ui/screens/champions/roster-view';
import { ELEMENT_COLOR, ELEMENT_GLYPH, ROLE_GLYPH } from '@ui/styles/display-maps';
import styles from './EnemyCard.module.css';

/** The frames enemies wear: a plain ember one, and a bolder one for the stand's boss. */
const ENEMY_FRAME = 16;
const ENEMY_TINT = '#8f3a2a';
const BOSS_FRAME = 19;
const BOSS_TINT = '#e0663f';
/** The widest frame an idle sprite is cut from, in source pixels (the models run 84–92). */
const MODEL_FRAME = 92;
/** The largest scale a card draws its sprite at: past it the head meets the level plate. */
const SPRITE_MAX = 2;
/** Below this width a card drops the role's name and keeps its glyph. */
const NARROW = 200;
/** The name's sizes, largest first, so a long name narrows before it is cut. */
const NAME_SIZES = [18, 17, 16, 15, 14] as const;

export interface EnemyCardProps {
  def: EnemyDef;
  encounter: EncounterDef;
  statMult: number;
  /** Stage pixels: the team's seats use the same measures, so the two sides line up. */
  width: number;
  height: number;
}

/**
 * One enemy of the wave on show (docs/tech/UI_DESIGN.md §5.8): its idle loop on a patch of
 * lit ground, facing the team across the screen, then its name, element, role and level, and the
 * three numbers that decide a plan — health, attack and speed — at this encounter's scale.
 */
export function EnemyCard({ def, encounter, statMult, width, height }: EnemyCardProps) {
  const stats = scaledEnemyStats(def, encounter, statMult);
  const boss = Boolean(def.boss);
  const name = translate(def.name);
  const nameRef = useRef<HTMLSpanElement>(null);
  useFitText(nameRef, NAME_SIZES, name);
  // Whole quarter-steps keep the pixel art on an even grid. A frame's own margins are transparent,
  // so the frame may be as wide as the card.
  const scale = Math.min(SPRITE_MAX, Math.max(1, Math.floor((width / MODEL_FRAME) * 4) / 4));
  const tone = {
    '--seat-w': `${width}px`,
    '--seat-h': `${height}px`,
    '--element': ELEMENT_COLOR[def.element],
  } as CSSProperties;
  return (
    <li
      className={[styles.card, boss ? styles.boss : '', width < NARROW ? styles.narrow : ''].join(' ')}
      style={tone}
      data-enemy={def.id}
    >
      <DecoFrame
        frame={boss ? BOSS_FRAME : ENEMY_FRAME}
        tint={boss ? BOSS_TINT : ENEMY_TINT}
        thickness={12}
        className={styles.frame}
      >
        <span className={styles.ground} aria-hidden="true">
          <span className={styles.floor} />
          <SpriteView
            model={def.art.model}
            scale={scale}
            facing="left"
            tint={def.art.tint}
            desaturate={def.art.desaturate ?? false}
            className={styles.sprite}
          />
        </span>
        <span
          className={`num ${styles.level}`}
          title={t('battleSetup.enemyLevel', { level: encounter.enemyLevel })}
        >
          {encounter.enemyLevel}
        </span>
        <span className={styles.foot}>
          <span ref={nameRef} className={`display ${styles.name}`}>
            {name}
          </span>
          <span className={styles.meta}>
            <span className={styles.sigil} title={elementLabel(def.element)}>
              <Glyph glyph={ELEMENT_GLYPH[def.element]} size={15} color="var(--text-1)" />
            </span>
            <Glyph glyph={ROLE_GLYPH[def.role]} size={15} color="var(--text-2)" label={roleLabel(def.role)} />
            <span className={styles.role}>{roleLabel(def.role)}</span>
          </span>
          <span className={styles.stats}>
            <Stat label={t('champions.stat.hp')} value={formatAmount(stats.hp)} tone="hp" />
            <Stat label={t('champions.stat.atk')} value={formatAmount(stats.atk)} tone="atk" />
            <Stat label={t('champions.stat.spd')} value={formatAmount(stats.spd)} tone="spd" />
          </span>
        </span>
      </DecoFrame>
      {boss ? <span className={`display ${styles.ribbon}`}>{t('battle.boss')}</span> : null}
    </li>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: 'hp' | 'atk' | 'spd' }) {
  return (
    <span className={[styles.stat, styles[tone]].join(' ')}>
      <span className={styles.statLabel}>{label}</span>
      <span className={`num ${styles.statValue}`}>{value}</span>
    </span>
  );
}
