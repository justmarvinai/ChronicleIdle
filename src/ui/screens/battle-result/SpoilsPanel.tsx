import type { CSSProperties } from 'react';
import type { CurrencyId } from '@content/currencies/types';
import type { RunRewards } from '@engine/campaign/rewards';
import type { GearInstance } from '@engine/gear/instance';
import { t } from '@i18n/index';
import { PieceThumb } from '@ui/components/PieceThumb/PieceThumb';
import { pieceArtwork, pieceName } from '@ui/gear/gear-view';
import { BOOST_GLYPH, BOOST_TINT, RARITY_COLOR, RARITY_HEX } from '@ui/styles/display-maps';
import { ResultBanner } from './ResultBanner';
import { currencyTile, xpTile } from './reward-tile';
import { RewardTiles } from './RewardTiles';
import styles from './SpoilsPanel.module.css';

/**
 * A drop is drawn as its painting badged with its set's emblem, named in its rarity. A ×50 batch
 * can bring home dozens, so a dozen are drawn and the rest are a count (as the dungeons do).
 */
const DROPS_SHOWN = 12;
const DROP_THUMB = 40;

export interface SpoilsPanelProps {
  rewards: RunRewards;
  firstClear: boolean;
  /** Star chests the run opened, by their star threshold. */
  chestThresholds: readonly number[];
  /** Mastering a difficulty owes a champion of the player's choosing, claimed at the Portal. */
  owedChoice: boolean;
  dropped: readonly GearInstance[];
  gearLost: number;
  /** The chronicle's level when the run carried it past one, else null. */
  chronicleLevel: number | null;
}

/**
 * What a stand paid (docs/tech/UI_DESIGN.md §5.10): every currency as a tile — its icon, how much,
 * its name — landing one after another, the champion and chronicle XP under their boosts' marks,
 * the first clear, star chests and a champion owed as banners, and the drops as paintings named in
 * their rarity.
 */
export function SpoilsPanel({
  rewards,
  firstClear,
  chestThresholds,
  owedChoice,
  dropped,
  gearLost,
  chronicleLevel,
}: SpoilsPanelProps) {
  const currencies: { currency: CurrencyId; amount: number }[] = [
    ...rewards.currencies,
    ...(rewards.gems > 0 ? [{ currency: 'gems' as const, amount: rewards.gems }] : []),
    ...(rewards.energy > 0 ? [{ currency: 'energy' as const, amount: rewards.energy }] : []),
  ];
  return (
    <section className={styles.spoils} data-testid="result-rewards">
      <h2 className={`display ${styles.heading}`}>{t('battleResult.rewards')}</h2>

      {firstClear || chestThresholds.length || owedChoice || chronicleLevel !== null ? (
        <div className={styles.banners}>
          {firstClear ? (
            <ResultBanner glyph="glyph.shooting_stars">{t('battleResult.firstClear')}</ResultBanner>
          ) : null}
          {chestThresholds.map((stars) => (
            <ResultBanner key={stars} glyph="glyph.trophy_cup">
              {t('battleResult.starChest', { stars })}
            </ResultBanner>
          ))}
          {chronicleLevel !== null ? (
            <ResultBanner glyph={BOOST_GLYPH.player_xp} glyphColor={BOOST_TINT.player_xp}>
              {t('battleResult.playerLevelUp', { level: chronicleLevel })}
            </ResultBanner>
          ) : null}
          {/* The Intro milestone's Epic is taken at the Portal, so the run only says so. */}
          {owedChoice ? (
            <ResultBanner glyph="glyph.spirit_vortex" tone="purple" testId="result-choice">
              {t('battleResult.championChoice')}
            </ResultBanner>
          ) : null}
        </div>
      ) : null}

      <RewardTiles
        tiles={[
          ...currencies.map((entry) => currencyTile(entry.currency, entry.amount)),
          xpTile('champion', rewards.championXp),
          xpTile('player', rewards.playerXp),
        ]}
      />

      {dropped.length > 0 ? (
        <div className={styles.dropsBlock}>
          <h3 className={`display ${styles.subheading}`}>
            {t('battleResult.drops', { count: dropped.length })}
          </h3>
          <ul className={styles.drops} data-testid="result-gear">
            {dropped.slice(0, DROPS_SHOWN).map((piece) => (
              <li
                key={piece.instanceId}
                className={styles.drop}
                style={{ '--rarity': RARITY_HEX[piece.rarity] } as CSSProperties}
                data-testid={`result-gear-${piece.instanceId}`}
              >
                <PieceThumb {...pieceArtwork(piece)} tint={RARITY_HEX[piece.rarity]} size={DROP_THUMB} />
                <span className={styles.dropName} style={{ color: RARITY_COLOR[piece.rarity] }}>
                  {pieceName(piece)}
                </span>
              </li>
            ))}
          </ul>
          {dropped.length > DROPS_SHOWN ? (
            <p className={styles.more} data-testid="result-gear-more">
              {t('battleResult.gearMore', { count: dropped.length - DROPS_SHOWN })}
            </p>
          ) : null}
        </div>
      ) : null}
      {gearLost > 0 ? (
        <p className={styles.lost} data-testid="result-gear-lost">
          {t('battleResult.gearLost', { count: gearLost })}
        </p>
      ) : null}
    </section>
  );
}
