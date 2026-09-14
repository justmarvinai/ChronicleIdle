import { content } from '@content/registry';
import { t, translate } from '@i18n/index';
import { selectActions, selectRoster } from '@state/selectors';
import { useGameStore } from '@state/store';
import { foodWarnings } from '@ui/screens/tavern/tavern-view';
import { Button } from '@ui/components/Button/Button';
import { Dialog } from '@ui/components/Dialog/Dialog';
import styles from './dialogs.module.css';

export interface TavernConfirmDialogProps {
  kind: 'level' | 'rank';
  instanceId: string;
  food: string[];
  brews: Record<string, number>;
  onClose: () => void;
}

/**
 * The last word before companions are retired (`UI_DESIGN.md` §5.5): it names every Rare-or-better
 * and every levelled champion on the table, because they do not come back.
 */
export function TavernConfirmDialog({ kind, instanceId, food, brews, onClose }: TavernConfirmDialogProps) {
  const actions = useGameStore(selectActions);
  const roster = useGameStore(selectRoster);
  const warnings = foodWarnings(roster, food);

  const confirm = (): void => {
    const result =
      kind === 'rank'
        ? actions.rankUpChampion(instanceId, food)
        : actions.feedChampion(instanceId, { brews, food });
    if (!result.ok) {
      actions.toast('error', 'tavern.refused', { reason: result.error.message });
      onClose();
      return;
    }
    actions.setTavernOffering({ brews: {}, food: [] });
    const def = content.championById(roster[instanceId]?.defId ?? ('' as never));
    const name = def ? translate(def.name) : instanceId;
    if ('stars' in result.value)
      actions.toast('reward', 'tavern.ranked', { name, stars: result.value.stars });
    else actions.toast('reward', 'tavern.fed', { name, level: result.value.level });
    onClose();
  };

  return (
    <Dialog
      title={t('tavern.confirm.title')}
      onClose={onClose}
      width={620}
      testId="dialog-tavern-confirm"
      footer={
        <>
          <Button variant="ghost" sound="ui.cancel" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" onClick={confirm} data-testid="tavern-confirm-accept">
            {t('tavern.confirm.accept')}
          </Button>
        </>
      }
    >
      <p className={styles.body}>{t('tavern.confirm.body')}</p>
      <ul className={styles.stack} data-testid="tavern-confirm-warnings">
        {warnings.map((warning) => (
          <li key={warning}>{warning}</li>
        ))}
      </ul>
    </Dialog>
  );
}
