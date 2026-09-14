import { useMemo } from 'react';
import { playSfx } from '@audio/index';
import { t } from '@i18n/index';
import { selectActions, selectRoster, selectTavern } from '@state/selectors';
import { useGameStore } from '@state/store';
import { ChampionCard } from '@ui/components/ChampionCard/ChampionCard';
import { Dialog } from '@ui/components/Dialog/Dialog';
import { ScrollArea } from '@ui/components/ScrollArea/ScrollArea';
import { foodEntries } from '@ui/screens/tavern/tavern-view';
import styles from './FoodPickerDialog.module.css';

export interface FoodPickerDialogProps {
  instanceId: string;
  mode: 'level' | 'rank';
  /** Seats at the table on the track that opened the picker. */
  seats: number;
  onClose: () => void;
}

/**
 * Who is free to be spent (`ECONOMY.md` §3): locked and favourite champions never appear, and on
 * the Rank track only the star tier the rank-up asks for does.
 */
export function FoodPickerDialog({ instanceId, mode, seats, onClose }: FoodPickerDialogProps) {
  const roster = useGameStore(selectRoster);
  const actions = useGameStore(selectActions);
  const { offering } = useGameStore(selectTavern);
  const entries = useMemo(
    () => foodEntries(roster, instanceId, mode).filter((e) => !offering.food.includes(e.instance.instanceId)),
    [roster, instanceId, mode, offering.food],
  );

  return (
    <Dialog title={t('foodPicker.title')} onClose={onClose} width={900} testId="dialog-food-picker">
      <p className={styles.hint}>{t('foodPicker.body')}</p>
      {entries.length === 0 ? (
        <p className={styles.empty} data-testid="food-picker-empty">
          {t('foodPicker.empty')}
        </p>
      ) : (
        <ScrollArea height={520} className={styles.scroll}>
          <div className={styles.grid}>
            {entries.map((entry) => (
              <div key={entry.instance.instanceId} className={styles.entry}>
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
                  size={128}
                  onClick={() => {
                    playSfx('ui.confirm');
                    actions.setTavernOffering({
                      ...offering,
                      food: [...offering.food, entry.instance.instanceId].slice(0, seats),
                    });
                    actions.closeDialog();
                  }}
                  testId={`food-${entry.instance.instanceId}`}
                />
                {mode === 'level' ? (
                  <span className={`num ${styles.worth}`}>
                    {t('foodPicker.worth', { xp: entry.xp.toLocaleString('en-US') })}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </Dialog>
  );
}
