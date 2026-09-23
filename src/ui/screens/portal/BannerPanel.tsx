import { playSfx } from '@audio/index';
import type { BannerDef } from '@content/banners/types';
import { content } from '@content/registry';
import { t, translate } from '@i18n/index';
import type { RotationView } from '@engine/summon/rotation';
import type { MercyView } from '@engine/summon/pity';
import { AssetImage } from '@ui/components/AssetImage/AssetImage';
import { Button } from '@ui/components/Button/Button';
import { Divider } from '@ui/components/Divider/Divider';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { Panel } from '@ui/components/Frame/Panel';
import { SpriteView } from '@ui/components/SpriteView/SpriteView';
import { Timer } from '@ui/components/Timer/Timer';
import { RARITY_HEX } from '@ui/styles/display-maps';
import { chanceBar, mercyBars, rateRows, type ShardView } from '@ui/summon/portal-view';
import styles from './BannerPanel.module.css';

export interface BannerPanelProps {
  banner: BannerDef;
  rotation: RotationView | null;
  shard: ShardView;
  mercy: readonly MercyView[];
  onRates: () => void;
  onHistory: () => void;
  onExchange: (count: number) => void;
  /** Gold/gems in the purse, for the Exchange's affordability. */
  held: (currency: string) => number;
}

/**
 * The right column: which gate is open, who it favours while the rotation holds, what the shard
 * owes the player, and the Exchange (docs/tech/UI_DESIGN.md §5.12).
 */
export function BannerPanel({
  banner,
  rotation,
  shard,
  mercy,
  onRates,
  onHistory,
  onExchange,
  held,
}: BannerPanelProps) {
  const bars = mercyBars(mercy);
  const price = shard.price;
  const canBuy = (count: number): boolean => price !== null && held(price.currency) >= price.amount * count;

  return (
    <Panel kind="stone" padding={18} contentClassName={styles.content}>
      <header className={styles.head}>
        <h2 className={`display ${styles.title}`}>{t(banner.name as 'banner.standard.name')}</h2>
        <p className={styles.blurb}>{t(banner.description as 'banner.standard.description')}</p>
      </header>

      {rotation ? (
        <section className={styles.rotation} data-testid="portal-rotation">
          <div className={styles.rotationHead}>
            <span className={`display ${styles.rotationName}`}>
              {translate('portal.featured.rotation', { index: rotation.number })}
            </span>
            <Timer
              endsAt={rotation.endsAt}
              label={t('portal.featured.timer')}
              className={styles.timer ?? ''}
            />
          </div>
          {rotation.primordial ? (
            <span className={styles.primordial}>
              <Glyph glyph="glyph.celestial_body" size={18} color="var(--r-mythic)" />
              {t('portal.featured.primordial')}
            </span>
          ) : null}
          <ul className={styles.featured}>
            {rotation.featured.map((id) => {
              const def = content.championById(id);
              if (!def) return null;
              return (
                <li key={id} className={styles.champion} data-testid={`portal-featured-${id}`}>
                  <div className={styles.sprite} style={{ ['--ring' as string]: RARITY_HEX[def.rarity] }}>
                    <SpriteView
                      model={def.art.model}
                      scale={1.5}
                      facing="right"
                      tint={def.art.tint}
                      className={styles.spriteInner ?? ''}
                    />
                  </div>
                  <span className={styles.championName}>{t(def.name as 'champ.anuria.name')}</span>
                  <span className={styles.doubled} style={{ color: RARITY_HEX[def.rarity] }}>
                    {t('portal.featured.doubled')}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <Divider />

      <section className={styles.chances} data-testid="portal-chances">
        <h3 className={`display ${styles.heading}`}>{t('portal.chances')}</h3>
        <ul className={styles.rates}>
          {rateRows(shard.shard).map((row) => (
            <li
              key={row.rarity}
              className={styles.rate}
              style={{ ['--rarity' as string]: RARITY_HEX[row.rarity] }}
              data-testid={`portal-chance-${row.rarity}`}
            >
              <span className={styles.rateName}>{t(`rarity.${row.rarity}`)}</span>
              <span className={styles.track} aria-hidden="true">
                <span className={styles.fill} style={{ width: `${chanceBar(row.chance) * 100}%` }} />
              </span>
              <span className={`num ${styles.rateValue}`}>
                {translate('portal.rates.chance', { chance: row.chance })}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <Divider />

      <section className={styles.mercy} data-testid="portal-mercy">
        <h3 className={`display ${styles.heading}`}>{t('portal.pity')}</h3>
        {bars.length === 0 ? (
          <p className={styles.none}>{t('portal.pity.none')}</p>
        ) : (
          <ul className={styles.lines}>
            {bars.map((bar) => (
              <li
                key={bar.rarity}
                className={styles.line}
                style={{ ['--rarity' as string]: RARITY_HEX[bar.rarity] }}
              >
                <span className={styles.sentence}>{bar.sentence}</span>
                {bar.fill !== null ? (
                  <span className={styles.track} aria-hidden="true">
                    <span className={styles.fill} style={{ width: `${bar.fill * 100}%` }} />
                  </span>
                ) : null}
                {bar.climbing ? <span className={styles.climbing}>{bar.climbing}</span> : null}
              </li>
            ))}
          </ul>
        )}
        <div className={styles.links}>
          <Button variant="secondary" size="sm" onClick={onRates} data-testid="portal-rates">
            {t('portal.rates')}
          </Button>
          <Button variant="secondary" size="sm" onClick={onHistory} data-testid="portal-history">
            {t('portal.history')}
          </Button>
        </div>
      </section>

      <Divider />

      <section className={styles.exchange} data-testid="portal-exchange">
        <h3 className={`display ${styles.heading}`}>{t('portal.exchange')}</h3>
        {price === null ? (
          <p className={styles.none}>{t('portal.exchange.never')}</p>
        ) : (
          <>
            <p className={styles.price}>
              <AssetImage
                asset={content.currencyById[price.currency].icon}
                size={64}
                className={styles.priceIcon}
                alt=""
              />
              {translate('portal.exchange.price', {
                shard: shard.name,
                cost: `${price.amount} ${t(content.currencyById[price.currency].name as 'currency.gold.name')}`,
              })}
            </p>
            <div className={styles.buys}>
              <Button
                size="sm"
                disabled={!canBuy(1)}
                onClick={() => {
                  playSfx('ui.confirm');
                  onExchange(1);
                }}
                data-testid="portal-buy-1"
              >
                {translate('portal.exchange.buy', { count: 1 })}
              </Button>
              <Button
                size="sm"
                disabled={!canBuy(10)}
                onClick={() => {
                  playSfx('ui.confirm');
                  onExchange(10);
                }}
                data-testid="portal-buy-10"
              >
                {translate('portal.exchange.buy', { count: 10 })}
              </Button>
            </div>
          </>
        )}
      </section>
    </Panel>
  );
}
