import type { CSSProperties } from 'react';
import { motion } from 'motion/react';
import { imageUrl } from '@assets/manifest';
import { CURRENCY_BY_ID } from '@content/currencies/index';
import { formatAmount } from '@engine/economy/wallet';
import type { EnemyDef } from '@content/enemies/types';
import { t, translate } from '@i18n/index';
import type { BreweryHallView, BreweryStageView } from '@state/brewery';
import { TintedIcon } from '@ui/components/AssetImage/TintedIcon';
import { Button } from '@ui/components/Button/Button';
import { DecoFrame } from '@ui/components/Frame/DecoFrame';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { SpriteView } from '@ui/components/SpriteView/SpriteView';
import { prefersReducedMotion } from '@ui/hooks/reducedMotion';
import { CARD_FRAME, CARD_TINT, ELEMENT_COLOR } from '@ui/styles/display-maps';
import {
  formation,
  powerStanding,
  stageBackdrop,
  stageHolder,
  tierKey,
  type StageGuards,
} from './brewery-view';
import styles from './StageCard.module.css';

/** The card cut of a backdrop (`tools/assets/steps/backdrops.ts`). */
const CARD_ART = 640;
/**
 * The guards' scales, in whole quarter-steps so the pixel art stays on its grid: the front row at
 * 1.25, the row behind it smaller, and a captain larger than either, so stage 5 reads as someone's
 * hall.
 */
const FRONT_SCALE = 1.25;
const BACK_SCALE = 1;
const CAPTAIN_SCALE = 1.75;
/** A cleared stage's frame: the kit's plain one in a bronze that is neither next nor shut. */
const CLEARED_TINT = '#8c6a3a';

export interface StageCardProps {
  hall: BreweryHallView;
  stage: BreweryStageView;
  index: number;
  guards: StageGuards | null;
  /** The roster's strongest three, the ruler a stage's power is read against. */
  teamPower: number;
  runsLeft: number;
  onEnter: (stage: BreweryStageView) => void;
}

/**
 * One stage of the descent (docs/tech/UI_DESIGN.md §5.23): the place it is cut under, its number and
 * what it is pitched at, the guards who hold it standing on its floor, their power against the
 * roster's best three, what a clear pays — big, because the brews are the point — and the press.
 */
export function StageCard({ hall, stage, index, guards, teamPower, runsLeft, onEnter }: StageCardProps) {
  const { state } = stage;
  const def = stage.stage;
  const brew = CURRENCY_BY_ID[hall.def.brew];
  const locked = state === 'locked';
  const canRun = hall.open && !locked && runsLeft > 0;
  const holder = stageHolder(def);
  const reduced = prefersReducedMotion();
  const standing = guards ? powerStanding(teamPower, guards.power) : null;
  const rows = formation(guards?.guards ?? []);
  const tone = {
    '--el': ELEMENT_COLOR[hall.def.element],
    '--art': `url("${imageUrl(stageBackdrop(def), CARD_ART)}")`,
  } as CSSProperties;
  const frame = state === 'next' ? CARD_FRAME.unlocked : CARD_FRAME.locked;
  const tint = state === 'next' ? CARD_TINT.unlocked : state === 'cleared' ? CLEARED_TINT : CARD_TINT.locked;

  return (
    <motion.li
      className={styles.cell}
      initial={reduced ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: reduced ? 0 : index * 0.06, duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <DecoFrame
        frame={frame}
        tint={tint}
        thickness={12}
        className={styles.card}
        style={tone}
        data-state={state}
        data-testid={`brewery-stage-${hall.def.element}-${def.number}`}
      >
        <div className={styles.head}>
          <span className={styles.art} aria-hidden="true" />
          <span className={`num ${styles.number}`}>{def.number}</span>
          <span className={styles.titles}>
            <span className={`display ${styles.tier}`}>{t(tierKey(def.number))}</span>
            {holder ? (
              <span className={styles.holder}>{t('brewery.heldBy', { faction: translate(holder) })}</span>
            ) : null}
          </span>
          <span className={styles.state} data-state={state}>
            {state === 'cleared' ? (
              <>
                <Glyph glyph="glyph.trophy_cup" size={14} color="var(--gold-3)" />
                {t('brewery.cleared')}
              </>
            ) : state === 'next' ? (
              t('brewery.next')
            ) : (
              <Glyph
                glyph="glyph.broken_shackle"
                size={16}
                color="var(--text-2)"
                label={t('brewery.locked', { stage: def.number - 1 })}
              />
            )}
          </span>
        </div>

        <div className={styles.floor} data-led={def.boss} aria-hidden="true">
          <span className={styles.ground} />
          <span className={styles.back}>
            {rows.back.map(({ def: enemy }, slot) => (
              <Guard key={`${enemy.id}-${slot}`} enemy={enemy} scale={BACK_SCALE} />
            ))}
          </span>
          <span className={styles.front}>
            {rows.front.map(({ def: enemy }, slot) => (
              <Guard
                key={`${enemy.id}-${slot}`}
                enemy={enemy}
                scale={enemy.boss ? CAPTAIN_SCALE : FRONT_SCALE}
              />
            ))}
          </span>
        </div>

        <div className={styles.facts}>
          <span className={styles.fact}>
            {def.boss ? <Glyph glyph="glyph.flaming_skull" size={16} color="var(--ember-3)" /> : null}
            {def.boss
              ? t('brewery.guardsBoss', { count: def.guards - 1, level: def.enemyLevel })
              : t('brewery.guards', { count: def.guards, level: def.enemyLevel })}
          </span>
          <span className={styles.fact}>
            <Glyph glyph="glyph.hourglass" size={15} color="var(--text-3)" />
            {t('brewery.limit', { count: def.turnLimit })}
          </span>
        </div>

        {guards && standing ? (
          <div className={styles.power} data-standing={standing}>
            <span className={styles.powerRow}>
              <span className={styles.powerLabel}>
                <Glyph glyph="glyph.crossed_swords" size={15} color="var(--text-2)" />
                {t('brewery.power')}
              </span>
              <span className={`num ${styles.powerValue}`}>{formatAmount(guards.power)}</span>
            </span>
            <span className={styles.standing}>{t(`brewery.standing.${standing}`)}</span>
          </div>
        ) : null}

        <div className={styles.pay} data-testid={`brewery-pay-${hall.def.element}-${def.number}`}>
          <span className={styles.payLabel}>{t('brewery.pays')}</span>
          <span className={styles.payValue}>
            <TintedIcon asset={brew.icon} tint={brew.tint} size={46} label={translate(brew.name)} />
            <span className={`num ${styles.payAmount}`}>×{def.brews}</span>
          </span>
        </div>

        <div className={styles.foot}>
          {locked ? (
            <p className={styles.lockedLine}>{t('brewery.locked', { stage: def.number - 1 })}</p>
          ) : (
            <Button
              variant={state === 'next' ? 'primary' : 'secondary'}
              size="md"
              className={styles.enter}
              disabled={!canRun}
              onClick={() => onEnter(stage)}
              data-testid={`brewery-enter-${hall.def.element}-${def.number}`}
            >
              {t('brewery.enter')}
            </Button>
          )}
        </div>
      </DecoFrame>
    </motion.li>
  );
}

/** One guard on the card's floor, facing the player across it. */
function Guard({ enemy, scale }: { enemy: EnemyDef; scale: number }) {
  return (
    <span className={styles.guard} data-captain={Boolean(enemy.boss)}>
      <SpriteView
        model={enemy.art.model}
        scale={scale}
        facing="left"
        tint={enemy.art.tint}
        desaturate={enemy.art.desaturate ?? false}
      />
    </span>
  );
}
