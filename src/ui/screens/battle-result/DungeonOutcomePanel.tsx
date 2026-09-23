import { DUNGEON_STAGES } from '@content/balance/dungeon';
import { content } from '@content/registry';
import { t, translate, type I18nKey } from '@i18n/index';
import type { DungeonSessionState } from '@state/dungeon-session';
import { GearCard } from '@ui/components/GearCard/GearCard';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { mainStatLine, pieceArtwork } from '@ui/gear/gear-view';
import { pieceTooltip } from '@ui/gear/piece-tooltip';
import { ResultBanner } from './ResultBanner';
import { currencyTile, xpTile } from './reward-tile';
import { RewardTiles } from './RewardTiles';
import panel from './ResultPanel.module.css';
import styles from './DungeonOutcomePanel.module.css';

/** At most a dozen pieces are drawn: a ×50 batch is a number, not a wall of cards. */
const PIECES_SHOWN = 12;
const PIECE_SIZE = 96;
/** The beat between one piece landing and the next, in milliseconds. */
const PIECE_STEP = 70;

/**
 * What a keep gave up (docs/design/DUNGEONS.md §6). A dungeon pays one thing — gear — so the
 * pieces themselves lead the panel, landing in turn in their own rarity frames; what opened, and
 * the gold and XP the evening was also worth, follow as the other results draw them.
 *
 * It reports the **batch**, not the last fight of it: an evening of ×25 in Ashenreach is one haul,
 * and a player who set twenty-five runs going wants to know what twenty-five runs brought back.
 */
export function DungeonOutcomePanel({ session }: { session: DungeonSessionState }) {
  const def = session.slug ? content.dungeonBySlug(session.slug) : undefined;
  if (!def || !session.summary) return null;
  const pieces = session.gear;
  const lastCleared = session.summary.cleared;
  return (
    <div className={panel.panel} data-testid="dungeon-outcome">
      <h2 className={`display ${panel.heading}`}>
        {t('dungeon.outcome.title', {
          dungeon: translate(def.name),
          difficulty: t(`dungeon.difficulty.${session.difficulty}` as I18nKey),
          stage: session.stage,
        })}
      </h2>

      {pieces.length > 0 ? (
        <>
          <h3 className={`display ${panel.subheading}`} data-testid="dungeon-outcome-count">
            {pieces.length === 1
              ? t('dungeon.outcome.onePiece')
              : t('dungeon.outcome.pieces', { count: pieces.length })}
          </h3>
          <div className={styles.pieces} data-testid="dungeon-outcome-gear">
            {pieces.slice(0, PIECES_SHOWN).map((piece, index) => (
              <span
                key={piece.instanceId}
                className={styles.piece}
                style={{ animationDelay: `${index * PIECE_STEP}ms` }}
              >
                <GearCard
                  rarity={piece.rarity}
                  stars={piece.stars}
                  level={piece.level}
                  slot={piece.slot}
                  {...pieceArtwork(piece)}
                  {...pieceTooltip(piece)}
                  mainStat={mainStatLine(piece)}
                  size={PIECE_SIZE}
                />
              </span>
            ))}
          </div>
        </>
      ) : lastCleared ? (
        <p className={panel.line} data-testid="dungeon-outcome-none">
          {t('dungeon.outcome.noPieces')}
        </p>
      ) : null}

      {!lastCleared ? (
        <ResultBanner glyph="glyph.skull_wreath" tone="ember" testId="dungeon-outcome-held">
          {t('dungeon.outcome.failed')}
        </ResultBanner>
      ) : null}
      {session.summary.firstClear && session.stage < DUNGEON_STAGES ? (
        <ResultBanner glyph="glyph.shooting_stars" testId="dungeon-outcome-first">
          {t('dungeon.outcome.first', { stage: session.stage + 1 })}
        </ResultBanner>
      ) : null}
      {session.summary.openedHard ? (
        <ResultBanner glyph="glyph.flaming_skull" testId="dungeon-outcome-hard">
          {t('dungeon.outcome.hardOpen')}
        </ResultBanner>
      ) : null}
      {session.gearLost > 0 ? (
        <ResultBanner glyph="glyph.broken_shackle" tone="ember" testId="dungeon-outcome-full">
          {t('dungeon.outcome.full', { count: session.gearLost })}
        </ResultBanner>
      ) : null}
      {/* Gear is the reason to come; the gold and the XP are what else the evening was worth. */}
      {session.currencies.length || session.championXp > 0 ? (
        <RewardTiles
          testId="dungeon-outcome-spoils"
          tiles={[
            ...session.currencies.map((entry) => currencyTile(entry.currency, entry.amount)),
            ...(session.championXp > 0 ? [xpTile('champion', session.championXp)] : []),
            ...(session.playerXp > 0 ? [xpTile('player', session.playerXp)] : []),
          ]}
        />
      ) : null}
      {session.requested > 1 ? (
        <p className={panel.line}>
          <Glyph glyph="glyph.hourglass" size={16} color="var(--text-3)" />
          <span className="num" data-testid="dungeon-outcome-runs">
            {t('dungeon.outcome.runs', { count: session.completed })}
          </span>
        </p>
      ) : null}
    </div>
  );
}
