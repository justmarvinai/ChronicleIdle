import { useMemo, useState } from 'react';
import { playSfx } from '@audio/index';
import { DISMANTLE_MAX_SELECTION } from '@content/balance/forge';
import { t, translate } from '@i18n/index';
import { planDismantle } from '@engine/forge/dismantle';
import { gearEntries, sortAndFilterGear } from '@engine/gear/query';
import { levelGoldSpent } from '@state/gear';
import { selectActions, selectGearView, selectInventory, selectRoster } from '@state/selectors';
import { useGameStore } from '@state/store';
import { Button } from '@ui/components/Button/Button';
import { CurrencyLabel } from '@ui/components/CurrencyLabel/CurrencyLabel';
import { Panel } from '@ui/components/Frame/Panel';
import { GearCard } from '@ui/components/GearCard/GearCard';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { PieceThumb } from '@ui/components/PieceThumb/PieceThumb';
import { ScrollArea } from '@ui/components/ScrollArea/ScrollArea';
import { RARITY_HEX } from '@ui/styles/display-maps';
import { mainStatLine, pieceArtwork, setOf } from '@ui/gear/gear-view';
import { pieceTooltip } from '@ui/gear/piece-tooltip';
import { Storeroom } from './Storeroom';
import { QUICK_PICKS, breakable, quickPick, quickPickLabel } from './forge-view';
import styles from './DismantleBench.module.css';

/** The heap's strip shows this many of the chosen pieces before it counts the rest. */
const HEAP_SHOWN = 16;

/**
 * The Dismantle bench (docs/tech/UI_DESIGN.md §5.11): the racks of what may be broken with the
 * quick picks over them, and the scrap heap beside — what is on it, what it returns (the
 * storeroom counts the gain as the heap grows) and the press.
 */
export function DismantleBench() {
  const actions = useGameStore(selectActions);
  const inventory = useGameStore(selectInventory);
  const roster = useGameStore(selectRoster);
  const view = useGameStore(selectGearView);
  const [picked, setPicked] = useState<string[]>([]);

  const all = useMemo(
    () => sortAndFilterGear(gearEntries(inventory, roster), view),
    [inventory, roster, view],
  );
  const free = useMemo(() => breakable(all), [all]);
  const kept = all.length - free.length;
  const chosen = useMemo(
    () => picked.map((id) => inventory[id]).filter((piece) => piece !== undefined),
    [picked, inventory],
  );
  const plan = useMemo(() => (chosen.length > 0 ? planDismantle(chosen, levelGoldSpent) : null), [chosen]);

  const toggle = (id: string): void => {
    playSfx('ui.tab');
    setPicked((current) =>
      current.includes(id)
        ? current.filter((one) => one !== id)
        : current.length >= DISMANTLE_MAX_SELECTION
          ? current
          : [...current, id],
    );
  };

  const press = (): void => {
    const result = actions.dismantleGear(picked);
    if (!result.ok) {
      playSfx('ui.error');
      actions.toast('error', 'forge.dismantle.protected');
      return;
    }
    playSfx('reward.medium');
    actions.toast('reward', 'forge.dismantle.done', { count: result.value.pieces.length });
    setPicked([]);
  };

  return (
    <>
      <Storeroom returns={plan?.ok ? plan.value.yield : []} />
      <div className={styles.bench} data-testid="forge-dismantle">
        <section className={styles.racks}>
          <header className={styles.head}>
            <h3 className={`display ${styles.title}`}>{t('forge.dismantle.racks')}</h3>
            <span className={`num ${styles.free}`}>{t('forge.dismantle.free', { count: free.length })}</span>
            {kept > 0 ? (
              <span className={styles.kept}>
                <Glyph glyph="glyph.broken_shackle" size={16} color="var(--text-3)" />
                {t('forge.dismantle.kept', { count: kept })}
              </span>
            ) : null}
          </header>
          <div className={styles.quick}>
            <span className={styles.quickLabel}>{t('forge.dismantle.quick')}</span>
            {QUICK_PICKS.map((pick) => (
              <Button
                key={pick}
                variant="secondary"
                size="sm"
                disabled={free.length === 0}
                onClick={() => {
                  playSfx('ui.confirm');
                  setPicked(quickPick(free, pick).slice(0, DISMANTLE_MAX_SELECTION));
                }}
                data-testid={`dismantle-quick-${pick}`}
              >
                {quickPickLabel(pick)}
              </Button>
            ))}
            {picked.length > 0 ? (
              <button
                type="button"
                className={styles.clear}
                onClick={() => {
                  playSfx('ui.cancel');
                  setPicked([]);
                }}
                data-testid="dismantle-clear"
              >
                {t('forge.dismantle.clear')}
              </button>
            ) : null}
          </div>

          {free.length === 0 ? (
            <div className={styles.empty}>
              <Glyph glyph="glyph.hammer_hit" size={72} color="rgba(240, 213, 122, 0.35)" />
              <p className={styles.emptyTitle} data-testid="dismantle-empty">
                {t('forge.dismantle.empty')}
              </p>
              <p className={styles.emptyBody}>{t('forge.dismantle.emptyBody')}</p>
            </div>
          ) : (
            <ScrollArea height="100%" className={styles.scroll}>
              <div className={styles.grid}>
                {free.map((entry) => {
                  const set = setOf(entry.piece);
                  return (
                    <GearCard
                      key={entry.piece.instanceId}
                      rarity={entry.piece.rarity}
                      stars={entry.piece.stars}
                      level={entry.piece.level}
                      slot={entry.piece.slot}
                      {...pieceArtwork(entry.piece)}
                      {...pieceTooltip(entry.piece)}
                      mainStat={mainStatLine(entry.piece)}
                      setName={set ? translate(set.name) : entry.piece.setId}
                      size={128}
                      selected={picked.includes(entry.piece.instanceId)}
                      onClick={() => toggle(entry.piece.instanceId)}
                    />
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </section>

        <Panel kind="ember-tall" padding={16} className={styles.heap} contentClassName={styles.heapContent}>
          <h3 className={`display ${styles.title}`}>{t('forge.dismantle.heap')}</h3>
          <div className={styles.countRow}>
            <span className={`num ${styles.count}`} data-testid="dismantle-count">
              {t('forge.dismantle.selected', { count: picked.length })}
            </span>
            <span className={`num ${styles.max}`}>
              {t('forge.dismantle.of', { count: DISMANTLE_MAX_SELECTION })}
            </span>
          </div>
          <div className={styles.pile} aria-hidden="true">
            {chosen.length === 0 ? (
              <span className={styles.pileEmpty}>{t('forge.dismantle.none')}</span>
            ) : (
              <>
                {chosen.slice(0, HEAP_SHOWN).map((piece) => {
                  const art = pieceArtwork(piece);
                  return (
                    <PieceThumb
                      key={piece.instanceId}
                      art={art.art}
                      emblem={art.emblem}
                      tint={RARITY_HEX[piece.rarity]}
                      size={48}
                    />
                  );
                })}
                {chosen.length > HEAP_SHOWN ? (
                  <span className={`num ${styles.more}`}>+{chosen.length - HEAP_SHOWN}</span>
                ) : null}
              </>
            )}
          </div>

          <span className={`display ${styles.subTitle}`}>{t('forge.dismantle.yield')}</span>
          {plan?.ok ? (
            <>
              <ul className={styles.yield} data-testid="dismantle-yield">
                {plan.value.yield.map((entry) => (
                  <li key={entry.currency} className={styles.yieldRow}>
                    <CurrencyLabel currency={entry.currency} size={34} />
                    <span className="num">+{entry.amount.toLocaleString('en-US')}</span>
                  </li>
                ))}
              </ul>
              {plan.value.goldRefund > 0 ? (
                <p className={styles.refund}>
                  {t('forge.dismantle.refund', {
                    gold: plan.value.goldRefund.toLocaleString('en-US'),
                  })}
                </p>
              ) : null}
            </>
          ) : (
            <p className={styles.hint}>{t('forge.dismantle.yieldHint')}</p>
          )}

          <div className={styles.press}>
            <p className={styles.hint}>{t('forge.dismantle.protected')}</p>
            {picked.length >= DISMANTLE_MAX_SELECTION ? (
              <p className={styles.hint}>{t('forge.dismantle.cap', { count: DISMANTLE_MAX_SELECTION })}</p>
            ) : null}
            <Button
              variant="danger"
              size="lg"
              disabled={picked.length === 0}
              onClick={press}
              data-testid="dismantle-press"
              icon={<Glyph glyph="glyph.hammer_hit" size={26} color="currentColor" />}
            >
              {picked.length > 1
                ? t('forge.dismantle.press', { count: picked.length })
                : t('forge.dismantle.pressOne')}
            </Button>
          </div>
        </Panel>
      </div>
    </>
  );
}
