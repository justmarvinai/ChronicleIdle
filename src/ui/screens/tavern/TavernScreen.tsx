import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { playSfx } from '@audio/index';
import type { CurrencyId } from '@content/currencies/types';
import { content } from '@content/registry';
import { sortAndFilter } from '@engine/champions/query';
import { levelCap } from '@engine/champions/stats';
import { championXpToNext } from '@engine/champions/xp';
import { previewFeed } from '@engine/progression/tavern-level';
import { findRankFood, rankRequirement } from '@engine/progression/tavern-rank';
import { tomeFor } from '@engine/progression/tavern-skills';
import { t, translate } from '@i18n/index';
import { canAffordFeed, feedCost, tavernLookupOf } from '@state/tavern';
import {
  selectActions,
  selectInventory,
  selectRoster,
  selectRosterView,
  selectSave,
  selectTavern,
} from '@state/selectors';
import { useGameStore } from '@state/store';
import type { Route, TavernTab } from '@state/ui-types';
import { AmbientLayer } from '@render/ambient/AmbientLayer';
import { Backdrop } from '@ui/components/Backdrop/Backdrop';
import { Bar } from '@ui/components/Bar/Bar';
import { ChampionCard } from '@ui/components/ChampionCard/ChampionCard';
import { StarRow } from '@ui/components/StarRow/StarRow';
import { TopBar } from '@ui/components/TopBar/TopBar';
import { VirtualGrid } from '@ui/components/VirtualGrid/VirtualGrid';
import { championAvatar } from '@ui/champions/art';
import { entriesOf } from '@ui/screens/champions/roster-view';
import { FilterBar } from '@ui/screens/champions/FilterBar';
import { useSceneAudio } from '@ui/hooks/useSceneAudio';
import { prefersReducedMotion } from '@ui/hooks/reducedMotion';
import type { ScreenProps } from '@ui/router/screens';
import { OfferingTable } from './OfferingTable';
import { TavernPanel } from './TavernPanel';
import { brewOrder, EMPTY_TABLE, foodEntries, foodWarnings } from './tavern-view';
import styles from './TavernScreen.module.css';

type TavernRoute = Extract<Route, { name: 'tavern' }>;

const CARD = 128;
const CARD_H = Math.round(CARD * 1.28);
const LEVEL_SEATS = 6;

/**
 * The Tavern (docs/tech/UI_DESIGN.md §5.5): the roster rail picks who is drinking, the table in
 * the middle holds what is being spent, and the right column runs the three tracks.
 */
export default function TavernScreen({ route }: ScreenProps) {
  const params = route as TavernRoute;
  const actions = useGameStore(selectActions);
  const save = useGameStore(selectSave);
  const roster = useGameStore(selectRoster);
  const inventory = useGameStore(selectInventory);
  const view = useGameStore(selectRosterView);
  const [tab, setTab] = useState<TavernTab>(params.tab ?? 'level');
  const table = useGameStore(selectTavern);
  const targetId = table.targetId ?? params.instanceId ?? null;
  const offering = table.offering;
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
  const cost = useMemo(() => {
    if (tab === 'rank')
      return requirement ? [{ currency: 'gold' as CurrencyId, amount: requirement.gold }] : [];
    return preview ? feedCost(preview, offering) : [];
  }, [tab, requirement, preview, offering]);

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

  if (!save || !target || !def) {
    return (
      <div className={styles.root} data-testid="screen-tavern">
        <Backdrop asset="bg.bg5" grade="rgba(30, 18, 10, 0.55)" parallax={5} />
        <TopBar title={t('tavern.title')} onBack={() => actions.pop()} />
        <p className={styles.empty}>{t('tavern.chooseChampion')}</p>
      </div>
    );
  }

  const art = championAvatar(def, 512);
  const tome = tomeFor(def.rarity);
  const tomesHeld = tome ? (save.wallet[tome] ?? 0) : 0;
  const cap = levelCap(target.stars);
  const seated = offering.food.length;

  const setFood = (food: string[]): void => actions.setTavernOffering({ ...offering, food });
  const unseat = (instanceId: string): void => setFood(offering.food.filter((id) => id !== instanceId));
  const openPicker = (): void =>
    actions.openDialog({
      name: 'food-picker',
      instanceId: target.instanceId,
      mode: tab === 'rank' ? 'rank' : 'level',
      seats,
    });

  const autoFill = (): void => {
    if (tab === 'rank') {
      const picked = findRankFood(target, tavernLookupOf(save)).map((i) => i.instanceId);
      if (picked.length === 0) {
        actions.toast('error', 'tavern.rank.none');
        return;
      }
      playSfx('ui.confirm');
      setFood(picked);
      return;
    }
    const picked = foodEntries(roster, target.instanceId, 'level')
      .slice(0, LEVEL_SEATS)
      .map((entry) => entry.instance.instanceId);
    if (picked.length === 0) {
      actions.toast('error', 'foodPicker.empty');
      return;
    }
    playSfx('ui.confirm');
    setFood(picked);
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
        <div className={styles.scene}>
          {tab === 'skills' ? null : (
            <OfferingTable
              roster={roster}
              offering={offering}
              seats={Math.ceil(seats / 2)}
              layout="flank"
              onAdd={openPicker}
              onRemove={unseat}
            />
          )}
          <div className={styles.hero}>
            {flash && !prefersReducedMotion() ? (
              <motion.span
                key={flash.id}
                className={flash.kind === 'rank' ? styles.burstGold : styles.burst}
                aria-hidden="true"
                data-testid="tavern-flash"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: [0, 0.9, 0], scale: [0.6, 1.25, 1.5] }}
                transition={{ duration: 1.1, ease: 'easeOut' }}
              />
            ) : null}
            <span
              className={styles.portrait}
              style={{ backgroundImage: `url("${art.url}")` }}
              data-testid="tavern-portrait"
              data-champion={def.id}
            >
              {art.tint ? (
                <span
                  className={styles.tint}
                  style={{
                    backgroundColor: art.tint,
                    WebkitMaskImage: `url("${art.url}")`,
                    maskImage: `url("${art.url}")`,
                  }}
                  aria-hidden="true"
                />
              ) : null}
            </span>
            <h2 className={`display ${styles.name}`}>{translate(def.name)}</h2>
            <StarRow stars={target.stars} max={6} size={22} />
            <div className={styles.levelLine}>
              <span className={`num ${styles.levelNow}`} data-testid="tavern-champion-level">
                {t('common.level', { level: target.level })}
              </span>
              <span className={`num ${styles.levelCap}`}>/ {cap}</span>
            </div>
            <Bar
              value={target.xp}
              max={target.level >= cap ? 1 : championXpToNext(target.level)}
              kind="xp"
              width={320}
              height={18}
              showNumbers
            />
          </div>

          {tab === 'skills' || seats < 2 ? null : (
            <OfferingTable
              roster={roster}
              offering={offering}
              seats={Math.floor(seats / 2)}
              offset={Math.ceil(seats / 2)}
              layout="flank"
              onAdd={openPicker}
              onRemove={unseat}
            />
          )}
        </div>

        {tab === 'level' ? (
          <OfferingTable
            roster={roster}
            offering={offering}
            seats={0}
            onAdd={openPicker}
            onRemove={unseat}
            brews={{
              order: brewOrder(def),
              held: save.wallet,
              onChange: (currency: CurrencyId, amount: number) =>
                actions.setTavernOffering({
                  ...offering,
                  brews: { ...offering.brews, [currency]: Math.max(0, amount) },
                }),
            }}
          />
        ) : null}
      </section>

      <TavernPanel
        def={def}
        instance={target}
        tab={tab}
        onTab={setTab}
        preview={preview}
        cost={cost}
        canAfford={preview ? canAffordFeed(save, preview, offering) : false}
        onUpgrade={upgrade}
        onAutoFill={autoFill}
        onClear={() => actions.setTavernOffering(EMPTY_TABLE)}
        requirement={requirement}
        seated={seated}
        canRank={Boolean(requirement) && seated === requirement?.count}
        tomesHeld={tomesHeld}
        onUpgradeSkill={upgradeSkill}
      />
    </div>
  );
}
