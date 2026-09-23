import { useState } from 'react';
import { motion } from 'motion/react';
import { CURRENCY_BY_ID } from '@content/currencies/index';
import type { Grant } from '@content/grants';
import { content } from '@content/registry';
import { formatAmount } from '@engine/economy/wallet';
import { t, translate } from '@i18n/index';
import type { GemEntryView } from '@state/market';
import { AssetImage } from '@ui/components/AssetImage/AssetImage';
import { TintedIcon } from '@ui/components/AssetImage/TintedIcon';
import { Button } from '@ui/components/Button/Button';
import { Chip, CurrencyChip } from '@ui/components/Chip/Chip';
import { DecoFrame } from '@ui/components/Frame/DecoFrame';
import { prefersReducedMotion } from '@ui/hooks/reducedMotion';
import { bundleSaving, bundleWorth, shelfSlug } from './market-view';
import styles from './BundleCard.module.css';

/** A bundle's frame: the kit's knotted corners, in gold — a pack reads as a pack before a word. */
const BUNDLE_FRAME = 26;
const BUNDLE_TINT = '#e2b04e';
/** The same frame once the bundle is taken: still on the shelf, gone quiet. */
const TAKEN_TINT = '#6a6258';

export interface BundleCardProps {
  row: GemEntryView;
  /** Buys the bundle; true when the purchase went through. */
  onBuy: () => boolean;
}

/**
 * One of the gem shelf's bundles (docs/tech/UI_DESIGN.md §5.25, MARKET.md §2.2): its name and the
 * mark that it goes once per chronicle, what it is, everything it holds as marked chips, what those
 * parts would cost bought singly and what the bundle saves — then the price. Taken, it stays where
 * it was with a stamp across it, so a player can see what they already have.
 */
export function BundleCard({ row, onBuy }: BundleCardProps) {
  const { entry, taken, affordable } = row;
  const slug = shelfSlug(entry);
  const worth = bundleWorth(entry, content.gemShelf);
  const [stamped, setStamped] = useState(false);
  const reduced = prefersReducedMotion();

  const buy = (): void => {
    if (onBuy()) setStamped(true);
  };

  return (
    <DecoFrame
      frame={BUNDLE_FRAME}
      tint={taken ? TAKEN_TINT : BUNDLE_TINT}
      thickness={14}
      className={[styles.card, taken ? styles.taken : ''].join(' ')}
      data-testid={`shelf-${slug}`}
      data-taken={taken}
    >
      <div className={styles.head}>
        <span className={`display ${styles.name}`}>{translate(entry.name)}</span>
        <span className={`display ${styles.once}`} data-testid={`shelf-bundle-${slug}`}>
          {t('market.bundleOnce')}
        </span>
      </div>
      <p className={styles.what}>{translate(entry.description)}</p>

      {/* A bundle has to show its parts, or its price means nothing. */}
      <div className={styles.holds}>
        <span className={`display ${styles.holdsLabel}`}>{t('market.holds')}</span>
        <ul className={styles.contents}>
          {entry.contents.map((grant) => (
            <li key={grant.kind === 'currency' ? grant.currency : grant.item}>
              <GrantChip grant={grant} />
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.foot}>
        {worth !== null ? (
          <span className={styles.worth} data-testid={`shelf-worth-${slug}`}>
            <span className="num">{t('market.worth', { price: formatAmount(worth) })}</span>
            <span className={`display ${styles.saving}`}>
              {t('market.saving', { percent: bundleSaving(entry.price, worth) })}
            </span>
          </span>
        ) : (
          <span className={styles.worth} />
        )}
        <span className={`num ${styles.price}`}>
          <TintedIcon asset={CURRENCY_BY_ID.gems.icon} size={24} label="" />
          {formatAmount(entry.price)}
        </span>
        <Button
          variant="primary"
          size="md"
          disabled={taken || !affordable}
          onClick={buy}
          data-testid={`shelf-buy-${slug}`}
        >
          {taken ? t('market.taken') : affordable ? t('market.buy') : t('market.cannotAfford')}
        </Button>
      </div>

      {taken ? (
        <motion.span
          className={`display ${styles.stamp}`}
          aria-hidden="true"
          // Stamped as it is bought; a bundle taken before the screen opened is simply there.
          initial={stamped && !reduced ? { opacity: 0, scale: 1.8 } : false}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.28, ease: [0.3, 1.4, 0.5, 1] }}
        >
          {t('market.takenStamp')}
        </motion.span>
      ) : null}
    </DecoFrame>
  );
}

/** One thing a bundle holds, by its mark: an item from the Bag, or a currency with its amount. */
function GrantChip({ grant }: { grant: Grant }) {
  if (grant.kind === 'currency')
    return <CurrencyChip currency={grant.currency} value={formatAmount(grant.amount)} />;
  const item = content.consumableById(grant.item);
  if (!item) return null;
  return (
    <Chip
      icon={<AssetImage asset={item.icon} width={26} height={26} alt="" />}
      label={translate(item.name)}
      value={grant.count > 1 ? t('bag.count', { count: grant.count }) : undefined}
    />
  );
}
