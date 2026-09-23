import { useMemo, useState } from 'react';
import { playSfx } from '@audio/index';
import type { GearSlot } from '@content/champions/types';
import { content } from '@content/registry';
import { wornBy } from '@engine/gear/equip';
import { DEFAULT_GEAR_VIEW, equipCandidates, gearEntries, sortAndFilterGear } from '@engine/gear/query';
import { t, translate } from '@i18n/index';
import {
  selectActions,
  selectGearView,
  selectInventory,
  selectRoster,
  selectPalaceNodes,
  palaceBonusOf,
} from '@state/selectors';
import { useGameStore } from '@state/store';
import { Button } from '@ui/components/Button/Button';
import { Dialog } from '@ui/components/Dialog/Dialog';
import { GearCard } from '@ui/components/GearCard/GearCard';
import { ScrollArea } from '@ui/components/ScrollArea/ScrollArea';
import { SetEmblem } from '@ui/components/SetEmblem/SetEmblem';
import {
  compareEquip,
  formatStat,
  mainStatLine,
  pieceArtwork,
  pieceName,
  setOf,
  slotLabel,
  statLabel,
} from '@ui/gear/gear-view';
import styles from './GearPickerDialog.module.css';

/** The emblem leading a set the swap makes or breaks, in CSS pixels. */
const SET_LINE_EMBLEM = 22;

export interface GearPickerDialogProps {
  instanceId: string;
  slot: GearSlot;
  onClose: () => void;
}

/**
 * The equip flow (docs/design/GEAR.md §7): the racks filtered to one slot, and a before/after panel
 * for the piece under the cursor.
 *
 * There is no "take it from somebody" confirmation any more, because there is nothing to take: the
 * picker only offers pieces no champion is wearing (the owner's first batch). What used to be
 * offered here made the armoury look twice its real size.
 */
export function GearPickerDialog({ instanceId, slot, onClose }: GearPickerDialogProps) {
  const actions = useGameStore(selectActions);
  const roster = useGameStore(selectRoster);
  const inventory = useGameStore(selectInventory);
  const view = useGameStore(selectGearView);
  const [chosenId, setChosen] = useState<string | null>(null);

  const champion = roster[instanceId];
  const def = champion ? content.championById(champion.defId) : undefined;
  const worn = useMemo(() => (champion ? wornBy(champion, inventory) : []), [champion, inventory]);
  const candidates = useMemo(() => {
    const entries = equipCandidates(gearEntries(inventory, roster), slot);
    // The racks' own sort, none of their filters: a picker that hides a candidate is a trap.
    return sortAndFilterGear(entries, { ...view, filters: DEFAULT_GEAR_VIEW.filters });
  }, [inventory, roster, slot, view]);

  const chosen = chosenId ? (candidates.find((e) => e.piece.instanceId === chosenId) ?? null) : null;
  const replaced = worn.find((piece) => piece.slot === slot) ?? null;
  const nodes = useGameStore(selectPalaceNodes);
  const palace = useMemo(() => palaceBonusOf(nodes), [nodes]);
  const compare =
    champion && def ? compareEquip(def, champion, worn, slot, chosen?.piece ?? null, palace) : null;

  const equip = (): void => {
    if (!chosen) return;
    const result = actions.equipGear(instanceId, chosen.piece.instanceId);
    if (!result.ok) {
      playSfx('ui.error');
      return;
    }
    playSfx('reward.small');
    actions.toast('info', 'armoury.equipped', {
      piece: pieceName(result.value.piece),
      name: def ? translate(def.name) : instanceId,
    });
    onClose();
  };

  return (
    <Dialog
      title={t('gearPicker.title', { slot: slotLabel(slot) })}
      onClose={onClose}
      width={1180}
      testId="dialog-gear-picker"
    >
      <div className={styles.body}>
        <section className={styles.racks} aria-label={t('gearPicker.title', { slot: slotLabel(slot) })}>
          {candidates.length === 0 ? (
            <p className={styles.empty} data-testid="gear-picker-empty">
              {t('gearPicker.empty', { slot: slotLabel(slot) })}
            </p>
          ) : (
            <ScrollArea height={460} className={styles.scroll} data-testid="gear-picker-list">
              <div className={styles.grid}>
                {candidates.map((entry) => {
                  const set = setOf(entry.piece);
                  return (
                    <GearCard
                      key={entry.piece.instanceId}
                      rarity={entry.piece.rarity}
                      stars={entry.piece.stars}
                      level={entry.piece.level}
                      slot={entry.piece.slot}
                      {...pieceArtwork(entry.piece)}
                      mainStat={mainStatLine(entry.piece)}
                      setName={set ? translate(set.name) : entry.piece.setId}
                      size={128}
                      selected={chosenId === entry.piece.instanceId}
                      locked={entry.piece.locked}
                      onClick={() => setChosen(entry.piece.instanceId)}
                    />
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </section>

        <aside className={styles.compare} data-testid="gear-compare">
          {!compare || !chosen ? (
            <p className={styles.empty}>{t('gearPicker.choose')}</p>
          ) : (
            <>
              <h3 className={`display ${styles.name}`} data-testid="gear-compare-name">
                {pieceName(chosen.piece)}
              </h3>
              <p className={styles.note}>
                {replaced
                  ? t('gearPicker.replaces', { piece: pieceName(replaced) })
                  : t('gearPicker.replacesNothing')}
              </p>
              <p className={`num ${styles.power}`} data-testid="gear-compare-power">
                {t('gearPicker.powerDelta', {
                  from: compare.power.before.toLocaleString('en-US'),
                  to: compare.power.after.toLocaleString('en-US'),
                })}
              </p>
              <h4 className={styles.section}>{t('gearPicker.compare')}</h4>
              <dl className={styles.rows}>
                {compare.rows.map((row) => (
                  <div key={row.stat} className={styles.row} data-testid={`compare-${row.stat}`}>
                    <dt className={styles.stat}>{statLabel(row.stat)}</dt>
                    <dd className={`num ${styles.before}`}>{formatStat(row.stat, row.before)}</dd>
                    <dd className={`num ${styles.after}`} data-delta={sign(row.delta)}>
                      {formatStat(row.stat, row.after)}
                    </dd>
                  </div>
                ))}
              </dl>
              {compare.gained.map((set) => (
                <p key={set.id} className={styles.gain} data-testid={`set-gain-${set.id}`}>
                  <SetEmblem emblem={set.emblem} size={SET_LINE_EMBLEM} />
                  <span>{t('gearPicker.setGain', { set: translate(set.name) })}</span>
                </p>
              ))}
              {compare.lost.map((set) => (
                <p key={set.id} className={styles.loss} data-testid={`set-loss-${set.id}`}>
                  <SetEmblem emblem={set.emblem} size={SET_LINE_EMBLEM} />
                  <span>{t('gearPicker.setLoss', { set: translate(set.name) })}</span>
                </p>
              ))}
            </>
          )}
        </aside>
      </div>

      <footer className={styles.footer}>
        <Button variant="primary" size="lg" disabled={!chosen} onClick={equip} data-testid="gear-equip">
          {t('gearPicker.equip')}
        </Button>
      </footer>
    </Dialog>
  );
}

function sign(delta: number): 'up' | 'down' | 'flat' {
  if (delta > 0) return 'up';
  if (delta < 0) return 'down';
  return 'flat';
}
