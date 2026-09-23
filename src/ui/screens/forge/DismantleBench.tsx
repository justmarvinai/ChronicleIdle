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
import { GearCard } from '@ui/components/GearCard/GearCard';
import { ScrollArea } from '@ui/components/ScrollArea/ScrollArea';
import { CurrencyLabel } from '@ui/components/CurrencyLabel/CurrencyLabel';
import { mainStatLine, pieceArtwork, setOf } from '@ui/gear/gear-view';
import { pieceTooltip } from '@ui/gear/piece-tooltip';
import { QUICK_PICKS, breakable, quickPick, quickPickLabel } from './forge-view';
import styles from './DismantleBench.module.css';

/** The scrap heap: pick what to break, see what it returns, break it. */
export function DismantleBench() {
  const actions = useGameStore(selectActions);
  const inventory = useGameStore(selectInventory);
  const roster = useGameStore(selectRoster);
  const view = useGameStore(selectGearView);
  const [picked, setPicked] = useState<string[]>([]);

  const free = useMemo(
    () => breakable(sortAndFilterGear(gearEntries(inventory, roster), view)),
    [inventory, roster, view],
  );
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
    <div className={styles.bench} data-testid="forge-dismantle">
      <section className={styles.racks}>
        <div className={styles.quick}>
          <span className={styles.quickLabel}>{t('forge.dismantle.quick')}</span>
          {QUICK_PICKS.map((pick) => (
            <Button
              key={pick}
              variant="secondary"
              size="sm"
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
          <span className={`num ${styles.count}`} data-testid="dismantle-count">
            {t('forge.dismantle.selected', { count: picked.length })}
          </span>
        </div>

        {free.length === 0 ? (
          <p className={styles.empty} data-testid="dismantle-empty">
            {t('forge.dismantle.empty')}
          </p>
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
                    size={96}
                    selected={picked.includes(entry.piece.instanceId)}
                    onClick={() => toggle(entry.piece.instanceId)}
                  />
                );
              })}
            </div>
          </ScrollArea>
        )}
      </section>

      <aside className={styles.side}>
        <h3 className={`display ${styles.heading}`}>{t('forge.dismantle.yield')}</h3>
        {plan?.ok ? (
          <>
            <ul className={styles.yield} data-testid="dismantle-yield">
              {plan.value.yield.map((entry) => (
                <li key={entry.currency} className={styles.yieldRow}>
                  <CurrencyLabel currency={entry.currency} size={26} />
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
          <p className={styles.hint}>{t('forge.dismantle.none')}</p>
        )}
        <p className={styles.hint}>{t('forge.dismantle.protected')}</p>
        {picked.length >= DISMANTLE_MAX_SELECTION ? (
          <p className={styles.hint}>{t('forge.dismantle.cap', { count: DISMANTLE_MAX_SELECTION })}</p>
        ) : null}
        <Button
          variant="primary"
          size="lg"
          disabled={picked.length === 0}
          onClick={press}
          data-testid="dismantle-press"
        >
          {picked.length > 1
            ? t('forge.dismantle.press', { count: picked.length })
            : t('forge.dismantle.pressOne')}
        </Button>
      </aside>
    </div>
  );
}
