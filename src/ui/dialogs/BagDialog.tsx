import { useState, type CSSProperties } from 'react';
import { playSfx } from '@audio/index';
import { CONSUMABLE_IDS } from '@content/consumables/index';
import { needsChampion } from '@content/consumables/types';
import { content } from '@content/registry';
import { bagRows } from '@engine/bag/index';
import { t, translate } from '@i18n/index';
import type { UseResult } from '@state/bag';
import { selectActions, selectSave } from '@state/selectors';
import { useGameStore } from '@state/store';
import { AssetImage } from '@ui/components/AssetImage/AssetImage';
import { Dialog } from '@ui/components/Dialog/Dialog';
import { Panel } from '@ui/components/Frame/Panel';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { useNow } from '@ui/hooks/useNow';
import { GoButton } from '@ui/places/GoButton';
import { placeDestination } from '@ui/places/places';
import { outcomeLine } from '@ui/screens/market/market-view';
import { RARITY_COLOR } from '@ui/styles/display-maps';
import { BagDetail } from './BagDetail';
import styles from './BagDialog.module.css';

/** The Bag's grid: three rows of four — every consumable the game has, with room to spare. */
const SLOTS = 12;

/** The two places that fill an empty Bag, offered from it. */
const FILLED_FROM = ['market', 'login'] as const;

/**
 * The Bag (docs/tech/UI_DESIGN.md §5.26): what the chronicle is holding as slots in a grid — each
 * item's art in its rarity's frame, its count and its name — and the chosen one in full beside it,
 * with what using it does, how the thing it acts on stands now, and the press.
 *
 * A consumable is bought once and used weeks later — by then a player has forgotten, and a name
 * alone would make them guess. The two that act on a champion hand off to the picker rather than
 * acting on whoever is first.
 */
export function BagDialog({ onClose }: { onClose: () => void }) {
  const actions = useGameStore(selectActions);
  const save = useGameStore(selectSave);
  // A boost's countdown on the panel ticks.
  const now = useNow(1000);
  const [picked, setPicked] = useState<string | null>(null);
  const [said, setSaid] = useState<{ name: string; line: string } | null>(null);
  const [refused, setRefused] = useState<string | null>(null);
  if (!save) return null;

  const rows = bagRows(save.bag, CONSUMABLE_IDS);
  // The chosen item while it is still held; once it is gone, the first thing left in the Bag.
  const chosen = rows.find((row) => row.item === picked) ?? rows[0] ?? null;
  const chosenDef = chosen ? content.consumableById(chosen.item) : undefined;

  const use = (item: string): void => {
    const result = actions.useItem(item);
    if (!result.ok) {
      playSfx('ui.error');
      setRefused(result.error.message);
      setSaid(null);
      return;
    }
    playSfx('reward.medium');
    setRefused(null);
    setSaid({ name: translate(result.value.def.name), line: outcomeLine(result.value as UseResult) });
  };

  return (
    <Dialog title={t('bag.title')} onClose={onClose} width={1240} testId="dialog-bag">
      <p className={styles.subtitle}>{t('bag.subtitle')}</p>

      <div className={styles.layout}>
        <ul className={styles.grid} data-testid="bag-list">
          {rows.map(({ item, count }) => {
            const def = content.consumableById(item);
            if (!def) return null;
            return (
              <li key={item}>
                <button
                  type="button"
                  className={styles.slot}
                  aria-pressed={item === chosen?.item}
                  style={{ '--rarity': RARITY_COLOR[def.rarity] } as CSSProperties}
                  onMouseEnter={() => playSfx('ui.hover')}
                  onClick={() => {
                    setPicked(item);
                    playSfx('ui.tab');
                  }}
                  data-testid={`bag-${item.replace('item.', '')}`}
                >
                  <span className={styles.slotArt}>
                    <AssetImage asset={def.icon} width={70} height={70} alt="" />
                    <span className={`num ${styles.count}`}>{t('bag.count', { count })}</span>
                  </span>
                  <span className={styles.slotName}>{translate(def.name)}</span>
                </button>
              </li>
            );
          })}
          {Array.from({ length: Math.max(0, SLOTS - rows.length) }, (_, index) => (
            <li key={`empty-${index}`} className={styles.emptySlot} aria-hidden="true" />
          ))}
        </ul>

        {chosen && chosenDef ? (
          <BagDetail
            def={chosenDef}
            count={chosen.count}
            save={save}
            now={now}
            onUse={() => {
              // The two that act on a champion ask which, rather than guessing.
              if (needsChampion(chosenDef)) actions.openDialog({ name: 'bag-target', item: chosen.item });
              else use(chosen.item);
            }}
          />
        ) : (
          <Panel
            kind="ember-wide"
            padding={28}
            className={styles.emptyPanel}
            contentClassName={styles.emptyBody}
          >
            <Glyph glyph="glyph.trophy_cup" size={48} className={styles.emptyGlyph ?? ''} />
            <p className={styles.empty} data-testid="bag-empty">
              {t('bag.empty')}
            </p>
            <div className={styles.emptyWays}>
              {FILLED_FROM.map((place) => {
                const destination = placeDestination(place);
                return destination ? (
                  <GoButton key={place} destination={destination} size="md" testId={`bag-go-${place}`} />
                ) : null;
              })}
            </div>
          </Panel>
        )}
      </div>

      <div className={styles.foot} aria-live="polite">
        {said ? (
          <p className={styles.said} data-testid="bag-said">
            <strong>{t('bag.used', { name: said.name })}</strong> {said.line}
          </p>
        ) : null}
        {refused ? (
          <p className={styles.refused} data-testid="bag-refused">
            {refused}
          </p>
        ) : null}
      </div>
    </Dialog>
  );
}
