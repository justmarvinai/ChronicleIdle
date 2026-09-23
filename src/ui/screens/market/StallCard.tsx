import { useState, type CSSProperties } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { playSfx } from '@audio/index';
import { CURRENCY_BY_ID } from '@content/currencies/index';
import { formatAmount } from '@engine/economy/wallet';
import { t, translate } from '@i18n/index';
import type { GoldSlotView } from '@state/market';
import { TintedIcon } from '@ui/components/AssetImage/TintedIcon';
import { Button } from '@ui/components/Button/Button';
import { DecoFrame } from '@ui/components/Frame/DecoFrame';
import { prefersReducedMotion } from '@ui/hooks/reducedMotion';
import { isRareFind } from './market-view';
import styles from './StallCard.module.css';

/** The frame a stall's ordinary wares wear — the gear cards' own shape, in the market's bronze. */
const WARE_FRAME = 10;
const WARE_TINT = '#a07a42';
/** The frame a rare find wears, bolder and gold, so it is the first thing a skimming eye lands on. */
const RARE_FRAME = 19;
const RARE_TINT = '#f2c85a';
/** The glow behind a ware whose icon carries no tint of its own. */
const PLAIN_GLOW = '#e8c15a';

export interface StallCardProps {
  slot: GoldSlotView;
  /** How many of the slot's currency the chronicle already holds. */
  held: number;
  /** Buys `count` of the slot; true when the purchase went through. */
  onBuy: (count: number) => boolean;
}

/**
 * One slot of the hourly stall (docs/tech/UI_DESIGN.md §5.25): the ware on a lit stand, what it is
 * for and how many are already held, how much of the stock is left, the price of one — and a
 * quantity to buy, from one to all the purse can reach, with the total it comes to. A rare find
 * wears gold and says so; a sold-out slot is stamped.
 */
export function StallCard({ slot, held, onBuy }: StallCardProps) {
  const def = CURRENCY_BY_ID[slot.currency];
  const name = translate(def.name);
  const rare = isRareFind(slot.currency);
  const soldOut = slot.left === 0;
  const reachable = slot.affordable;
  const [wanted, setWanted] = useState(1);
  // The stock or the purse can shrink under the chosen number (a purchase elsewhere, the hour
  // turning), so the number bought is always read back inside what is reachable now.
  const count = Math.max(1, Math.min(wanted, reachable));
  const [gain, setGain] = useState<{ id: number; count: number } | null>(null);
  const reduced = prefersReducedMotion();
  const stacked = slot.stock > 1 && !soldOut;

  const buy = (): void => {
    if (!onBuy(count)) return;
    setGain((last) => ({ id: (last?.id ?? 0) + 1, count }));
    setWanted(1);
  };

  return (
    <DecoFrame
      frame={rare ? RARE_FRAME : WARE_FRAME}
      tint={rare ? RARE_TINT : WARE_TINT}
      thickness={12}
      className={[styles.card, rare ? styles.rare : '', soldOut ? styles.soldOut : ''].join(' ')}
      data-testid={`stall-slot-${slot.index}`}
      data-rare={rare}
      data-sold={soldOut}
    >
      {rare ? <span className={`display ${styles.ribbon}`}>{t('market.rareFind')}</span> : null}

      <div className={styles.top}>
        <div className={styles.stand} style={{ '--glow': def.tint ?? PLAIN_GLOW } as CSSProperties}>
          <span className={styles.halo} aria-hidden="true" />
          <TintedIcon asset={def.icon} tint={def.tint} size={116} label={name} className={styles.icon} />
          <AnimatePresence>
            {gain && !reduced ? (
              <motion.span
                key={gain.id}
                className={`num ${styles.gain}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: [0, 1, 1, 0], y: -52 }}
                transition={{ duration: 1.3, ease: 'easeOut' }}
                onAnimationComplete={() => setGain(null)}
                aria-hidden="true"
              >
                {t('market.gain', { count: gain.count })}
              </motion.span>
            ) : null}
          </AnimatePresence>
        </div>
        <div className={styles.text}>
          <span className={`display ${styles.name}`}>{name}</span>
          <span className={styles.what}>{translate(def.description)}</span>
          <span className={`num ${styles.held}`} data-testid={`stall-held-${slot.index}`}>
            {t('market.held', { count: formatAmount(held) })}
          </span>
        </div>
      </div>

      <div className={styles.stock}>
        <span className={styles.stockBar} aria-hidden="true">
          <span style={{ width: `${(slot.left / Math.max(1, slot.stock)) * 100}%` }} />
        </span>
        <span className={`num ${styles.left}`} data-testid={`stall-left-${slot.index}`}>
          {t('market.stock', { count: slot.left })}
        </span>
        <span
          className={`num ${styles.price}`}
          data-testid={`stall-price-${slot.index}`}
          // The dearest rows print abbreviated (260,000 reads as "260K"), so the figure rides along.
          data-gold={slot.unitGold}
        >
          <TintedIcon asset={CURRENCY_BY_ID.gold.icon} size={20} label="" />
          {formatAmount(slot.unitGold)}
          <span className={styles.each}>{t('market.each')}</span>
        </span>
      </div>

      <div className={styles.buy}>
        {stacked ? (
          <Quantity
            index={slot.index}
            value={count}
            max={reachable}
            onChange={(next) => setWanted(Math.max(1, Math.min(next, reachable)))}
          />
        ) : (
          <span />
        )}
        <div className={styles.checkout}>
          {stacked && reachable > 0 ? (
            <span className={`num ${styles.total}`} data-testid={`stall-total-${slot.index}`}>
              <TintedIcon asset={CURRENCY_BY_ID.gold.icon} size={18} label="" />
              {formatAmount(slot.unitGold * count)}
            </span>
          ) : null}
          <Button
            variant="primary"
            size="sm"
            disabled={soldOut || reachable === 0}
            onClick={buy}
            data-testid={`stall-buy-${slot.index}`}
          >
            {soldOut ? t('market.sold') : reachable === 0 ? t('market.cannotAfford') : t('market.buy')}
          </Button>
        </div>
      </div>

      {soldOut ? (
        <span className={`display ${styles.stamp}`} aria-hidden="true">
          {t('market.sold')}
        </span>
      ) : null}
    </DecoFrame>
  );
}

/** How many of a stacked slot to buy: one fewer, one more, or all the purse can reach. */
function Quantity({
  index,
  value,
  max,
  onChange,
}: {
  index: number;
  value: number;
  max: number;
  onChange: (next: number) => void;
}) {
  const step = (next: number, sound: 'ui.tab' | 'ui.cancel'): void => {
    playSfx(sound);
    onChange(next);
  };
  return (
    <div className={styles.quantity} role="group" aria-label={t('market.quantity')}>
      <button
        type="button"
        className={styles.step}
        aria-label={t('market.less')}
        disabled={value <= 1}
        onClick={() => step(value - 1, 'ui.cancel')}
        data-testid={`stall-less-${index}`}
      >
        −
      </button>
      <span className={`num ${styles.count}`} data-testid={`stall-qty-${index}`}>
        {value}
      </span>
      <button
        type="button"
        className={styles.step}
        aria-label={t('market.more')}
        disabled={value >= max}
        onClick={() => step(value + 1, 'ui.tab')}
        data-testid={`stall-more-${index}`}
      >
        +
      </button>
      <button
        type="button"
        className={`display ${styles.max}`}
        disabled={value >= max}
        onClick={() => step(max, 'ui.tab')}
        data-testid={`stall-max-${index}`}
      >
        {t('market.max')}
      </button>
    </div>
  );
}
