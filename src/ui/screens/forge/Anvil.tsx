import { motion } from 'motion/react';
import type { GearSlot } from '@content/champions/types';
import type { CurrencyAmount } from '@content/currencies/types';
import type { GearSetDef } from '@content/sets/types';
import type { GearInstance } from '@engine/gear/instance';
import { t, translate } from '@i18n/index';
import { AssetImage } from '@ui/components/AssetImage/AssetImage';
import { Button } from '@ui/components/Button/Button';
import { CurrencyLabel } from '@ui/components/CurrencyLabel/CurrencyLabel';
import { FxSprite } from '@ui/components/FxSprite/FxSprite';
import { Panel } from '@ui/components/Frame/Panel';
import { GearCard } from '@ui/components/GearCard/GearCard';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { prefersReducedMotion } from '@ui/hooks/reducedMotion';
import { GearTooltip } from '@ui/gear/GearTooltip';
import { mainStatLine, pieceArtwork, setOf, slotLabel } from '@ui/gear/gear-view';
import { SLOT_GLYPH } from '@ui/styles/display-maps';
import { tierLabel, type CraftTier } from './forge-view';
import styles from './Anvil.module.css';

export interface AnvilProps {
  slot: GearSlot;
  tier: CraftTier;
  /** The set a Sigil names, if one does: the anvil shows that set's piece waiting to be struck. */
  named: GearSetDef | undefined;
  struck: GearInstance | null;
  /** Counts the strikes, so the hammer, the sparks and the burst play again on each. */
  strikes: number;
  cost: readonly CurrencyAmount[];
  held: (currency: string) => number;
  canPay: boolean;
  error: string | null;
  onStrike: () => void;
}

/** One hearth flame's frame, in stage pixels; five burn side by side, each at its own pace. */
const FLAME = 160;
const FLAME_PACES = [0.75, 1.05, 0.9, 1.15, 0.85] as const;
/** The strike's burst. */
const BURST = 260;

/**
 * The anvil (docs/tech/UI_DESIGN.md §5.11): the hearth burning under it, what the recipe will
 * strike standing on it as a silhouette — the named set's own piece, or the slot's mark — and,
 * once struck, the piece in its frame with its whole sheet beneath, the way the Armoury reads it.
 */
export function Anvil(props: AnvilProps) {
  const { slot, tier, named, struck, strikes } = props;
  const reduced = prefersReducedMotion();
  const set = struck ? setOf(struck) : undefined;
  return (
    <Panel kind="ember-tall" padding={16} className={styles.anvil} contentClassName={styles.content}>
      <div className={styles.stage}>
        <span className={styles.glow} aria-hidden="true" />
        <span className={styles.block} aria-hidden="true" />
        <span className={styles.flames} aria-hidden="true">
          {FLAME_PACES.map((pace, index) => (
            <FxSprite
              key={index}
              effect="fx.pixel.fire"
              size={FLAME}
              loop
              speed={pace}
              className={styles.flame}
            />
          ))}
        </span>
        {struck ? (
          <motion.div
            key={struck.instanceId}
            className={styles.piece}
            initial={reduced ? false : { scale: 0.6, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: reduced ? 0 : 0.3, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <GearCard
              rarity={struck.rarity}
              stars={struck.stars}
              level={struck.level}
              slot={struck.slot}
              {...pieceArtwork(struck)}
              mainStat={mainStatLine(struck)}
              setName={set ? translate(set.name) : struck.setId}
              size={128}
            />
          </motion.div>
        ) : (
          <div className={styles.ghost} aria-hidden="true">
            {named ? (
              <AssetImage asset={named.art[slot]} size={256} className={styles.ghostArt} />
            ) : (
              <Glyph glyph={SLOT_GLYPH[slot]} size={120} color="rgba(255, 196, 120, 0.4)" />
            )}
          </div>
        )}
        {/* The hammer falls on every strike; `key` restarts it. */}
        <motion.span
          key={`hammer-${strikes}`}
          className={styles.hammer}
          initial={reduced || strikes === 0 ? false : { rotate: -40, y: -30 }}
          animate={reduced || strikes === 0 ? {} : { rotate: [-40, 10, -40], y: [-30, 8, -30] }}
          transition={{ duration: 0.42, times: [0, 0.45, 1], ease: 'easeInOut' }}
          aria-hidden="true"
        >
          <Glyph glyph="glyph.hammer_hit" size={92} color="var(--gold-3)" />
        </motion.span>
        {strikes > 0 && !reduced ? (
          <FxSprite
            effect="fx.gamefx.fire_burst"
            size={BURST}
            playKey={strikes}
            speed={1.2}
            className={styles.burst}
          />
        ) : null}
      </div>

      {struck ? (
        <div className={styles.result} data-testid="craft-result">
          <GearTooltip piece={struck} />
        </div>
      ) : (
        <div className={styles.recipe}>
          <strong className={`display ${styles.recipeName}`}>{tierLabel(tier)}</strong>
          <span className={styles.recipeLine}>
            {named
              ? t('forge.craft.will.named', { set: translate(named.name), slot: slotLabel(slot) })
              : t('forge.craft.will.any', { slot: slotLabel(slot) })}
          </span>
        </div>
      )}

      <div className={styles.press}>
        <Button
          variant="primary"
          size="lg"
          disabled={!props.canPay}
          onClick={props.onStrike}
          data-testid="craft-strike"
          icon={<Glyph glyph="glyph.hammer_hit" size={26} color="var(--gold-3)" />}
        >
          {struck ? t('forge.craft.again') : t('forge.craft.strike')}
        </Button>
        <ul className={styles.cost} data-testid="craft-cost">
          {props.cost.map((entry) => (
            <li
              key={entry.currency}
              className={['num', props.held(entry.currency) < entry.amount ? styles.short : ''].join(' ')}
            >
              <CurrencyLabel currency={entry.currency} amount={entry.amount} size={22} />
            </li>
          ))}
        </ul>
        {props.error ? (
          <p className={styles.error} role="alert" data-testid="craft-error">
            {props.error}
          </p>
        ) : null}
      </div>
    </Panel>
  );
}
