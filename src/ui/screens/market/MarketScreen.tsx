import { useState } from 'react';
import { playSfx } from '@audio/index';
import { GOLD_MARKET_ROTATION_MS } from '@content/balance/market';
import { CURRENCY_BY_ID } from '@content/currencies/index';
import { content } from '@content/registry';
import { marketHour } from '@engine/market/index';
import { formatDuration } from '@engine/time/clock';
import { t } from '@i18n/index';
import { gemMarketView, goldMarketView } from '@state/market';
import { selectActions, selectSave } from '@state/selectors';
import { useGameStore } from '@state/store';
import type { MarketTab } from '@state/ui-types';
import { AmbientLayer } from '@render/ambient/AmbientLayer';
import { TintedIcon } from '@ui/components/AssetImage/TintedIcon';
import { Backdrop } from '@ui/components/Backdrop/Backdrop';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { ScrollArea } from '@ui/components/ScrollArea/ScrollArea';
import { Tabs } from '@ui/components/Tab/Tabs';
import { TopBar } from '@ui/components/TopBar/TopBar';
import { useNow } from '@ui/hooks/useNow';
import { useSceneAudio } from '@ui/hooks/useSceneAudio';
import type { ScreenProps } from '@ui/router/screens';
import { BundleCard } from './BundleCard';
import { ShelfCard } from './ShelfCard';
import { StallCard } from './StallCard';
import styles from './MarketScreen.module.css';

/** The gem shelf's scroll height: its two sections read top to bottom under the tabs. */
const SHELF_HEIGHT = 812;

/**
 * The Market (docs/tech/UI_DESIGN.md §5.25): two shelves that could not be less alike, behind two
 * tabs so the difference is the first thing a player meets.
 *
 * The Gold Market is a stall of six wares that counts down to the turn of the hour; the Gem Market
 * is a shelf of things that never run out and four bundles that go once, and it has no clock at
 * all, which is exactly the point of it.
 */
export default function MarketScreen({ route }: ScreenProps) {
  const params = route as Extract<typeof route, { name: 'market' }>;
  const actions = useGameStore(selectActions);
  const save = useGameStore(selectSave);
  const now = useNow(1000);
  useSceneAudio('hub', 'interior');
  const [tab, setTab] = useState<MarketTab>(params.tab ?? 'gold');
  if (!save) return null;

  const gold = goldMarketView(save, now);
  const shelf = gemMarketView(save);
  const singles = shelf.filter((row) => row.entry.once !== true);
  const bundles = shelf.filter((row) => row.entry.once === true);
  // The stall's wares change with the hour, and a card keeps its chosen number only for its own.
  const hour = marketHour(now);

  const buyFromStall = (index: number, count: number): boolean => {
    const result = actions.buyFromStall(index, count);
    playSfx(result.ok ? 'reward.medium' : 'ui.error');
    return result.ok;
  };
  const buyFromShelf = (id: string): boolean => {
    const result = actions.buyFromShelf(id);
    playSfx(result.ok ? 'reward.medium' : 'ui.error');
    return result.ok;
  };

  return (
    <div className={styles.root} data-testid="screen-market">
      <Backdrop asset="bg.bg4" grade="rgba(14, 12, 20, 0.5)" parallax={8} />
      <AmbientLayer preset="interior" />
      <TopBar title={t('market.title')} onBack={() => actions.pop()} />

      <section className={styles.body}>
        <Tabs
          items={[
            {
              key: 'gold' as const,
              label: t('market.tab.gold'),
              icon: <TintedIcon asset={CURRENCY_BY_ID.gold.icon} size={30} label="" />,
              testId: 'market-tab-gold',
            },
            {
              key: 'gems' as const,
              label: t('market.tab.gems'),
              icon: <TintedIcon asset={CURRENCY_BY_ID.gems.icon} size={30} label="" />,
              testId: 'market-tab-gems',
            },
          ]}
          value={tab}
          onChange={setTab}
        />

        {tab === 'gold' ? (
          <>
            <div className={styles.head}>
              <p className={styles.blurb}>{t('market.gold.blurb')}</p>
              <StallClock rotatesIn={gold.rotatesIn} />
            </div>
            <div className={styles.stall} data-testid="market-stall">
              {gold.slots.map((slot) => (
                <StallCard
                  key={`${hour}-${slot.index}`}
                  slot={slot}
                  held={save.wallet[slot.currency] ?? 0}
                  onBuy={(count) => buyFromStall(slot.index, count)}
                />
              ))}
            </div>
          </>
        ) : (
          <>
            <div className={styles.head}>
              <p className={styles.blurb}>{t('market.gems.blurb')}</p>
            </div>
            <ScrollArea height={SHELF_HEIGHT} fade className={styles.scroll}>
              <div className={styles.shelf} data-testid="market-shelf">
                <SectionHead title={t('market.section.singles')} line={t('market.section.singlesLine')} />
                <div className={styles.singles}>
                  {singles.map((row) => {
                    const grant = row.entry.contents[0];
                    const item =
                      grant?.kind === 'consumable' ? content.consumableById(grant.item) : undefined;
                    return item ? (
                      <ShelfCard
                        key={row.entry.id}
                        row={row}
                        item={item}
                        held={save.bag[item.id] ?? 0}
                        onBuy={() => buyFromShelf(row.entry.id)}
                      />
                    ) : null;
                  })}
                </div>
                <SectionHead
                  title={t('market.section.bundles')}
                  line={t('market.section.bundlesLine', {
                    open: bundles.filter((row) => !row.taken).length,
                    total: bundles.length,
                  })}
                />
                <div className={styles.bundles}>
                  {bundles.map((row) => (
                    <BundleCard key={row.entry.id} row={row} onBuy={() => buyFromShelf(row.entry.id)} />
                  ))}
                </div>
              </div>
            </ScrollArea>
          </>
        )}
      </section>
    </div>
  );
}

/**
 * The turn of the hour as an instrument: an hourglass, the time left, and the hour draining away
 * under it — the stall's one piece of urgency, and the gem shelf's reason to have none.
 */
function StallClock({ rotatesIn }: { rotatesIn: number }) {
  const left = Math.max(0, Math.min(1, rotatesIn / GOLD_MARKET_ROTATION_MS));
  return (
    <div className={styles.clock}>
      <Glyph glyph="glyph.hourglass" size={28} color="var(--gold-2)" className={styles.glass} />
      <div className={styles.clockRead}>
        <span className={`num ${styles.rotates}`} data-testid="market-rotates">
          {t('market.rotates', { time: formatDuration(rotatesIn) })}
        </span>
        <span className={styles.clockBar} aria-hidden="true">
          <span style={{ width: `${left * 100}%` }} />
        </span>
      </div>
    </div>
  );
}

/** A heading over one part of the gem shelf, with a line saying what that part is. */
function SectionHead({ title, line }: { title: string; line: string }) {
  return (
    <div className={styles.section}>
      <h2 className={`display ${styles.sectionTitle}`}>{title}</h2>
      <span className={styles.sectionRule} aria-hidden="true" />
      <p className={styles.sectionLine}>{line}</p>
    </div>
  );
}
