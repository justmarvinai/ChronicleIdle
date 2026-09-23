import { useRef, type CSSProperties, type ReactNode } from 'react';
import { motion } from 'motion/react';
import type { GlyphKey } from '@assets/manifest.generated';
import type { ChampionId } from '@content/champions/types';
import { content } from '@content/registry';
import type { UnitReport } from '@engine/battle/index';
import type { Roster } from '@engine/champions/instance';
import { canLevel, championXpToNext } from '@engine/champions/xp';
import { t, translate } from '@i18n/index';
import { championAvatar } from '@ui/champions/art';
import { DecoFrame } from '@ui/components/Frame/DecoFrame';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { prefersReducedMotion } from '@ui/hooks/reducedMotion';
import { useFitText } from '@ui/hooks/useFitText';
import { RARITY_HEX } from '@ui/styles/display-maps';
import { damageShares, mvpOf } from './result-view';
import styles from './ChampionReport.module.css';

/** The row of cards, in stage pixels: the cards share it and never grow past `CARD_MAX`. */
const ROW_WIDTH = 940;
const CARD_GAP = 20;
const CARD_MAX = 226;
/** When the first card lands after the crest, and the beat between one card and the next, in seconds. */
const CARD_DELAY = 0.2;
const CARD_STEP = 0.09;
const NAME_SIZES = [19, 18, 17, 16, 15] as const;

export interface ChampionReportProps {
  allies: readonly UnitReport[];
  roster: Roster;
  /** Champion XP each fielded champion was paid, when the fight paid any. */
  xpGained: number;
  /** The levels the fight's XP carried champions to, by instance. */
  levelUps: readonly { instanceId: string; level: number }[];
  /** What sits at the heading's other end, over the last card: the fight in numbers. */
  aside?: ReactNode;
}

/**
 * The team, one card each (docs/tech/UI_DESIGN.md §5.10): the painting, the level and a *Level up*
 * badge when the fight earned one, the XP bar where the champion now stands and what the fight
 * added, then what each did — damage dealt as a bar against the team's best, damage taken, healing
 * and kills. The top dealer wears the **MVP** banner; a champion who fell is greyed and says so.
 */
export function ChampionReport({ allies, roster, xpGained, levelUps, aside }: ChampionReportProps) {
  const mvp = mvpOf(allies);
  const shares = damageShares(allies);
  const n = Math.max(1, allies.length);
  const width = Math.min(CARD_MAX, Math.floor((ROW_WIDTH - CARD_GAP * (n - 1)) / n));
  return (
    <section className={styles.report} aria-label={t('battleResult.champions')} data-testid="result-report">
      {/* The heading runs exactly as wide as the cards, so it sits over the first and its aside
          over the last, however many took the field. */}
      <div className={styles.block} style={{ width: n * width + (n - 1) * CARD_GAP }}>
        <div className={styles.head}>
          <h2 className={`display ${styles.heading}`}>{t('battleResult.champions')}</h2>
          {aside}
        </div>
        <div className={styles.row} style={{ gap: CARD_GAP }}>
          {allies.map((unit, index) => (
            <ChampionCardReport
              key={unit.unitId}
              unit={unit}
              index={index}
              width={width}
              instance={unit.instanceId ? roster[unit.instanceId] : undefined}
              mvp={unit.unitId === mvp}
              share={shares.get(unit.unitId) ?? 0}
              xpGained={xpGained}
              levelUp={levelUps.find((up) => up.instanceId === unit.instanceId)?.level ?? null}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function ChampionCardReport({
  unit,
  index,
  width,
  instance,
  mvp,
  share,
  xpGained,
  levelUp,
}: {
  unit: UnitReport;
  index: number;
  width: number;
  instance: Roster[string] | undefined;
  mvp: boolean;
  share: number;
  xpGained: number;
  levelUp: number | null;
}) {
  const def = content.championById(unit.defId as ChampionId);
  const reduced = prefersReducedMotion();
  const nameRef = useRef<HTMLSpanElement>(null);
  const name = def ? translate(def.name) : unit.defId;
  useFitText(nameRef, NAME_SIZES, name);
  if (!def) return null;
  const art = championAvatar(def, 512);
  const level = instance?.level ?? 0;
  const capped = instance ? !canLevel(instance.level, instance.stars) : false;
  const progress = instance && !capped ? Math.min(1, instance.xp / championXpToNext(instance.level)) : 1;
  return (
    <article
      className={[styles.card, unit.alive ? '' : styles.fallen, mvp ? styles.mvp : ''].join(' ')}
      style={
        {
          '--card-w': `${width}px`,
          '--rarity': RARITY_HEX[def.rarity],
          animationDelay: `${CARD_DELAY + index * CARD_STEP}s`,
        } as CSSProperties
      }
      data-testid={`result-champion-${unit.unitId}`}
      data-mvp={mvp}
    >
      <DecoFrame
        frame={def.rarity === 'mythic' ? 26 : def.rarity === 'legendary' ? 13 : 3}
        tint={RARITY_HEX[def.rarity]}
        thickness={12}
        className={styles.frame}
      >
        <span className={styles.portrait} style={{ backgroundImage: `url("${art.url}")` }} aria-hidden="true">
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
        <span className={styles.shade} aria-hidden="true" />
        <span className={`num ${styles.level}`}>{level}</span>
        {levelUp !== null ? (
          <motion.span
            className={`display ${styles.levelUp}`}
            initial={reduced ? false : { opacity: 0, scale: 1.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              delay: CARD_DELAY + 0.5 + index * CARD_STEP,
              duration: 0.3,
              ease: [0.3, 1.5, 0.5, 1],
            }}
            data-testid={`result-levelup-${unit.unitId}`}
          >
            {t('battleResult.levelUpBadge')}
          </motion.span>
        ) : null}
        {!unit.alive ? (
          <span className={`display ${styles.fallenTag}`}>{t('battleResult.fallen')}</span>
        ) : null}
        <span className={styles.foot}>
          <span ref={nameRef} className={`display ${styles.name}`}>
            {name}
          </span>
          <span className={styles.xp}>
            <span className={styles.xpBar} aria-hidden="true">
              <span style={{ width: `${progress * 100}%` }} className={capped ? styles.xpFull : ''} />
            </span>
            <span className={`num ${styles.xpText}`}>
              {capped
                ? t('battleResult.maxLevel')
                : xpGained > 0
                  ? `+${xpGained.toLocaleString('en-US')} XP`
                  : ''}
            </span>
          </span>
        </span>
      </DecoFrame>
      {mvp ? <span className={`display ${styles.mvpRibbon}`}>{t('battleResult.mvp')}</span> : null}

      <dl className={styles.stats}>
        <Line
          glyph="glyph.crossed_swords"
          label={t('battleResult.damageDealt')}
          value={unit.damageDealt}
          share={share}
        />
        <Line glyph="glyph.shield_block" label={t('battleResult.damageTaken')} value={unit.damageTaken} />
        <Line glyph="glyph.health_potion" label={t('battleResult.healing')} value={unit.healingDone} />
        <Line glyph="glyph.flaming_skull" label={t('battleResult.kills')} value={unit.kills} />
      </dl>
    </article>
  );
}

function Line({
  glyph,
  label,
  value,
  share,
}: {
  glyph: GlyphKey;
  label: string;
  value: number;
  share?: number;
}) {
  return (
    <div className={styles.line}>
      <dt>
        <Glyph glyph={glyph} size={15} color="var(--text-3)" />
        {label}
      </dt>
      <dd className="num">{value.toLocaleString('en-US')}</dd>
      {share !== undefined ? (
        <span className={styles.share} aria-hidden="true">
          <span style={{ width: `${share * 100}%` }} />
        </span>
      ) : null}
    </div>
  );
}
