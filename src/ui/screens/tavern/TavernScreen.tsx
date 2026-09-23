import { useEffect, useMemo, useRef, useState } from 'react';
import { playSfx } from '@audio/index';
import type { CurrencyAmount, CurrencyId } from '@content/currencies/types';
import { content } from '@content/registry';
import { sortAndFilter } from '@engine/champions/query';
import { levelCap, maxStars } from '@engine/champions/stats';
import { wornBy } from '@engine/gear/equip';
import { brewsToCap, previewFeed } from '@engine/progression/tavern-level';
import { findRankFood, rankRequirement } from '@engine/progression/tavern-rank';
import { tomeFor } from '@engine/progression/tavern-skills';
import { t, translate } from '@i18n/index';
import { feedCost, tavernLookupOf } from '@state/tavern';
import {
  palaceBonusOf,
  selectActions,
  selectInventory,
  selectPalaceNodes,
  selectRoster,
  selectRosterView,
  selectSave,
  selectTavern,
} from '@state/selectors';
import { useGameStore } from '@state/store';
import type { Route, TavernTab } from '@state/ui-types';
import { AmbientLayer } from '@render/ambient/AmbientLayer';
import { Backdrop } from '@ui/components/Backdrop/Backdrop';
import { ChampionCard } from '@ui/components/ChampionCard/ChampionCard';
import { TopBar } from '@ui/components/TopBar/TopBar';
import { VirtualGrid } from '@ui/components/VirtualGrid/VirtualGrid';
import { entriesOf } from '@ui/screens/champions/roster-view';
import { FilterBar } from '@ui/screens/champions/FilterBar';
import { useSceneAudio } from '@ui/hooks/useSceneAudio';
import type { ScreenProps } from '@ui/router/screens';
import { BrewShelf } from './BrewShelf';
import { LevelGauge } from './LevelGauge';
import { LevelTrack } from './LevelTrack';
import { OfferingTable } from './OfferingTable';
import { RankSpares } from './RankSpares';
import { RankTrack } from './RankTrack';
import { SkillsTrack } from './SkillsTrack';
import { TavernHero } from './TavernHero';
import { TavernPanel } from './TavernPanel';
import { TomeShelf } from './TomeShelf';
import {
  autoFillLevel,
  brewOrder,
  EMPTY_TABLE,
  foodEntries,
  foodWarnings,
  growthPreview,
  levelPosition,
  levelPositionAfter,
  tableXp,
} from './tavern-view';
import styles from './TavernScreen.module.css';

type TavernRoute = Extract<Route, { name: 'tavern' }>;

const CARD = 128;
const CARD_H = Math.round(CARD * 1.28);
const LEVEL_SEATS = 6;

/**
 * The Tavern (docs/tech/UI_DESIGN.md §5.5): the roster rail picks who is drinking; the champion
 * sits framed between the seats, the road to the level cap under them and the brew shelf (or the
 * rank-up's larder, or the tomes) below that; the right column reckons the track and presses it.
 */
export default function TavernScreen({ route }: ScreenProps) {
  const params = route as TavernRoute;
  const actions = useGameStore(selectActions);
  const save = useGameStore(selectSave);
  const roster = useGameStore(selectRoster);
  const inventory = useGameStore(selectInventory);
  const view = useGameStore(selectRosterView);
  const nodes = useGameStore(selectPalaceNodes);
  const palace = useMemo(() => palaceBonusOf(nodes), [nodes]);
  const [tab, setTab] = useState<TavernTab>(params.tab ?? 'level');
  const tavern = useGameStore(selectTavern);
  const targetId = tavern.targetId ?? params.instanceId ?? null;
  const offering = tavern.offering;
  useSceneAudio('hub', 'interior');

  const entries = useMemo(() => entriesOf(roster, inventory), [roster, inventory]);
  const shown = useMemo(() => sortAndFilter(entries, view), [entries, view]);
  const target = (targetId ? roster[targetId] : undefined) ?? shown[0]?.instance ?? entries[0]?.instance;
  const def = target ? content.championById(target.defId) : undefined;

  // Changing track clears the table: a rank-up's food is not a level-up's, and vice versa.
  useEffect(() => {
    actions.setTavernOffering(EMPTY_TABLE);
  }, [tab, actions]);

  const preview = useMemo(() => {
    if (!save || !target || tab !== 'level') return null;
    if (offering.food.length === 0 && Object.values(offering.brews).every((n) => !n)) return null;
    const result = previewFeed(target, offering, tavernLookupOf(save));
    return result.ok ? result.value : null;
  }, [save, target, offering, tab]);

  const requirement = target ? rankRequirement(target.stars) : null;
  const seats = tab === 'rank' ? (requirement?.count ?? 0) : LEVEL_SEATS;
  const table = useMemo(() => (def ? tableXp(offering, roster, def.element) : null), [offering, roster, def]);
  const worn = useMemo(() => (target ? wornBy(target, inventory) : []), [target, inventory]);
  const levelGrowth = useMemo(
    () =>
      def && target && preview && preview.levelsGained > 0
        ? growthPreview(def, target, { stars: target.stars, level: preview.level }, worn, palace)
        : null,
    [def, target, preview, worn, palace],
  );
  const rankGrowth = useMemo(
    () =>
      def && target && requirement && tab === 'rank'
        ? growthPreview(def, target, { stars: requirement.to, level: target.level }, worn, palace)
        : null,
    [def, target, requirement, tab, worn, palace],
  );
  const spares = useMemo(
    () => (target && tab === 'rank' ? foodEntries(roster, target.instanceId, 'rank') : []),
    [roster, target, tab],
  );

  const cost = useMemo((): CurrencyAmount[] => {
    if (tab === 'rank') return requirement ? [{ currency: 'gold', amount: requirement.gold }] : [];
    return preview ? feedCost(preview, offering) : [];
  }, [tab, requirement, preview, offering]);
  const short = useMemo(
    () => cost.find((entry) => (save?.wallet[entry.currency] ?? 0) < entry.amount)?.currency ?? null,
    [cost, save],
  );

  // The champion's own numbers drive the celebration: whoever changed them, the Tavern reacts.
  const seenLevel = useRef(target?.level ?? 0);
  const seenStars = useRef(target?.stars ?? 0);
  const [flash, setFlash] = useState<{ id: number; kind: 'level' | 'rank' } | null>(null);
  useEffect(() => {
    if (!target) return;
    if (target.level > seenLevel.current && seenStars.current === target.stars) {
      setFlash({ id: Date.now(), kind: 'level' });
      playSfx('stinger.levelup');
    } else if (target.stars > seenStars.current) {
      setFlash({ id: Date.now(), kind: 'rank' });
      playSfx('reward.large');
    }
    seenLevel.current = target.level;
    seenStars.current = target.stars;
  }, [target?.level, target?.stars, target]);

  if (!save || !target || !def || !table) {
    return (
      <div className={styles.root} data-testid="screen-tavern">
        <Backdrop asset="bg.bg5" grade="rgba(30, 18, 10, 0.55)" parallax={5} />
        <TopBar title={t('tavern.title')} onBack={() => actions.pop()} />
        <p className={styles.empty}>{t('tavern.chooseChampion')}</p>
      </div>
    );
  }

  const tome = tomeFor(def.rarity);
  const tomesHeld = tome ? (save.wallet[tome] ?? 0) : 0;
  const atCap = target.level >= levelCap(target.stars);
  const complete = atCap && target.stars >= maxStars(def.rarity);
  const seated = offering.food.length;
  const closed = tab === 'level' && atCap;

  const setFood = (food: string[]): void => actions.setTavernOffering({ ...offering, food });
  const unseat = (instanceId: string): void => setFood(offering.food.filter((id) => id !== instanceId));
  const openPicker = (): void =>
    actions.openDialog({
      name: 'food-picker',
      instanceId: target.instanceId,
      mode: tab === 'rank' ? 'rank' : 'level',
      seats,
    });
  const toggleSpare = (instanceId: string): void => {
    if (offering.food.includes(instanceId)) {
      playSfx('ui.cancel');
      unseat(instanceId);
    } else if (seated < seats) {
      playSfx('ui.tab');
      setFood([...offering.food, instanceId]);
    } else {
      playSfx('ui.error');
    }
  };

  const autoFillRank = (): void => {
    const picked = findRankFood(target, tavernLookupOf(save)).map((i) => i.instanceId);
    if (picked.length === 0) {
      actions.toast('error', 'tavern.rank.none');
      return;
    }
    playSfx('ui.confirm');
    setFood(picked);
  };
  const fillSeats = (): void => {
    const picked = autoFillLevel(roster, target, table.brews.xp, LEVEL_SEATS);
    if (picked.length === 0) {
      actions.toast('error', 'tavern.autofill.none');
      return;
    }
    playSfx('ui.confirm');
    setFood(picked);
  };
  const pour = (): void => {
    const brews = brewsToCap(target, def.element, save.wallet, table.food.xp);
    if (Object.keys(brews).length === 0) {
      actions.toast('error', 'tavern.pour.none');
      return;
    }
    playSfx('ui.confirm');
    actions.setTavernOffering({ ...offering, brews });
  };

  const upgrade = (): void => {
    const warnings = foodWarnings(roster, offering.food);
    if (warnings.length > 0) {
      actions.openDialog({
        name: 'tavern-confirm',
        kind: tab === 'rank' ? 'rank' : 'level',
        instanceId: target.instanceId,
        food: [...offering.food],
        brews: { ...offering.brews } as Record<string, number>,
      });
      return;
    }
    commit();
  };

  const commit = (): void => {
    const result =
      tab === 'rank'
        ? actions.rankUpChampion(target.instanceId, offering.food)
        : actions.feedChampion(target.instanceId, offering);
    if (!result.ok) {
      actions.toast('error', 'tavern.refused', { reason: result.error.message });
      return;
    }
    actions.setTavernOffering(EMPTY_TABLE);
    if ('stars' in result.value)
      actions.toast('reward', 'tavern.ranked', {
        name: translate(def.name),
        stars: result.value.stars,
      });
    else actions.toast('reward', 'tavern.fed', { name: translate(def.name), level: result.value.level });
  };

  const upgradeSkill = (abilityId: string): void => {
    const result = actions.upgradeChampionSkill(target.instanceId, abilityId);
    if (!result.ok) {
      actions.toast('error', 'tavern.refused', { reason: result.error.message });
      return;
    }
    playSfx('ui.confirm');
    const ability = def.abilities.find((a) => a.id === abilityId);
    actions.toast('reward', 'tavern.skilled', {
      name: translate(def.name),
      ability: ability ? translate(ability.name) : abilityId,
      step: result.value.step,
    });
  };

  const left = Math.ceil(seats / 2);
  const seatColumn = (count: number, offset: number) =>
    tab === 'skills' || count === 0 ? null : (
      <OfferingTable
        roster={roster}
        offering={offering}
        seats={count}
        offset={offset}
        mode={tab === 'rank' ? 'rank' : 'level'}
        foodStars={requirement?.foodStars}
        closed={closed}
        onAdd={openPicker}
        onRemove={unseat}
      />
    );

  return (
    <div className={styles.root} data-testid="screen-tavern">
      <Backdrop asset="bg.bg5" grade="rgba(30, 18, 10, 0.5)" parallax={5} />
      <AmbientLayer preset="interior" />
      <TopBar title={t('tavern.title')} onBack={() => actions.pop()} />

      <section className={styles.rail} aria-label={t('champions.title')} data-testid="tavern-rail">
        <FilterBar
          view={view}
          onChange={(patch) => actions.setRosterView(patch)}
          shown={shown.length}
          total={entries.length}
        />
        <VirtualGrid
          items={shown}
          columns={4}
          cellWidth={CARD}
          cellHeight={CARD_H}
          gap={10}
          height={720}
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
              selected={entry.instance.instanceId === target.instanceId}
              locked={entry.instance.locked}
              favourite={entry.instance.favourite}
              onClick={() => (playSfx('ui.tab'), actions.setTavernTarget(entry.instance.instanceId))}
              testId={`tavern-card-${entry.instance.instanceId}`}
            />
          )}
        />
      </section>

      <section className={styles.stage}>
        <div className={styles.table}>
          <div className={styles.seats}>{seatColumn(left, 0)}</div>
          <TavernHero def={def} instance={target} flash={flash} />
          <div className={styles.seats}>{seatColumn(seats - left, left)}</div>
        </div>

        <LevelGauge
          level={target.level}
          xp={target.xp}
          stars={target.stars}
          now={levelPosition(target)}
          after={preview ? levelPositionAfter(target, preview.xp) : levelPosition(target)}
          wasted={preview?.wasted ?? 0}
        />

        <div className={styles.shelf}>
          {tab === 'level' ? (
            <BrewShelf
              order={brewOrder(def)}
              element={def.element}
              held={save.wallet}
              poured={offering.brews}
              closed={atCap}
              onChange={(currency: CurrencyId, amount: number) =>
                actions.setTavernOffering({
                  ...offering,
                  brews: { ...offering.brews, [currency]: Math.max(0, amount) },
                })
              }
            />
          ) : null}
          {tab === 'rank' && requirement ? (
            <RankSpares
              spares={spares}
              seated={offering.food}
              seats={seats}
              foodStars={requirement.foodStars}
              onToggle={toggleSpare}
            />
          ) : null}
          {tab === 'skills' ? <TomeShelf def={def} tomesHeld={tomesHeld} /> : null}
        </div>
      </section>

      <TavernPanel
        tab={tab}
        onTab={setTab}
        cost={cost}
        short={short}
        ready={
          tab === 'level'
            ? preview !== null && !preview.atCap
            : requirement !== null && seated === requirement.count
        }
        onUpgrade={upgrade}
      >
        {tab === 'level' ? (
          <LevelTrack
            def={def}
            instance={target}
            preview={preview}
            table={table}
            growth={levelGrowth}
            atCap={atCap}
            complete={complete}
            onToRank={() => setTab('rank')}
            onPour={pour}
            onFill={fillSeats}
            onClear={() => actions.setTavernOffering(EMPTY_TABLE)}
          />
        ) : null}
        {tab === 'rank' ? (
          <RankTrack
            def={def}
            instance={target}
            requirement={requirement}
            seated={seated}
            spares={spares.length}
            growth={rankGrowth}
            onAutoFill={autoFillRank}
            onClear={() => actions.setTavernOffering(EMPTY_TABLE)}
          />
        ) : null}
        {tab === 'skills' ? (
          <SkillsTrack def={def} instance={target} tomesHeld={tomesHeld} onUpgradeSkill={upgradeSkill} />
        ) : null}
      </TavernPanel>
    </div>
  );
}
