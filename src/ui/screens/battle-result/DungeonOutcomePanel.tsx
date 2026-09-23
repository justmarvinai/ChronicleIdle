import { DUNGEON_STAGES } from '@content/balance/dungeon';
import { content } from '@content/registry';
import { t, translate, type I18nKey } from '@i18n/index';
import type { DungeonSessionState } from '@state/dungeon-session';
import { GearCard } from '@ui/components/GearCard/GearCard';
import { mainStatLine, pieceArtwork } from '@ui/gear/gear-view';
import { pieceTooltip } from '@ui/gear/piece-tooltip';
import styles from './DungeonOutcomePanel.module.css';

/**
 * What a keep gave up (docs/design/DUNGEONS.md §6). A dungeon pays one thing — gear — so the
 * pieces themselves are the panel, landing in turn in their own rarity frames.
 *
 * It reports the **batch**, not the last fight of it: an evening of ×25 in Ashenreach is one haul,
 * and a player who set twenty-five runs going wants to know what twenty-five runs brought back.
 */
export function DungeonOutcomePanel({ session }: { session: DungeonSessionState }) {
  const def = session.slug ? content.dungeonBySlug(session.slug) : undefined;
  if (!def || !session.summary) return null;
  const pieces = session.gear;
  const gold = session.currencies.find((entry) => entry.currency === 'gold')?.amount ?? 0;
  const lastCleared = session.summary.cleared;
  return (
    <div className={styles.panel} data-testid="dungeon-outcome">
      <h3 className={`display ${styles.title}`}>
        {t('dungeon.outcome.title', {
          dungeon: translate(def.name),
          difficulty: t(`dungeon.difficulty.${session.difficulty}` as I18nKey),
          stage: session.stage,
        })}
      </h3>

      {pieces.length > 0 ? (
        <>
          <div className={styles.pieces} data-testid="dungeon-outcome-gear">
            {/* At most a dozen are drawn: a ×50 batch is a number, not a wall of cards. */}
            {pieces.slice(0, 12).map((piece, index) => (
              <span
                key={piece.instanceId}
                className={styles.piece}
                style={{ animationDelay: `${index * 70}ms` }}
              >
                <GearCard
                  rarity={piece.rarity}
                  stars={piece.stars}
                  level={piece.level}
                  slot={piece.slot}
                  {...pieceArtwork(piece)}
                  {...pieceTooltip(piece)}
                  mainStat={mainStatLine(piece)}
                  size={96}
                />
              </span>
            ))}
          </div>
          <p className={`num ${styles.count}`} data-testid="dungeon-outcome-count">
            {pieces.length === 1
              ? t('dungeon.outcome.onePiece')
              : t('dungeon.outcome.pieces', { count: pieces.length })}
          </p>
        </>
      ) : lastCleared ? (
        <p className={styles.none} data-testid="dungeon-outcome-none">
          {t('dungeon.outcome.noPieces')}
        </p>
      ) : null}

      {!lastCleared ? (
        <p className={styles.held} data-testid="dungeon-outcome-held">
          {t('dungeon.outcome.failed')}
        </p>
      ) : null}

      {session.summary.firstClear && session.stage < DUNGEON_STAGES ? (
        <p className={styles.note} data-testid="dungeon-outcome-first">
          {t('dungeon.outcome.first', { stage: session.stage + 1 })}
        </p>
      ) : null}
      {session.summary.openedHard ? (
        <p className={styles.note} data-testid="dungeon-outcome-hard">
          {t('dungeon.outcome.hardOpen')}
        </p>
      ) : null}
      {session.gearLost > 0 ? (
        <p className={styles.full} data-testid="dungeon-outcome-full">
          {t('dungeon.outcome.full', { count: session.gearLost })}
        </p>
      ) : null}
      {/* Gear is the reason to come; the gold and the XP are what else the evening was worth. */}
      {gold > 0 || session.championXp > 0 ? (
        <p className={`num ${styles.runs}`} data-testid="dungeon-outcome-spoils">
          {t('dungeon.outcome.spoils', {
            gold: gold.toLocaleString(),
            xp: session.championXp.toLocaleString(),
          })}
        </p>
      ) : null}
      {session.requested > 1 ? (
        <p className={`num ${styles.runs}`} data-testid="dungeon-outcome-runs">
          {t('dungeon.outcome.runs', { count: session.completed })}
        </p>
      ) : null}
    </div>
  );
}
