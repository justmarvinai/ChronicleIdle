import { playSfx } from '@audio/index';
import { GEAR_SLOTS, type GearSlot } from '@content/champions/types';
import { unlockLevel } from '@engine/progression/unlocks';
import type { RosterEntry } from '@engine/champions/query';
import type { GearInstance } from '@engine/gear/instance';
import { t, translate, type I18nKey } from '@i18n/index';
import { selectActions, selectFeatureUnlocked } from '@state/selectors';
import { useGameStore } from '@state/store';
import { AssetImage } from '@ui/components/AssetImage/AssetImage';
import { Button } from '@ui/components/Button/Button';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { Slot } from '@ui/components/Slot/Slot';
import { StarRow } from '@ui/components/StarRow/StarRow';
import { RARITY_HEX, SLOT_GLYPH } from '@ui/styles/display-maps';
import { mainStatLine, pieceIcon, pieceName, setLines } from '@ui/gear/gear-view';
import { rarityLabel } from '@ui/screens/champions/roster-view';
import styles from './GearTab.module.css';

const selectGearUnlocked = selectFeatureUnlocked('gear');

export interface GearTabProps {
  entry: RosterEntry;
}

/**
 * The champion's own rack (docs/tech/UI_DESIGN.md §5.4): six slots, what each one holds, and the
 * set bonuses the build has earned. Every slot opens the picker, where the compare happens.
 */
export function GearTab({ entry }: GearTabProps) {
  const actions = useGameStore(selectActions);
  const unlocked = useGameStore(selectGearUnlocked);
  const { instance, worn } = entry;
  const bySlot = new Map<GearSlot, GearInstance>(worn.map((piece) => [piece.slot, piece]));
  const lines = setLines(worn);

  return (
    <div className={styles.gear} data-testid="panel-gear">
      <div className={styles.powerRow}>
        <span className={`display ${styles.powerLabel}`}>{t('champions.gear.power')}</span>
        <span className={`num ${styles.power}`} data-testid="gear-power">
          {entry.power.toLocaleString('en-US')}
        </span>
      </div>

      <div className={styles.slots}>
        {GEAR_SLOTS.map((slot) => {
          const piece = bySlot.get(slot);
          const label = t(`champions.gear.slot.${slot}` as I18nKey);
          const open = (): void => {
            playSfx('ui.open');
            actions.openDialog({ name: 'gear-picker', instanceId: instance.instanceId, slot });
          };
          return (
            <div key={slot} className={styles.gearSlot} data-testid={`gear-slot-${slot}`}>
              <Slot
                size="sm"
                locked={!unlocked}
                emptyGlyph={SLOT_GLYPH[slot]}
                label={label}
                selected={!!piece}
                {...(unlocked ? { onClick: open } : {})}
              >
                {piece ? (
                  <span className={styles.piece} style={{ ['--rarity' as string]: RARITY_HEX[piece.rarity] }}>
                    <AssetImage asset={pieceIcon(piece)} size={128} className={styles.pieceArt} />
                    <span className={`num ${styles.pieceLevel}`}>
                      {t('gear.level', { level: piece.level })}
                    </span>
                  </span>
                ) : null}
              </Slot>
              <span className={`display ${styles.slotName}`}>{label}</span>
              {piece ? (
                <>
                  <span className={`num ${styles.slotMain}`} data-testid={`gear-main-${slot}`}>
                    {mainStatLine(piece)}
                  </span>
                  <span
                    className={`display ${styles.slotRarity}`}
                    style={{ color: RARITY_HEX[piece.rarity] }}
                    data-testid={`gear-rarity-${slot}`}
                  >
                    {rarityLabel(piece.rarity)}
                  </span>
                  <StarRow
                    stars={piece.stars}
                    max={6}
                    size={12}
                    tone="rarity"
                    tint={RARITY_HEX[piece.rarity]}
                  />
                  <div className={styles.slotActions}>
                    <button
                      type="button"
                      className={styles.action}
                      data-testid={`gear-remove-${slot}`}
                      onMouseEnter={() => playSfx('ui.hover')}
                      onClick={() => {
                        playSfx('ui.cancel');
                        const result = actions.unequipGear(instance.instanceId, slot);
                        if (result.ok)
                          actions.toast('info', 'armoury.unequipped', {
                            piece: pieceName(result.value),
                          });
                      }}
                    >
                      {t('champions.gear.remove')}
                    </button>
                    <button
                      type="button"
                      className={styles.action}
                      data-testid={`gear-upgrade-${slot}`}
                      onMouseEnter={() => playSfx('ui.hover')}
                      onClick={() => {
                        // Worn gear is not in the armoury any more, so its bench is reached from
                        // here — from the champion it is being upgraded for.
                        playSfx('ui.open');
                        actions.push({ name: 'armoury', pieceId: piece.instanceId });
                      }}
                    >
                      {t('champions.gear.upgrade')}
                    </button>
                  </div>
                </>
              ) : (
                <span className={styles.slotEmpty}>{t('champions.gear.empty')}</span>
              )}
            </div>
          );
        })}
      </div>

      <h3 className={`display ${styles.section}`}>{t('champions.gear.sets')}</h3>
      {lines.length === 0 ? (
        <p className={styles.note} data-testid="gear-sets-none">
          {t('champions.gear.sets.none')}
        </p>
      ) : (
        <ul className={styles.sets} data-testid="gear-sets">
          {lines.map(({ group, missing }) => (
            <li key={group.set.id} className={styles.set} data-testid={`gear-set-${group.set.id}`}>
              <div className={styles.setHead}>
                <span className={`display ${styles.setName}`}>{translate(group.set.name)}</span>
                {group.groups > 0 ? (
                  <span className={`num ${styles.setActive}`}>
                    {t('champions.gear.sets.active', { count: group.groups })}
                  </span>
                ) : (
                  <span className={styles.setNext}>{t('champions.gear.sets.next', { count: missing })}</span>
                )}
              </div>
              <p className={styles.setBody}>{translate(group.set.description)}</p>
            </li>
          ))}
        </ul>
      )}

      {unlocked ? (
        <Button
          variant="secondary"
          size="sm"
          className={styles.armoury}
          onClick={() => actions.push({ name: 'armoury' })}
          data-testid="gear-open-armoury"
        >
          {t('champions.gear.armoury')}
        </Button>
      ) : (
        <p className={styles.note}>
          <Glyph glyph="glyph.broken_shackle" size={22} color="var(--gold-2)" />
          <span>{t('champions.gear.locked', { level: unlockLevel('gear') })}</span>
        </p>
      )}
    </div>
  );
}
