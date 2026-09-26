import { playSfx } from '@audio/index';
import { ENERGY_REFILL_AMOUNT, ENERGY_REFILL_GEMS } from '@content/balance/energy';
import { TOWER_KEY_REFILL_AMOUNT, TOWER_KEY_REFILL_GEMS } from '@content/balance/tower';
import { CURRENCY_BY_ID } from '@content/currencies/index';
import type { CurrencyId } from '@content/currencies/types';
import type { PlaceId } from '@content/places/types';
import { formatAmount } from '@engine/economy/wallet';
import type { SaveGame } from '@engine/schema/save';
import { t, translate } from '@i18n/index';
import { selectActions } from '@state/selectors';
import { useGameStore } from '@state/store';
import { holdingOf, type Holding } from '@state/wallet';
import { TintedIcon } from '@ui/components/AssetImage/TintedIcon';
import { Button } from '@ui/components/Button/Button';
import { Panel } from '@ui/components/Frame/Panel';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { ScrollArea } from '@ui/components/ScrollArea/ScrollArea';
import { PLACES, placeDestination, placeOpen } from '@ui/places/places';
import { useGo } from '@ui/places/use-go';
import { heldLine, poolLine } from './wallet-view';
import styles from './WalletDetail.module.css';

export interface WalletDetailProps {
  currency: CurrencyId;
  save: SaveGame;
  now: number;
}

/**
 * One currency in full (docs/tech/UI_DESIGN.md §5.26): what it is and how much of it the chronicle
 * holds — out of the cap, for a pool, and when the next one comes back — then where it comes from
 * and what it is for, each place with the way to it. Energy and the Eternal Key also offer their
 * gem refill here.
 */
export function WalletDetail({ currency, save, now }: WalletDetailProps) {
  const def = CURRENCY_BY_ID[currency];
  const held = holdingOf(save, currency, now);
  const refill = REFILLS[currency];
  return (
    <Panel
      kind="ember-wide"
      padding={24}
      className={styles.detail}
      contentClassName={styles.body}
      data-testid="wallet-detail"
      data-currency={currency}
    >
      <header className={styles.head}>
        <span className={styles.art}>
          <TintedIcon asset={def.icon} tint={def.tint} size={76} />
        </span>
        <div className={styles.title}>
          <span className={`display ${styles.category}`}>{t(`wallet.category.${def.category}`)}</span>
          <h3 className={`display ${styles.name}`}>{translate(def.name)}</h3>
          <span className={`num ${styles.amount}`} data-testid="wallet-held">
            {heldLine(held)}
          </span>
        </div>
      </header>

      <p className={styles.description}>{translate(def.description)}</p>
      <PoolLine held={held} />
      {refill ? <Refill currency={currency} refill={refill} gems={save.wallet.gems} /> : null}

      <ScrollArea height="100%" fade className={styles.flowsScroll ?? ''}>
        <div className={styles.flows}>
          <FlowList title={t('wallet.sources')} places={def.sources} save={save} testId="wallet-sources" />
          <FlowList title={t('wallet.uses')} places={def.uses} save={save} testId="wallet-uses" />
        </div>
      </ScrollArea>
    </Panel>
  );
}

/** How a pool stands against its refill: the next point's countdown, or its reset. */
function PoolLine({ held }: { held: Holding }) {
  const line = poolLine(held);
  if (line === null) return null;
  return (
    <p className={styles.pool} data-testid="wallet-pool">
      <Glyph glyph="glyph.hourglass" size={18} className={styles.poolGlyph ?? ''} />
      <span className="num">{line}</span>
    </p>
  );
}

/** What one gem refill trades, and the words it says it in. */
interface RefillDef {
  gems: number;
  amount: number;
  trade: 'wallet.refill.trade' | 'wallet.refill.keysTrade';
  done: 'wallet.refill.done' | 'wallet.refill.keysDone';
  action: 'refillEnergy' | 'refillTowerKeys';
}

/**
 * The two pools gems can top up (ECONOMY.md §5, §5.2): energy, and the Eternal Key since the owner
 * settled Q49. Both as often as the gems allow and past the cap, because a refill is a grant.
 */
const REFILLS: Partial<Record<CurrencyId, RefillDef>> = {
  energy: {
    gems: ENERGY_REFILL_GEMS,
    amount: ENERGY_REFILL_AMOUNT,
    trade: 'wallet.refill.trade',
    done: 'wallet.refill.done',
    action: 'refillEnergy',
  },
  key_eternal: {
    gems: TOWER_KEY_REFILL_GEMS,
    amount: TOWER_KEY_REFILL_AMOUNT,
    trade: 'wallet.refill.keysTrade',
    done: 'wallet.refill.keysDone',
    action: 'refillTowerKeys',
  },
};

function Refill({ currency, refill, gems }: { currency: CurrencyId; refill: RefillDef; gems: number }) {
  const actions = useGameStore(selectActions);
  const short = gems < refill.gems;
  const buy = (): void => {
    const result = actions[refill.action]();
    if (!result.ok) {
      playSfx('ui.error');
      return;
    }
    playSfx('reward.small');
    actions.toast('reward', refill.done, { amount: refill.amount }, [{ currency, amount: refill.amount }]);
  };
  return (
    <div className={styles.refill} data-testid="wallet-refill">
      <div className={styles.trade}>
        <span className={styles.tradeSide}>
          <TintedIcon asset={CURRENCY_BY_ID.gems.icon} size={30} />
          <span className="num">{formatAmount(refill.gems)}</span>
        </span>
        <span className={styles.tradeArrow} aria-hidden="true" />
        <span className={styles.tradeSide}>
          <TintedIcon asset={CURRENCY_BY_ID[currency].icon} tint={CURRENCY_BY_ID[currency].tint} size={30} />
          <span className="num">{formatAmount(refill.amount)}</span>
        </span>
        <span className="sr-only">
          {translate(refill.trade, { gems: refill.gems, amount: refill.amount })}
        </span>
      </div>
      <div className={styles.refillPress}>
        <Button variant="primary" size="sm" disabled={short} onClick={buy} data-testid="wallet-refill-buy">
          {t('wallet.refill.buy')}
        </Button>
        <span className={styles.refillNote}>
          {short ? t('wallet.refill.short') : t('wallet.refill.note')}
        </span>
      </div>
    </div>
  );
}

interface FlowListProps {
  title: string;
  places: readonly PlaceId[];
  save: SaveGame;
  testId: string;
}

/**
 * The places a currency comes from, or goes to. A place with a way in is itself the press — the
 * whole row, with **Go** at its end — once the chronicle may enter it; the clock and the resets are
 * only named.
 */
function FlowList({ title, places, save, testId }: FlowListProps) {
  const go = useGo();
  return (
    <section className={styles.flow} data-testid={testId}>
      <h4 className={`display ${styles.flowTitle}`}>{title}</h4>
      <ul className={styles.places}>
        {places.map((place) => {
          const def = PLACES[place];
          const destination = placeDestination(place);
          const open = placeOpen(save, place);
          const body = (
            <>
              <Glyph glyph={def.glyph} size={20} className={styles.placeGlyph ?? ''} />
              <span className={styles.placeName}>{t(def.name)}</span>
            </>
          );
          return (
            <li key={place}>
              {destination && open ? (
                <button
                  type="button"
                  className={styles.place}
                  onMouseEnter={() => playSfx('ui.hover')}
                  onClick={() => {
                    playSfx('ui.open');
                    go(destination.way);
                  }}
                  aria-label={translate('place.go', { place: destination.to })}
                  data-testid={`wallet-go-${place}`}
                >
                  {body}
                  <span className={`display ${styles.goTag}`} aria-hidden="true">
                    {t('place.goShort')}
                  </span>
                </button>
              ) : (
                <span className={styles.place} data-open={open}>
                  {body}
                  {destination ? <span className={styles.lockedTag}>{t('common.locked')}</span> : null}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
