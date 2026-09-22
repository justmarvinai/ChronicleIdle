import { useState } from 'react';
import { playSfx } from '@audio/index';
import { CURRENCY_BY_ID } from '@content/currencies/index';
import { content } from '@content/registry';
import { formatDuration } from '@engine/time/clock';
import { formatAmount } from '@engine/economy/wallet';
import { t, translate } from '@i18n/index';
import { gemMarketView, goldMarketView, type GemEntryView, type GoldSlotView } from '@state/market';
import { selectActions, selectSave } from '@state/selectors';
import { useGameStore } from '@state/store';
import type { MarketTab } from '@state/ui-types';
import { AmbientLayer } from '@render/ambient/AmbientLayer';
import { Backdrop } from '@ui/components/Backdrop/Backdrop';
import { Button } from '@ui/components/Button/Button';
import { Panel } from '@ui/components/Frame/Panel';
import { RewardList } from '@ui/components/RewardList/RewardList';
import { ScrollArea } from '@ui/components/ScrollArea/ScrollArea';
import { Tabs } from '@ui/components/Tab/Tabs';
import { TintedIcon } from '@ui/components/AssetImage/TintedIcon';
import { TopBar } from '@ui/components/TopBar/TopBar';
import { useNow } from '@ui/hooks/useNow';
import { useSceneAudio } from '@ui/hooks/useSceneAudio';
import type { ScreenProps } from '@ui/router/screens';
import { RARITY_COLOR } from '@ui/styles/display-maps';
import { contentsLines, grantAmounts } from './market-view';
import styles from './MarketScreen.module.css';

/**
 * The Market (docs/tech/UI_DESIGN.md §5.25): two shelves that could not be less alike, behind two
 * tabs so the difference is the first thing a player meets.
 *
 * The Gold Market counts down to the turn of the hour; the Gem Market has no clock at all, which
 * is exactly the point of it.
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
  const gems = gemMarketView(save);

  return (
    <div className={styles.root} data-testid="screen-market">
      <Backdrop asset="bg.bg4" grade="rgba(14, 12, 20, 0.5)" parallax={8} />
      <AmbientLayer preset="interior" />
      <TopBar title={t('market.title')} onBack={() => actions.pop()} />

      <section className={styles.body}>
        <Tabs
          items={[
            { key: 'gold' as const, label: t('market.tab.gold'), testId: 'market-tab-gold' },
            { key: 'gems' as const, label: t('market.tab.gems'), testId: 'market-tab-gems' },
          ]}
          value={tab}
          onChange={setTab}
        />

        <div className={styles.head}>
          <p className={styles.blurb}>{t(tab === 'gold' ? 'market.gold.blurb' : 'market.gems.blurb')}</p>
          {tab === 'gold' ? (
            <p className={`num ${styles.rotates}`} data-testid="market-rotates">
              {t('market.rotates', { time: formatDuration(gold.rotatesIn) })}
            </p>
          ) : null}
        </div>

        <ScrollArea height={760} className={styles.scroll}>
          {tab === 'gold' ? (
            <div className={styles.stall} data-testid="market-stall">
              {gold.slots.map((slot) => (
                <StallSlot
                  key={slot.index}
                  slot={slot}
                  onBuy={(count) => {
                    const result = actions.buyFromStall(slot.index, count);
                    playSfx(result.ok ? 'reward.medium' : 'ui.error');
                  }}
                />
              ))}
            </div>
          ) : (
            <div className={styles.shelf} data-testid="market-shelf">
              {gems.map((row) => (
                <ShelfEntry
                  key={row.entry.id}
                  row={row}
                  onBuy={() => {
                    const result = actions.buyFromShelf(row.entry.id);
                    playSfx(result.ok ? 'reward.medium' : 'ui.error');
                  }}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </section>
    </div>
  );
}

/** One of the six things this hour's stall happens to carry. */
function StallSlot({ slot, onBuy }: { slot: GoldSlotView; onBuy: (count: number) => void }) {
  const def = CURRENCY_BY_ID[slot.currency];
  const soldOut = slot.left === 0;
  return (
    <Panel
      // A thin frame rather than the stone slab: six rows have to fit the shelf at once, and a
      // stall row is a row, not a plaque.
      kind="thin"
      padding={10}
      contentClassName={styles.slot}
      data-testid={`stall-slot-${slot.index}`}
    >
      <TintedIcon asset={def.icon} tint={def.tint} size={52} label={translate(def.name)} />
      <div className={styles.slotText}>
        <span className={styles.slotName}>{translate(def.name)}</span>
        <span className={`num ${styles.slotStock}`} data-testid={`stall-left-${slot.index}`}>
          {t('market.stock', { count: slot.left })}
        </span>
      </div>
      <div className={styles.slotBuy}>
        <span className={`num ${styles.price}`}>
          <TintedIcon asset={CURRENCY_BY_ID.gold.icon} size={18} label="" />
          {formatAmount(slot.unitGold)}
        </span>
        <Button
          variant="primary"
          size="sm"
          disabled={soldOut || slot.affordable === 0}
          onClick={() => onBuy(1)}
          data-testid={`stall-buy-${slot.index}`}
        >
          {soldOut ? t('market.sold') : slot.affordable === 0 ? t('market.cannotAfford') : t('market.buy')}
        </Button>
        {/* Buying the rest of a slot in one press is the difference between a shop and a chore. */}
        {!soldOut && slot.affordable > 1 ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onBuy(slot.affordable)}
            data-testid={`stall-buy-all-${slot.index}`}
          >
            {t('bag.count', { count: slot.affordable })}
          </Button>
        ) : null}
      </div>
    </Panel>
  );
}

/** One entry of the fixed shelf: a single that never runs out, or a bundle that goes once. */
function ShelfEntry({ row, onBuy }: { row: GemEntryView; onBuy: () => void }) {
  const { entry, taken, affordable } = row;
  const bundle = entry.once === true;
  const item =
    entry.contents.length === 1 && entry.contents[0]?.kind === 'consumable'
      ? content.consumableById(entry.contents[0].item)
      : undefined;
  return (
    <Panel
      kind={bundle ? 'ember-tall' : 'stone'}
      padding={16}
      contentClassName={styles.entry}
      data-testid={`shelf-${entry.id.replace('shelf.', '')}`}
      data-taken={taken}
    >
      <div className={styles.entryHead}>
        {item ? <TintedIcon asset={item.icon} tint={RARITY_COLOR[item.rarity]} size={44} label="" /> : null}
        <div>
          <span
            className={`display ${styles.entryName}`}
            style={item ? { color: RARITY_COLOR[item.rarity] } : undefined}
          >
            {translate(entry.name)}
          </span>
          {bundle ? (
            <span className={styles.bundleTag} data-testid={`shelf-bundle-${entry.id.replace('shelf.', '')}`}>
              {t('market.bundleOnce')}
            </span>
          ) : null}
        </div>
      </div>

      <p className={styles.entryBody}>{translate(entry.description)}</p>

      {/* A bundle has to show its parts, or its price means nothing. */}
      {bundle ? (
        <>
          <ul className={styles.contents}>
            {contentsLines(entry.contents).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          {grantAmounts(entry.contents).length > 0 ? (
            <RewardList amounts={grantAmounts(entry.contents)} size={22} />
          ) : null}
        </>
      ) : null}

      <div className={styles.entryFoot}>
        <span className={`num ${styles.price}`}>
          <TintedIcon asset={CURRENCY_BY_ID.gems.icon} size={20} label="" />
          {formatAmount(entry.price)}
        </span>
        <Button
          variant={bundle ? 'primary' : 'secondary'}
          size="md"
          disabled={taken || !affordable}
          onClick={onBuy}
          data-testid={`shelf-buy-${entry.id.replace('shelf.', '')}`}
        >
          {taken ? t('market.taken') : affordable ? t('market.buy') : t('market.cannotAfford')}
        </Button>
      </div>
    </Panel>
  );
}
