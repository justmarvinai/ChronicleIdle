import { useState } from 'react';
import { playSfx } from '@audio/index';
import type { ChampionId } from '@content/champions/types';
import { t, translate } from '@i18n/index';
import { choiceCandidates, copiesOf, openChampionChoices } from '@state/summon';
import { selectActions, selectSave } from '@state/selectors';
import { useGameStore } from '@state/store';
import { Button } from '@ui/components/Button/Button';
import { ChampionCard } from '@ui/components/ChampionCard/ChampionCard';
import { Dialog } from '@ui/components/Dialog/Dialog';
import { ScrollArea } from '@ui/components/ScrollArea/ScrollArea';
import type { I18nKey } from '@i18n/index';
import styles from './ChampionPickerDialog.module.css';

export interface ChampionPickerDialogProps {
  choiceId: string;
  onClose: () => void;
}

/**
 * The champion picker (docs/design/CAMPAIGN.md §7): the Intro milestone's Epic, chosen by name.
 * Everyone the choice offers is shown, owned or not — a second copy is a fine thing to want
 * (owner's answer Q8), so nothing is hidden.
 */
export function ChampionPickerDialog({ choiceId, onClose }: ChampionPickerDialogProps) {
  const actions = useGameStore(selectActions);
  const save = useGameStore(selectSave);
  const choice = save ? openChampionChoices(save).find((one) => one.id === choiceId) : undefined;
  const candidates = choice ? choiceCandidates(choice) : [];
  const [picked, setPicked] = useState<ChampionId | null>(null);
  const pickedDef = candidates.find((def) => def.id === picked);

  const bind = (): void => {
    if (!picked) return;
    const result = actions.takeChampionChoice(choiceId, picked);
    if (!result.ok) {
      playSfx('ui.error');
      return;
    }
    playSfx('stinger.levelup');
    actions.toast('reward', 'summon.toast.one', { name: t(pickedDef?.name as I18nKey) });
    onClose();
  };

  return (
    <Dialog
      title={t('picker.title')}
      onClose={onClose}
      width={1020}
      testId="dialog-champion-picker"
      footer={
        <Button disabled={!picked} onClick={bind} data-testid="picker-confirm">
          {pickedDef ? translate('picker.confirm', { name: t(pickedDef.name as I18nKey) }) : t('picker.pick')}
        </Button>
      }
    >
      <p className={styles.body}>
        {choice ? translate('portal.choice.owed', { reason: t(choice.reason as I18nKey) }) : t('picker.body')}
      </p>
      <ScrollArea height={520}>
        <ul className={styles.grid}>
          {candidates.map((def) => {
            const owned = save ? copiesOf(save, def.id) : 0;
            return (
              <li key={def.id} className={styles.cell}>
                <ChampionCard
                  name={t(def.name as I18nKey)}
                  rarity={def.rarity}
                  element={def.element}
                  role={def.role}
                  stars={0}
                  level={1}
                  avatar={def.art.avatar}
                  tint={def.art.tint}
                  placeholder={def.art.placeholder}
                  placeholderLabel={t('champions.placeholder')}
                  size={128}
                  compact
                  selected={picked === def.id}
                  onClick={() => {
                    playSfx('ui.tab');
                    setPicked(def.id);
                  }}
                  testId={`picker-champion-${def.id}`}
                />
                <span className={styles.name}>{t(def.name as I18nKey)}</span>
                {owned > 0 ? <span className={styles.owned}>{t('picker.taken')}</span> : null}
              </li>
            );
          })}
        </ul>
      </ScrollArea>
    </Dialog>
  );
}
