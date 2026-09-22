import { useMemo, useState } from 'react';
import { playSfx } from '@audio/index';
import { content } from '@content/registry';
import { levelCap, maxStars } from '@engine/champions/stats';
import { t, translate } from '@i18n/index';
import { selectActions, selectInventory, selectRoster } from '@state/selectors';
import { useGameStore } from '@state/store';
import { ChampionCard } from '@ui/components/ChampionCard/ChampionCard';
import { Dialog } from '@ui/components/Dialog/Dialog';
import { VirtualGrid } from '@ui/components/VirtualGrid/VirtualGrid';
import { entriesOf } from '@ui/screens/champions/roster-view';
import styles from './BagTargetDialog.module.css';

const CARD = 96;

/**
 * Which champion a Chicken or a Cheatmeal is fed to (docs/tech/UI_DESIGN.md §5.26).
 *
 * Champions the item would do **nothing** for are drawn but not pressable, with the reason on the
 * card: one already at their level cap cannot eat a Chicken, and one already wearing every star
 * cannot eat a Cheatmeal. Showing them greyed rather than hiding them is the point — a player
 * looking for someone who is *not* on the list learns the rule from the list itself.
 */
export function BagTargetDialog({ item, onClose }: { item: string; onClose: () => void }) {
  const actions = useGameStore(selectActions);
  const roster = useGameStore(selectRoster);
  const inventory = useGameStore(selectInventory);
  const [refused, setRefused] = useState<string | null>(null);
  const def = content.consumableById(item);
  const entries = useMemo(() => entriesOf(roster, inventory), [roster, inventory]);
  if (!def) return null;

  const levels = def.effect.kind === 'champion_level';

  /** Whether this champion would actually gain something. */
  const wouldHelp = (instanceId: string): boolean => {
    const champion = roster[instanceId];
    if (!champion) return false;
    if (levels) return champion.level < levelCap(champion.stars);
    const championDef = content.championById(champion.defId);
    return championDef ? champion.stars < maxStars(championDef.rarity) : false;
  };

  return (
    <Dialog
      title={`${translate(def.name)} · ${t('bag.pickChampion')}`}
      onClose={onClose}
      width={860}
      testId="dialog-bag-target"
    >
      <p className={styles.blurb}>{translate(def.description)}</p>
      <VirtualGrid
        items={entries}
        columns={7}
        cellWidth={CARD}
        cellHeight={Math.round(CARD * 1.34)}
        gap={10}
        height={430}
        keyOf={(entry) => entry.instance.instanceId}
        emptyLabel={t('champions.empty')}
        renderItem={(entry) => {
          const id = entry.instance.instanceId;
          const helps = wouldHelp(id);
          return (
            <ChampionCard
              name={entry.name}
              rarity={entry.def.rarity}
              element={entry.def.element}
              role={entry.def.role}
              stars={entry.instance.stars}
              level={entry.instance.level}
              avatar={entry.def.art.avatar}
              tint={entry.def.art.tint}
              placeholder={entry.def.art.placeholder}
              placeholderLabel={t('champions.placeholder')}
              size={CARD}
              // A champion the item would do nothing for is drawn, but dead to the touch.
              dimmed={!helps}
              {...(helps
                ? {
                    onClick: () => {
                      const result = actions.useItem(item, id);
                      if (!result.ok) {
                        playSfx('ui.error');
                        setRefused(result.error.message);
                        return;
                      }
                      playSfx('reward.large');
                      onClose();
                    },
                  }
                : {})}
              testId={`bag-target-${id}`}
            />
          );
        }}
      />
      {refused ? (
        <p className={styles.refused} data-testid="bag-target-refused">
          {refused}
        </p>
      ) : null}
    </Dialog>
  );
}
