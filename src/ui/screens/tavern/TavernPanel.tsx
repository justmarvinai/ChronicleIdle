import type { ReactNode } from 'react';
import type { GlyphKey } from '@assets/manifest.generated';
import { CURRENCY_BY_ID } from '@content/currencies/index';
import type { CurrencyAmount } from '@content/currencies/types';
import { t, translate, type I18nKey } from '@i18n/index';
import type { TavernTab } from '@state/ui-types';
import { Button } from '@ui/components/Button/Button';
import { CurrencyLabel } from '@ui/components/CurrencyLabel/CurrencyLabel';
import { Panel } from '@ui/components/Frame/Panel';
import { Tabs } from '@ui/components/Tab/Tabs';
import styles from './TavernPanel.module.css';

export interface TavernPanelProps {
  tab: TavernTab;
  onTab: (tab: TavernTab) => void;
  /** The open track's body: `LevelTrack`, `RankTrack` or `SkillsTrack`. */
  children: ReactNode;
  /** The press: what it costs, whether the wallet covers it, whether the table is ready. */
  cost: readonly CurrencyAmount[];
  /** The first currency the wallet is short of, if any. */
  short: CurrencyAmount['currency'] | null;
  ready: boolean;
  onUpgrade: () => void;
}

const TABS: readonly { key: TavernTab; labelKey: I18nKey; glyph: GlyphKey }[] = [
  { key: 'level', labelKey: 'tavern.tab.level', glyph: 'glyph.health_potion' },
  { key: 'rank', labelKey: 'tavern.tab.rank', glyph: 'glyph.shooting_stars' },
  { key: 'skills', labelKey: 'tavern.tab.skills', glyph: 'glyph.spell_book' },
];

/**
 * The Tavern's right column (docs/tech/UI_DESIGN.md §5.5): the three tracks as tabs, the open
 * track's reckoning, and — for a level or a rank — the cost and the Upgrade press at its foot.
 */
export function TavernPanel({ tab, onTab, children, cost, short, ready, onUpgrade }: TavernPanelProps) {
  return (
    <aside className={styles.panel} aria-label={t('tavern.title')}>
      <Tabs
        items={TABS.map((item) => ({
          key: item.key,
          label: t(item.labelKey),
          glyph: item.glyph,
          testId: `tavern-tab-${item.key}`,
        }))}
        value={tab}
        onChange={onTab}
        orientation="vertical"
        className={styles.tabs ?? ''}
      />

      <Panel kind="ember-tall" padding={18} className={styles.body}>
        {children}
      </Panel>

      {tab === 'skills' ? null : (
        <div className={styles.footer}>
          <div className={styles.cost} data-testid="tavern-cost">
            <span className={styles.costLabel}>{t('tavern.cost')}</span>
            {cost.length ? (
              <span className={styles.costList}>
                {cost.map((entry) => (
                  <CurrencyLabel
                    key={entry.currency}
                    currency={entry.currency}
                    amount={entry.amount}
                    size={24}
                    className={styles.costEntry}
                  />
                ))}
              </span>
            ) : (
              <span className={styles.costEntry}>—</span>
            )}
            {short ? (
              <span className={styles.short} data-testid="tavern-short">
                {t('tavern.short', { currency: translate(CURRENCY_BY_ID[short].name) })}
              </span>
            ) : null}
          </div>
          <Button
            variant="primary"
            size="lg"
            disabled={!ready || short !== null}
            onClick={onUpgrade}
            data-testid="tavern-upgrade"
          >
            {t('tavern.upgrade')}
          </Button>
        </div>
      )}
    </aside>
  );
}
