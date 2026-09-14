import { useEffect, useMemo } from 'react';
import { playSfx } from '@audio/index';
import { INVENTORY_CAPACITY, INVENTORY_OVERFLOW, INVENTORY_WARN_AT } from '@content/balance/gear';
import type { GearInstance } from '@engine/gear/instance';
import { gearEntries, sortAndFilterGear } from '@engine/gear/query';
import { t, translate } from '@i18n/index';
import {
  selectActions,
  selectGearView,
  selectInventory,
  selectRoster,
  selectSelectedPiece,
} from '@state/selectors';
import { useGameStore } from '@state/store';
import type { Route } from '@state/ui-types';
import { AmbientLayer } from '@render/ambient/AmbientLayer';
import { Backdrop } from '@ui/components/Backdrop/Backdrop';
import { Bar } from '@ui/components/Bar/Bar';
import { GearCard } from '@ui/components/GearCard/GearCard';
import { TopBar } from '@ui/components/TopBar/TopBar';
import { VirtualGrid } from '@ui/components/VirtualGrid/VirtualGrid';
import { useSceneAudio } from '@ui/hooks/useSceneAudio';
import type { ScreenProps } from '@ui/router/screens';
import { mainStatLine, pieceIcon, pieceName, setOf, wearerName } from '@ui/gear/gear-view';
import { GearDetail } from './GearDetail';
import { GearFilterBar } from './GearFilterBar';
import styles from './ArmouryScreen.module.css';

type ArmouryRoute = Extract<Route, { name: 'armoury' }>;

const CARD = 128;
const CARD_H = Math.round(CARD * 1.18);
const COLUMNS = 8;
const GAP = 12;

/**
 * The Armoury (docs/tech/UI_DESIGN.md §5.11, the *Inventory* tab the Forge will grow around in
 * Phase 7): the racks on the left with their filters and capacity band, one piece on the bench.
 */
export default function ArmouryScreen({ route }: ScreenProps) {
  const params = route as ArmouryRoute;
  const actions = useGameStore(selectActions);
  const inventory = useGameStore(selectInventory);
  const roster = useGameStore(selectRoster);
  const view = useGameStore(selectGearView);
  const selectedId = useGameStore(selectSelectedPiece);
  useSceneAudio('hub', 'interior');

  const entries = useMemo(() => gearEntries(inventory, roster), [inventory, roster]);
  const shown = useMemo(() => sortAndFilterGear(entries, view), [entries, view]);

  // A deep link picks the piece once; afterwards the bench keeps whatever was last chosen.
  useEffect(() => {
    if (params.pieceId) actions.selectGearPiece(params.pieceId);
  }, [params.pieceId, actions]);

  const selected =
    (selectedId ? entries.find((e) => e.piece.instanceId === selectedId) : undefined) ?? shown[0] ?? null;

  const held = entries.length;
  const warn = held >= Math.floor(INVENTORY_CAPACITY * INVENTORY_WARN_AT);
  const full = held >= INVENTORY_CAPACITY;

  return (
    <div className={styles.root} data-testid="screen-armoury">
      <Backdrop asset="bg.bg5" grade="rgba(26, 20, 16, 0.5)" parallax={6} />
      <AmbientLayer preset="interior" />
      <TopBar title={t('armoury.title')} onBack={() => actions.pop()} />

      <section className={styles.racks} aria-label={t('armoury.title')}>
        <GearFilterBar
          view={view}
          onChange={(patch) => actions.setGearView(patch)}
          shown={shown.length}
          total={entries.length}
        />
        <VirtualGrid
          items={shown}
          columns={COLUMNS}
          cellWidth={CARD}
          cellHeight={CARD_H}
          gap={GAP}
          height={700}
          keyOf={(entry) => entry.piece.instanceId}
          emptyLabel={held === 0 ? t('armoury.empty') : t('armoury.noMatch')}
          renderItem={(entry) => (
            <GearCard
              rarity={entry.piece.rarity}
              stars={entry.piece.stars}
              level={entry.piece.level}
              slot={entry.piece.slot}
              icon={pieceIcon(entry.piece)}
              mainStat={mainStatLine(entry.piece)}
              setName={setName(entry.piece)}
              size={CARD}
              selected={selected?.piece.instanceId === entry.piece.instanceId}
              locked={entry.piece.locked}
              onClick={() => actions.selectGearPiece(entry.piece.instanceId)}
            />
          )}
        />
        <footer className={styles.capacity} data-testid="armoury-capacity">
          <Bar
            value={Math.min(held, INVENTORY_CAPACITY)}
            max={INVENTORY_CAPACITY}
            kind={full ? 'health' : 'stamina'}
            height={26}
            width="100%"
            label={t('armoury.capacity', { count: held, cap: INVENTORY_CAPACITY })}
          />
          {full ? (
            <p className={styles.warn} role="status" data-testid="armoury-capacity-full">
              {t('armoury.capacityFull', {
                cap: INVENTORY_CAPACITY,
                overflow: INVENTORY_OVERFLOW,
              })}
            </p>
          ) : warn ? (
            <p className={styles.warn} role="status" data-testid="armoury-capacity-warn">
              {t('armoury.capacityWarn', { count: held, cap: INVENTORY_CAPACITY })}
            </p>
          ) : null}
        </footer>
      </section>

      {selected ? (
        <GearDetail
          piece={selected.piece}
          wearer={selected.wearer}
          wearerName={wearerName(selected.wearer)}
          onUnequip={() => {
            if (!selected.wearer) return;
            playSfx('ui.cancel');
            const result = actions.unequipGear(selected.wearer.instanceId, selected.piece.slot);
            if (result.ok) actions.toast('info', 'armoury.unequipped', { piece: pieceName(result.value) });
          }}
          onOpenWearer={() => {
            if (!selected.wearer) return;
            actions.selectChampion(selected.wearer.instanceId);
            actions.push({
              name: 'champions',
              instanceId: selected.wearer.instanceId,
              tab: 'gear',
            });
          }}
        />
      ) : (
        <aside className={styles.emptyBench} data-testid="armoury-no-selection">
          <p>{held === 0 ? t('armoury.empty') : t('armoury.choose')}</p>
        </aside>
      )}
    </div>
  );
}

function setName(piece: GearInstance): string {
  const set = setOf(piece);
  return set ? translate(set.name) : piece.setId;
}
