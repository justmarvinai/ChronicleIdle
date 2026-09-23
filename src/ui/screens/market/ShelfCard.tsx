import { useState, type CSSProperties } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CURRENCY_BY_ID } from '@content/currencies/index';
import type { ConsumableDef } from '@content/consumables/types';
import { formatAmount } from '@engine/economy/wallet';
import { t, translate } from '@i18n/index';
import type { GemEntryView } from '@state/market';
import { AssetImage } from '@ui/components/AssetImage/AssetImage';
import { TintedIcon } from '@ui/components/AssetImage/TintedIcon';
import { Button } from '@ui/components/Button/Button';
import { DecoFrame } from '@ui/components/Frame/DecoFrame';
import { prefersReducedMotion } from '@ui/hooks/reducedMotion';
import { RARITY_HEX } from '@ui/styles/display-maps';
import { consumableKind, shelfSlug } from './market-view';
import styles from './ShelfCard.module.css';

/** The frame an item on the gem shelf wears — the gear cards' own, in the item's rarity. */
const ITEM_FRAME = 10;

export interface ShelfCardProps {
  row: GemEntryView;
  item: ConsumableDef;
  /** How many of the item the Bag already holds. */
  held: number;
  /** Buys one; true when the purchase went through. */
  onBuy: () => boolean;
}

/**
 * One single on the gem shelf (docs/tech/UI_DESIGN.md §5.25): the item on a stand lit in its
 * rarity, its name in that colour over what kind of thing it is, exactly what using it does, how
 * many the Bag already holds, and the price. It never runs out, so it never wears a stock line.
 */
export function ShelfCard({ row, item, held, onBuy }: ShelfCardProps) {
  const slug = shelfSlug(row.entry);
  const color = RARITY_HEX[item.rarity];
  const name = translate(item.name);
  const [bought, setBought] = useState(0);
  const reduced = prefersReducedMotion();

  const buy = (): void => {
    if (onBuy()) setBought((last) => last + 1);
  };

  return (
    <DecoFrame
      frame={ITEM_FRAME}
      tint={color}
      thickness={12}
      className={styles.card}
      style={{ '--rarity': color } as CSSProperties}
      data-testid={`shelf-${slug}`}
      data-taken={false}
    >
      <div className={styles.top}>
        <div className={styles.stand}>
          <span className={styles.halo} aria-hidden="true" />
          <AssetImage asset={item.icon} width={80} height={80} alt={name} className={styles.icon} />
          <AnimatePresence>
            {bought > 0 && !reduced ? (
              <motion.span
                key={bought}
                className={`num ${styles.gain}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: [0, 1, 1, 0], y: -46 }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
                aria-hidden="true"
              >
                {t('market.gain', { count: 1 })}
              </motion.span>
            ) : null}
          </AnimatePresence>
        </div>
        <div className={styles.text}>
          <span className={`display ${styles.name}`}>{name}</span>
          <span className={`display ${styles.kind}`}>{consumableKind(item)}</span>
          <p className={styles.what}>{translate(item.description)}</p>
        </div>
      </div>

      <div className={styles.foot}>
        <span className={`num ${styles.held}`} data-testid={`shelf-held-${slug}`}>
          {held > 0 ? t('market.inBag', { count: held }) : null}
        </span>
        <span className={`num ${styles.price}`}>
          <TintedIcon asset={CURRENCY_BY_ID.gems.icon} size={22} label="" />
          {formatAmount(row.entry.price)}
        </span>
        <Button
          variant="primary"
          size="sm"
          disabled={!row.affordable}
          onClick={buy}
          data-testid={`shelf-buy-${slug}`}
        >
          {row.affordable ? t('market.buy') : t('market.cannotAfford')}
        </Button>
      </div>
    </DecoFrame>
  );
}
