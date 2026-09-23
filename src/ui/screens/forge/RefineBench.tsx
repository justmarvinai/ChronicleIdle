import { useMemo, useState } from 'react';
import { playSfx } from '@audio/index';
import { GEAR_MAX_STARS } from '@content/balance/gear';
import { t, translate } from '@i18n/index';
import { canSacrifice, refineCost } from '@engine/forge/refine';
import { gearEntries, sortAndFilterGear } from '@engine/gear/query';
import { mainStatValue } from '@engine/gear/stats';
import { unlockLevel } from '@engine/progression/unlocks';
import {
  selectActions,
  selectFeatureUnlocked,
  selectGearView,
  selectInventory,
  selectRoster,
  selectWallet,
} from '@state/selectors';
import { useGameStore } from '@state/store';
import { Button } from '@ui/components/Button/Button';
import { GearCard } from '@ui/components/GearCard/GearCard';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { ScrollArea } from '@ui/components/ScrollArea/ScrollArea';
import { StarRow } from '@ui/components/StarRow/StarRow';
import { RARITY_HEX } from '@ui/styles/display-maps';
import { formatGearValue, mainStatLine, pieceArtwork, pieceName, setOf, slotLabel } from '@ui/gear/gear-view';
import styles from './RefineBench.module.css';

const selectRefineUnlocked = selectFeatureUnlocked('gear_refine');

/** The whetstone: a piece, a twin to feed it, cores and gold — one more star. */
export function RefineBench() {
  const actions = useGameStore(selectActions);
  const inventory = useGameStore(selectInventory);
  const roster = useGameStore(selectRoster);
  const view = useGameStore(selectGearView);
  const wallet = useGameStore(selectWallet);
  const unlocked = useGameStore(selectRefineUnlocked);
  const [targetId, setTarget] = useState<string | null>(null);
  const [sacrificeId, setSacrifice] = useState<string | null>(null);

  const entries = useMemo(
    () => sortAndFilterGear(gearEntries(inventory, roster), view),
    [inventory, roster, view],
  );
  const climbable = useMemo(
    () => entries.filter((entry) => !entry.piece.locked && entry.piece.stars < GEAR_MAX_STARS),
    [entries],
  );
  const target = targetId ? (inventory[targetId] ?? null) : null;
  const twins = useMemo(
    () => (target ? entries.filter((entry) => canSacrifice(target, entry.piece)) : []),
    [entries, target],
  );
  const sacrifice = sacrificeId ? (inventory[sacrificeId] ?? null) : null;

  const cost = target ? refineCost(target.stars) : null;
  const cores = wallet?.mat_refining_core ?? 0;
  const gold = wallet?.gold ?? 0;
  const canPay = cost !== null && cores >= cost.cores && gold >= cost.gold;

  const press = (): void => {
    if (!target || !sacrifice) return;
    const result = actions.refineGear(target.instanceId, sacrifice.instanceId);
    if (!result.ok) {
      playSfx('ui.error');
      actions.toast('error', 'forge.refine.tooPoor');
      return;
    }
    playSfx('reward.large');
    actions.toast('reward', 'forge.refine.done', {
      piece: pieceName(result.value.piece),
      stars: result.value.to,
    });
    setSacrifice(null);
  };

  if (!unlocked) {
    return (
      <div className={styles.bench} data-testid="forge-refine">
        <p className={styles.locked} data-testid="refine-locked">
          <Glyph glyph="glyph.broken_shackle" size={26} color="var(--gold-2)" />
          <span>{t('forge.locked', { level: unlockLevel('gear_refine') })}</span>
        </p>
      </div>
    );
  }

  return (
    <div className={styles.bench} data-testid="forge-refine">
      <section className={styles.pickers}>
        <h3 className={`display ${styles.heading}`}>{t('forge.refine.piece')}</h3>
        {climbable.length === 0 ? (
          <p className={styles.hint} data-testid="refine-none">
            {t('forge.refine.choose')}
          </p>
        ) : (
          <ScrollArea height="100%" className={styles.scroll}>
            <div className={styles.grid}>
              {climbable.map((entry) => (
                <GearCard
                  key={entry.piece.instanceId}
                  rarity={entry.piece.rarity}
                  stars={entry.piece.stars}
                  level={entry.piece.level}
                  slot={entry.piece.slot}
                  {...pieceArtwork(entry.piece)}
                  mainStat={mainStatLine(entry.piece)}
                  setName={setOf(entry.piece) ? translate(setOf(entry.piece)?.name ?? '') : entry.piece.setId}
                  size={96}
                  selected={targetId === entry.piece.instanceId}
                  locked={entry.piece.locked}
                  onClick={() => {
                    playSfx('ui.tab');
                    setTarget(entry.piece.instanceId);
                    setSacrifice(null);
                  }}
                />
              ))}
            </div>
          </ScrollArea>
        )}

        <h3 className={`display ${styles.heading}`}>{t('forge.refine.sacrifice')}</h3>
        {!target ? (
          <p className={styles.hint}>{t('forge.refine.choose')}</p>
        ) : twins.length === 0 ? (
          <p className={styles.hint} data-testid="refine-no-twin">
            {t('forge.refine.noSacrifice', {
              slot: slotLabel(target.slot),
              stars: target.stars,
            })}
          </p>
        ) : (
          <>
            <p className={styles.hint}>
              {t('forge.refine.chooseSacrifice', {
                slot: slotLabel(target.slot),
                stars: target.stars,
              })}
            </p>
            <ScrollArea height="100%" className={styles.scroll}>
              <div className={styles.grid}>
                {twins.map((entry) => (
                  <GearCard
                    key={entry.piece.instanceId}
                    rarity={entry.piece.rarity}
                    stars={entry.piece.stars}
                    level={entry.piece.level}
                    slot={entry.piece.slot}
                    {...pieceArtwork(entry.piece)}
                    mainStat={mainStatLine(entry.piece)}
                    setName={
                      setOf(entry.piece) ? translate(setOf(entry.piece)?.name ?? '') : entry.piece.setId
                    }
                    size={96}
                    selected={sacrificeId === entry.piece.instanceId}
                    onClick={() => {
                      playSfx('ui.tab');
                      setSacrifice(entry.piece.instanceId);
                    }}
                  />
                ))}
              </div>
            </ScrollArea>
          </>
        )}
      </section>

      <aside className={styles.side} data-testid="refine-panel">
        {target ? (
          <>
            <h3 className={`display ${styles.name}`} style={{ color: RARITY_HEX[target.rarity] }}>
              {pieceName(target)}
            </h3>
            <div className={styles.stars}>
              <StarRow
                stars={target.stars}
                max={6}
                size={20}
                tone="rarity"
                tint={RARITY_HEX[target.rarity]}
              />
              <span className={`num ${styles.climb}`} data-testid="refine-climb">
                {t('forge.refine.result', { from: target.stars, to: target.stars + 1 })}
              </span>
            </div>
            <p className={`num ${styles.main}`} data-testid="refine-main">
              {t('forge.refine.mainStat', {
                from: formatGearValue(
                  target.mainStat,
                  mainStatValue(target.mainStat, target.stars, target.level),
                ),
                to: formatGearValue(
                  target.mainStat,
                  mainStatValue(target.mainStat, target.stars + 1, target.level),
                ),
              })}
            </p>
            <p className={styles.hint}>{t('forge.refine.keeps')}</p>
            {cost ? (
              <p className={`num ${styles.cost}`} data-testid="refine-cost">
                {t('forge.refine.cost', {
                  cores: cost.cores,
                  gold: cost.gold.toLocaleString('en-US'),
                })}
              </p>
            ) : null}
            <p className={styles.held}>{t('forge.refine.cores', { count: cores })}</p>
            <Button
              variant="primary"
              size="lg"
              disabled={!sacrifice || !canPay}
              onClick={press}
              data-testid="refine-press"
            >
              {t('forge.refine.press')}
            </Button>
          </>
        ) : (
          <p className={styles.hint}>{t('forge.tab.refine.hint')}</p>
        )}
      </aside>
    </div>
  );
}
