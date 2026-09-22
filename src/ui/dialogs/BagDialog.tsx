import { useState } from 'react';
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
import { Button } from '@ui/components/Button/Button';
import { Dialog } from '@ui/components/Dialog/Dialog';
import { ScrollArea } from '@ui/components/ScrollArea/ScrollArea';
import { outcomeLine } from '@ui/screens/market/market-view';
import { RARITY_COLOR } from '@ui/styles/display-maps';
import styles from './BagDialog.module.css';

/**
 * The Bag (docs/tech/UI_DESIGN.md §5.26): what the chronicle is holding, and what each thing does.
 *
 * Every row says **what using it would do** in full, because a consumable is bought once and used
 * weeks later — by then a player has forgotten, and a name alone would make them guess. The two
 * that act on a champion hand off to the picker rather than acting on whoever is first.
 */
export function BagDialog({ onClose }: { onClose: () => void }) {
  const actions = useGameStore(selectActions);
  const save = useGameStore(selectSave);
  const [said, setSaid] = useState<{ name: string; line: string } | null>(null);
  const [refused, setRefused] = useState<string | null>(null);
  if (!save) return null;

  const rows = bagRows(save.bag, CONSUMABLE_IDS);

  const use = (item: string, instanceId?: string): void => {
    const result = actions.useItem(item, instanceId);
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
    <Dialog title={t('bag.title')} onClose={onClose} width={720} testId="dialog-bag">
      <p className={styles.subtitle}>{t('bag.subtitle')}</p>

      {rows.length === 0 ? (
        <p className={styles.empty} data-testid="bag-empty">
          {t('bag.empty')}
        </p>
      ) : (
        <ScrollArea height={480}>
          <ul className={styles.list} data-testid="bag-list">
            {rows.map(({ item, count }) => {
              const def = content.consumableById(item);
              if (!def) return null;
              const picks = needsChampion(def);
              return (
                <li key={item} className={styles.row} data-testid={`bag-${item.replace('item.', '')}`}>
                  <span className={styles.icon} style={{ borderColor: RARITY_COLOR[def.rarity] }}>
                    <AssetImage asset={def.icon} width={40} height={40} alt="" />
                    <span className={`num ${styles.count}`}>{t('bag.count', { count })}</span>
                  </span>
                  <span className={styles.text}>
                    <span className={styles.name} style={{ color: RARITY_COLOR[def.rarity] }}>
                      {translate(def.name)}
                    </span>
                    <span className={styles.body}>{translate(def.description)}</span>
                  </span>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      if (!picks) {
                        use(item);
                        return;
                      }
                      // The two that act on a champion ask which, rather than guessing.
                      actions.openDialog({ name: 'bag-target', item });
                    }}
                    data-testid={`bag-use-${item.replace('item.', '')}`}
                  >
                    {picks ? t('bag.useOn') : t('bag.use')}
                  </Button>
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      )}

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
    </Dialog>
  );
}
