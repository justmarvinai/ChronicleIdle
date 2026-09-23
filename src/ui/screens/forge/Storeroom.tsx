import { motion } from 'motion/react';
import { CURRENCY_BY_ID } from '@content/currencies/index';
import type { CurrencyAmount, CurrencyId } from '@content/currencies/types';
import { t, translate } from '@i18n/index';
import { selectWallet } from '@state/selectors';
import { useGameStore } from '@state/store';
import { TintedIcon } from '@ui/components/AssetImage/TintedIcon';
import { Panel } from '@ui/components/Frame/Panel';
import styles from './Storeroom.module.css';

/** What the Forge works with, in the order a recipe reads them: the three ores, the binder, then the rest. */
const FORGE_STORES: readonly CurrencyId[] = [
  'mat_scrap_iron',
  'mat_ember_alloy',
  'mat_starsteel',
  'mat_arcane_dust',
  'mat_refining_core',
  'mat_glyph_sigil',
  'gold',
];

export interface StoreroomProps {
  /** What the bench's press would spend: those rows light up, and turn red where the wallet is short. */
  spends?: readonly CurrencyAmount[];
  /** What it would return: those rows show the gain in green. */
  returns?: readonly CurrencyAmount[];
}

/**
 * The Forge's storeroom (docs/tech/UI_DESIGN.md §5.11): every material the three benches use, how
 * much is held, and — live, as the bench changes — what the next press would take or give back.
 */
export function Storeroom({ spends = [], returns = [] }: StoreroomProps) {
  const wallet = useGameStore(selectWallet);
  return (
    <Panel kind="ember-tall" padding={14} className={styles.store} data-testid="forge-store">
      <h3 className={`display ${styles.title}`}>{t('forge.store.title')}</h3>
      <ul className={styles.rows}>
        {FORGE_STORES.map((currency) => {
          const def = CURRENCY_BY_ID[currency];
          const held = wallet?.[currency] ?? 0;
          const spend = spends.find((entry) => entry.currency === currency)?.amount ?? 0;
          const gain = returns.find((entry) => entry.currency === currency)?.amount ?? 0;
          const short = spend > held;
          return (
            <li
              key={currency}
              className={[
                styles.row,
                spend > 0 ? styles.needed : '',
                short ? styles.short : '',
                gain > 0 ? styles.gained : '',
              ].join(' ')}
              data-testid={`forge-store-${currency}`}
            >
              <span className={styles.icon}>
                <TintedIcon asset={def.icon} tint={def.tint} size={40} />
              </span>
              <span className={styles.text}>
                <span className={`display ${styles.name}`}>{translate(def.name)}</span>
                <span className={styles.about}>{translate(def.description)}</span>
              </span>
              <span className={styles.numbers}>
                <span className={`num ${styles.held}`}>{held.toLocaleString('en-US')}</span>
                {spend > 0 ? (
                  <motion.span
                    key={`spend-${spend}`}
                    className={`num ${styles.delta} ${short ? styles.deltaShort : ''}`}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    −{spend.toLocaleString('en-US')}
                  </motion.span>
                ) : null}
                {gain > 0 ? (
                  <motion.span
                    key={`gain-${gain}`}
                    className={`num ${styles.delta} ${styles.deltaGain}`}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    +{gain.toLocaleString('en-US')}
                  </motion.span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
