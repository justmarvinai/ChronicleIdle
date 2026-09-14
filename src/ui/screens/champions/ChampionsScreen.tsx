import { useEffect, useMemo, useState } from 'react';
import { playSfx } from '@audio/index';
import { sortAndFilter } from '@engine/champions/query';
import { countOwned } from '@engine/champions/roster';
import { t } from '@i18n/index';
import { selectActions, selectRoster, selectRosterView, selectSelectedChampion } from '@state/selectors';
import { useGameStore } from '@state/store';
import type { ChampionTab, Route } from '@state/ui-types';
import { AmbientLayer } from '@render/ambient/AmbientLayer';
import { Backdrop } from '@ui/components/Backdrop/Backdrop';
import { ChampionCard } from '@ui/components/ChampionCard/ChampionCard';
import { TopBar } from '@ui/components/TopBar/TopBar';
import { VirtualGrid } from '@ui/components/VirtualGrid/VirtualGrid';
import { useSceneAudio } from '@ui/hooks/useSceneAudio';
import type { ScreenProps } from '@ui/router/screens';
import { ChampionHero } from './ChampionHero';
import { ChampionPanel } from './ChampionPanel';
import { FilterBar } from './FilterBar';
import { entriesOf } from './roster-view';
import styles from './ChampionsScreen.module.css';

type ChampionsRoute = Extract<Route, { name: 'champions' }>;

const CARD = 128;
const CARD_H = Math.round(CARD * 1.28);
const COLUMNS = 4;
const GAP = 12;

/**
 * Champions index (docs/tech/UI_DESIGN.md §5.3–5.4): virtualised roster rail on the left, the
 * selected champion's portrait in the middle, Info/Abilities/Lore/Gear on the right.
 */
export default function ChampionsScreen({ route }: ScreenProps) {
  const params = route as ChampionsRoute;
  const actions = useGameStore(selectActions);
  const roster = useGameStore(selectRoster);
  const view = useGameStore(selectRosterView);
  const selectedId = useGameStore(selectSelectedChampion);
  const [tab, setTab] = useState<ChampionTab>(params.tab ?? 'info');
  useSceneAudio('hub', 'interior');

  const entries = useMemo(() => entriesOf(roster), [roster]);
  const shown = useMemo(() => sortAndFilter(entries, view), [entries, view]);
  // One handler per instance, reused across renders so memoised cards skip their re-render.
  const selectHandlers = useMemo(() => {
    const handlers = new Map<string, () => void>();
    for (const entry of entries)
      handlers.set(entry.instance.instanceId, () => actions.selectChampion(entry.instance.instanceId));
    return handlers;
  }, [entries, actions]);

  // A deep link (route.instanceId) wins once; afterwards the selection lives in the store.
  useEffect(() => {
    if (params.instanceId) actions.selectChampion(params.instanceId);
  }, [params.instanceId, actions]);

  const selected =
    (selectedId ? entries.find((e) => e.instance.instanceId === selectedId) : undefined) ??
    shown[0] ??
    entries[0];
  const copies = selected ? countOwned(roster, selected.def.id) : 0;

  return (
    <div className={styles.root} data-testid="screen-champions">
      <Backdrop asset="bg.bg5" grade="rgba(22, 18, 30, 0.5)" parallax={6} />
      <AmbientLayer preset="interior" />
      <TopBar title={t('champions.title')} onBack={() => actions.pop()} />

      <section className={styles.rail} aria-label={t('champions.title')}>
        <FilterBar
          view={view}
          onChange={(patch) => actions.setRosterView(patch)}
          shown={shown.length}
          total={entries.length}
        />
        <VirtualGrid
          items={shown}
          columns={COLUMNS}
          cellWidth={CARD}
          cellHeight={CARD_H}
          gap={GAP}
          height={772}
          keyOf={(entry) => entry.instance.instanceId}
          emptyLabel={t('champions.empty')}
          renderItem={(entry) => (
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
              selected={selected?.instance.instanceId === entry.instance.instanceId}
              locked={entry.instance.locked}
              favourite={entry.instance.favourite}
              onClick={
                selectHandlers.get(entry.instance.instanceId) ??
                (() => actions.selectChampion(entry.instance.instanceId))
              }
              testId={`roster-card-${entry.instance.instanceId}`}
            />
          )}
        />
      </section>

      {selected ? (
        <>
          <ChampionHero entry={selected} />
          <ChampionPanel
            entry={selected}
            copies={copies}
            tab={tab}
            onTab={setTab}
            onLock={(locked) => {
              playSfx(locked ? 'ui.confirm' : 'ui.cancel');
              actions.setChampionLocked(selected.instance.instanceId, locked);
            }}
            onFavourite={(favourite) => {
              playSfx(favourite ? 'ui.confirm' : 'ui.cancel');
              actions.setChampionFavourite(selected.instance.instanceId, favourite);
            }}
            onTavern={() => {
              actions.setTavernTarget(selected.instance.instanceId);
              actions.push({ name: 'tavern', instanceId: selected.instance.instanceId });
            }}
          />
        </>
      ) : null}
    </div>
  );
}
