import { playSfx } from '@audio/index';
import { bagSize } from '@engine/bag/index';
import { t } from '@i18n/index';
import { selectActions, selectSave } from '@state/selectors';
import { useGameStore } from '@state/store';
import { AssetImage } from '@ui/components/AssetImage/AssetImage';
import styles from './BagButton.module.css';

/**
 * The Bag in the top bar (docs/tech/UI_DESIGN.md §5.26, the owner's instruction).
 *
 * It sits beside the purse rather than down among the hub's destinations because that is what it
 * *is* — a second thing the chronicle owns, not a fifth place to go. The bottom bar is for where
 * you are heading; the header is for what you are carrying, and gold, gems, energy, the chest and
 * the Bag are all the same kind of fact.
 *
 * Putting it here also makes it reachable from every screen rather than only from the hub, which
 * matters for an item whose whole point is being used at the moment you decide to (`MARKET.md` §5).
 */
export function BagButton() {
  const actions = useGameStore(selectActions);
  const save = useGameStore(selectSave);
  if (!save) return null;

  const held = bagSize(save.bag);
  const label = held > 0 ? `${t('bag.title')} — ${t('bag.count', { count: held })}` : t('bag.title');

  return (
    <button
      type="button"
      className={styles.socket}
      aria-label={label}
      title={label}
      data-testid="topbar-bag"
      data-held={held}
      onMouseEnter={() => playSfx('ui.hover')}
      onClick={() => {
        playSfx('ui.open');
        actions.openDialog({ name: 'bag' });
      }}
    >
      <AssetImage asset="ui.stone_vine.icon_sack" className={styles.icon} alt="" />
      {/* The count rides the socket's rim rather than taking a column: an empty Bag should keep
          its shape, not become a pill that shrinks when the last item is used. */}
      {held > 0 ? <span className={`num ${styles.count}`}>{held}</span> : null}
    </button>
  );
}
