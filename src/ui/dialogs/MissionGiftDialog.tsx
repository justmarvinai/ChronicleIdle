import { useState } from 'react';
import { playSfx } from '@audio/index';
import { GEAR_SLOTS, type GearSlot } from '@content/champions/types';
import { content } from '@content/registry';
import { t, translate, type I18nKey } from '@i18n/index';
import { selectActions, selectSave } from '@state/selectors';
import { useGameStore } from '@state/store';
import { Button } from '@ui/components/Button/Button';
import { Dialog } from '@ui/components/Dialog/Dialog';
import { Dropdown } from '@ui/components/Dropdown/Dropdown';
import { GearCard } from '@ui/components/GearCard/GearCard';
import { Slot } from '@ui/components/Slot/Slot';
import { SLOT_GLYPH } from '@ui/styles/display-maps';
import { mainStatLine, pieceIcon, pieceName, setOf, slotLabel } from '@ui/gear/gear-view';
import styles from './dialogs.module.css';

/**
 * Eldric's parting gift (docs/design/QUESTS_MISSIONS.md §4): the 6★ Legendary piece the Path's
 * last chest owes, struck in the slot and set the chronicle names. It is the only piece in the
 * game the player chooses outright, so the dialog shows what was made before it closes.
 */
export function MissionGiftDialog({ onClose }: { onClose: () => void }) {
  const actions = useGameStore(selectActions);
  const save = useGameStore(selectSave);
  const [slot, setSlot] = useState<GearSlot>('weapon');
  const [setId, setSetId] = useState<string>(content.gearSets[0]?.id ?? '');
  const struck = save?.missions.gearChoice ? save.inventory[save.missions.gearChoice] : undefined;

  const strike = (): void => {
    const result = actions.takeMissionGift(slot, setId);
    if (!result.ok) {
      playSfx('ui.error');
      return;
    }
    playSfx('reward.large');
  };

  return (
    <Dialog
      title={t('missions.gearChoice.title')}
      onClose={onClose}
      width={720}
      testId="dialog-mission-gift"
      footer={
        struck ? (
          <Button variant="primary" onClick={onClose} data-testid="gift-continue">
            {t('common.continue')}
          </Button>
        ) : (
          <Button variant="primary" onClick={strike} data-testid="gift-strike">
            {t('missions.gearChoice.take')}
          </Button>
        )
      }
    >
      {struck ? (
        <div className={styles.giftResult} data-testid="gift-result">
          <GearCard
            rarity={struck.rarity}
            stars={struck.stars}
            level={struck.level}
            slot={struck.slot}
            icon={pieceIcon(struck)}
            mainStat={mainStatLine(struck)}
            setName={setOf(struck) ? t(setOf(struck)?.name as I18nKey) : struck.setId}
            size={128}
          />
          <span className={`display ${styles.giftName}`}>{pieceName(struck)}</span>
        </div>
      ) : (
        <>
          <p className={styles.body}>{t('missions.gearChoice.body')}</p>
          <div className={styles.giftRow}>
            {GEAR_SLOTS.map((entry) => (
              <Slot
                key={entry}
                size="md"
                emptyGlyph={SLOT_GLYPH[entry]}
                selected={entry === slot}
                label={slotLabel(entry)}
                onClick={() => {
                  setSlot(entry);
                  playSfx('ui.tab');
                }}
                data-testid={`gift-slot-${entry}`}
              />
            ))}
          </div>
          <Dropdown
            options={content.gearSets.map((set) => ({
              value: set.id,
              label: t(set.name as I18nKey),
            }))}
            value={setId}
            onChange={setSetId}
            label={t('forge.craft.set')}
            width={320}
          />
          <p className={styles.hint}>{translate('missions.gearChoice.names', { slot: slotLabel(slot) })}</p>
        </>
      )}
    </Dialog>
  );
}
