import { useEffect, useMemo, type ReactNode } from 'react';
import { playSfx } from '@audio/index';
import { INVENTORY_CAPACITY, INVENTORY_OVERFLOW, INVENTORY_WARN_AT } from '@content/balance/gear';
import { content } from '@content/registry';
import type { GearInstance } from '@engine/gear/instance';
import { gearEntries, groupBySet, inArmoury, sortAndFilterGear, type GearEntry } from '@engine/gear/query';
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
import { Button } from '@ui/components/Button/Button';
import { GearCard } from '@ui/components/GearCard/GearCard';
import { SetEmblem } from '@ui/components/SetEmblem/SetEmblem';
import { TopBar } from '@ui/components/TopBar/TopBar';
import { VirtualGrid } from '@ui/components/VirtualGrid/VirtualGrid';
import { useSceneAudio } from '@ui/hooks/useSceneAudio';
import type { ScreenProps } from '@ui/router/screens';
import { mainStatLine, pieceArtwork, pieceName, setOf, wearerName } from '@ui/gear/gear-view';
import { pieceTooltip } from '@ui/gear/piece-tooltip';
import { GearDetail } from './GearDetail';
import { GearFilterBar } from './GearFilterBar';
import styles from './ArmouryScreen.module.css';

type ArmouryRoute = Extract<Route, { name: 'armoury' }>;

const CARD = 128;
const CARD_H = Math.round(CARD * 1.18);
const COLUMNS = 8;
const GAP = 12;
const RACK_H = 700;
/** A set's heading row: the crest sits at its foot, and the rest is the break above it. */
const SET_HEAD = 66;

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
  // The racks hold what nobody is wearing. A worn piece still reaches the bench below, by the deep
  // link its champion's rack uses to send it here for an upgrade.
  const racked = useMemo(() => entries.filter(inArmoury), [entries]);
  const shown = useMemo(() => sortAndFilterGear(racked, view), [racked, view]);
  // Sorted by set, the racks are read as sets: each run under its own crest (the owner's first
  // batch). Any other sort is one straight grid, because a heading per set would fight the order.
  const sections = useMemo(
    () =>
      view.sort === 'set'
        ? groupBySet(shown).map((group) => ({ id: group.setId, items: group.entries }))
        : null,
    [shown, view.sort],
  );

  // A deep link picks the piece once; afterwards the bench keeps whatever was last chosen.
  useEffect(() => {
    if (params.pieceId) actions.selectGearPiece(params.pieceId);
  }, [params.pieceId, actions]);

  const selected =
    (selectedId ? entries.find((e) => e.piece.instanceId === selectedId) : undefined) ?? shown[0] ?? null;

  const held = entries.length;
  const warn = held >= Math.floor(INVENTORY_CAPACITY * INVENTORY_WARN_AT);
  const full = held >= INVENTORY_CAPACITY;

  // Everything the grid needs but the shape of it: grouped and flat draw the same card.
  const grid = {
    columns: COLUMNS,
    cellWidth: CARD,
    cellHeight: CARD_H,
    gap: GAP,
    height: RACK_H,
    keyOf: (entry: GearEntry) => entry.piece.instanceId,
    emptyLabel: held === 0 ? t('armoury.empty') : t('armoury.noMatch'),
    renderItem: (entry: GearEntry): ReactNode => (
      <GearCard
        rarity={entry.piece.rarity}
        stars={entry.piece.stars}
        level={entry.piece.level}
        slot={entry.piece.slot}
        {...pieceArtwork(entry.piece)}
        {...pieceTooltip(entry.piece)}
        mainStat={mainStatLine(entry.piece)}
        setName={setName(entry.piece)}
        size={CARD}
        selected={selected?.piece.instanceId === entry.piece.instanceId}
        locked={entry.piece.locked}
        onClick={() => actions.selectGearPiece(entry.piece.instanceId)}
      />
    ),
  };

  return (
    <div className={styles.root} data-testid="screen-armoury">
      <Backdrop asset="bg.bg5" grade="rgba(26, 20, 16, 0.5)" parallax={6} />
      <AmbientLayer preset="interior" />
      <TopBar title={t('armoury.title')} onBack={() => actions.pop()}>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => actions.push({ name: 'forge' })}
          data-testid="armoury-forge"
        >
          {t('armoury.forge')}
        </Button>
      </TopBar>

      <section className={styles.racks} aria-label={t('armoury.title')} data-testid="armoury-racks">
        <GearFilterBar
          view={view}
          onChange={(patch) => actions.setGearView(patch)}
          shown={shown.length}
          total={racked.length}
        />
        {sections ? (
          <VirtualGrid
            {...grid}
            sections={sections}
            headerHeight={SET_HEAD}
            renderHeader={(section) => <SetHeading setId={section.id} count={section.items.length} />}
          />
        ) : (
          <VirtualGrid {...grid} items={shown} />
        )}
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
          key={selected.piece.instanceId}
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

/** The emblem leading a set's heading, in CSS pixels. */
const HEADING_EMBLEM = 36;

/**
 * What separates one set's run from the next: its emblem, its name, how many pieces a complete
 * group takes, and how many of them are on the racks right now.
 */
function SetHeading({ setId, count }: { setId: string; count: number }) {
  const set = content.gearSetById(setId);
  return (
    <h3 className={styles.setHead} data-testid={`armoury-set-${setId}`}>
      {set ? <SetEmblem emblem={set.emblem} size={HEADING_EMBLEM} /> : null}
      <span className={`display ${styles.setName}`}>{set ? translate(set.name) : setId}</span>
      {set ? <span className={styles.setSize}>{t('armoury.set.pieces', { pieces: set.pieces })}</span> : null}
      <span className={`num ${styles.setCount}`}>{t('armoury.set.held', { count })}</span>
    </h3>
  );
}
