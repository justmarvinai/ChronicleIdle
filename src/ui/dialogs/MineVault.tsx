import type { CSSProperties } from 'react';
import { motion } from 'motion/react';
import { CURRENCY_BY_ID } from '@content/currencies/index';
import type { CurrencyAmount } from '@content/currencies/types';
import { formatDuration } from '@engine/time/clock';
import { t, translate } from '@i18n/index';
import type { MineView } from '@state/mine';
import { AssetImage } from '@ui/components/AssetImage/AssetImage';
import { TintedIcon } from '@ui/components/AssetImage/TintedIcon';
import { FillRing } from '@ui/components/FillRing/FillRing';
import { FxSprite } from '@ui/components/FxSprite/FxSprite';
import styles from './MineVault.module.css';

/** The vault's ring around the seam, in stage pixels. */
const VAULT = 300;
/** Where the seam catches the light on a full store, as % of the vault, with a size and a beat. */
const GLINTS = [
  { x: 36, y: 30, size: 28, delay: 0 },
  { x: 66, y: 40, size: 20, delay: 1.1 },
  { x: 58, y: 70, size: 16, delay: 1.9 },
  { x: 32, y: 62, size: 13, delay: 2.6 },
] as const;
/** How far apart the haul's chips rise out of the vault, in seconds. */
const STAGGER = 0.12;

/** What the last press took out of the store, and a key that restarts the burst for each one. */
export interface MineHaulShown {
  paid: CurrencyAmount[];
  key: number;
  wasFull: boolean;
}

/**
 * The Mine's store (docs/tech/UI_DESIGN.md §5.29): the seam in its vault with the store's fill
 * drawn round it, the whole gems it holds, the wait until it is full — and, the moment it is
 * emptied, the haul rising out of it. Everything is read off the view; the vault keeps no clock.
 */
export function MineVault({
  view,
  haul,
  reduced,
}: {
  view: MineView;
  haul: MineHaulShown | null;
  reduced: boolean;
}) {
  const { store, level } = view;
  const state = haul ? 'emptied' : store.full ? 'brimming' : 'digging';
  return (
    <div className={styles.stage}>
      <div className={styles.vault} data-state={state} data-testid="mine-vault">
        <span className={styles.glow} aria-hidden="true" />
        {state === 'brimming' && !reduced ? <span className={styles.rays} aria-hidden="true" /> : null}
        <FillRing
          fraction={store.fraction}
          size={VAULT - 24}
          thickness={12}
          color={store.full ? 'var(--gold-3)' : 'var(--mine)'}
          className={styles.ring ?? ''}
        />
        <motion.span
          className={styles.seam}
          animate={reduced || state !== 'brimming' ? {} : { scale: [1, 1.04, 1] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <AssetImage asset="spell.earth_geode_crystal" className={styles.seamArt} alt="" />
        </motion.span>
        {state === 'brimming' && !reduced
          ? GLINTS.map((glint) => (
              <span
                key={`${glint.x}-${glint.y}`}
                className={styles.glint}
                aria-hidden="true"
                style={
                  {
                    left: `${glint.x}%`,
                    top: `${glint.y}%`,
                    '--glint': `${glint.size}px`,
                    animationDelay: `${glint.delay}s`,
                  } as CSSProperties
                }
              />
            ))
          : null}
        {haul && !reduced ? (
          <FxSprite
            effect="fx.gamefx.ice_shatter"
            size={280}
            playKey={haul.key}
            blend="screen"
            className={styles.burst}
          />
        ) : null}
        <span className={`num ${styles.count}`} data-testid="mine-store">
          {store.gems}
          <small>/{level.storeGems}</small>
        </span>
        {haul ? (
          <ul className={styles.haul} key={haul.key} data-testid="mine-haul">
            {haul.paid.map((entry, index) => (
              <motion.li
                key={entry.currency}
                className={styles.chip}
                initial={reduced ? false : { opacity: 0, y: 18, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: index * STAGGER, type: 'spring', stiffness: 320, damping: 20 }}
              >
                <TintedIcon
                  asset={CURRENCY_BY_ID[entry.currency].icon}
                  tint={CURRENCY_BY_ID[entry.currency].tint}
                  size={30}
                />
                <span className="num">+{entry.amount.toLocaleString('en-US')}</span>
              </motion.li>
            ))}
          </ul>
        ) : null}
      </div>

      <p
        className={[styles.readout, store.full && !haul ? styles.readoutFull : ''].join(' ')}
        data-testid="mine-timer"
      >
        {store.full ? t('mine.full') : translate('mine.filling', { time: formatDuration(store.msToFull) })}
      </p>
      <p className={`num ${styles.subline}`}>
        {translate('mine.store', { gems: store.gems, capacity: level.storeGems })}
        {store.msToNextGem !== null ? (
          <>
            {' · '}
            {translate('mine.nextGem', { time: formatDuration(store.msToNextGem) })}
          </>
        ) : null}
      </p>
      {level.sigilsPerDay > 0 ? (
        <p className={`num ${styles.subline}`} data-testid="mine-sigils">
          {translate('mine.sigilsHeld', { amount: store.sigilsExact.toFixed(2) })}
        </p>
      ) : null}
      {haul?.wasFull ? (
        <p className={styles.overflow} data-testid="mine-overflow">
          {t('mine.overflow')}
        </p>
      ) : null}
    </div>
  );
}
