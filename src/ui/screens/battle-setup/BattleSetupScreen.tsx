import { useCallback, useMemo, useState } from 'react';
import { content } from '@content/registry';
import { playSfx } from '@audio/index';
import { AUTO_REPEAT_TIERS } from '@content/balance/campaign';
import { dungeonBand } from '@content/balance/dungeon';
import type { FeatureId } from '@content/balance/unlocks';
import { sanitizeTeam, suggestTeam } from '@engine/battle/teams';
import { parseBossEncounterId } from '@engine/bosses/encounter';
import { parseBreweryEncounterId } from '@engine/brewery/encounter';
import { bestTurnsOf, starsOf } from '@engine/campaign/progress';
import { autoRepeatTiers } from '@engine/campaign/run';
import { parseDungeonEncounterId } from '@engine/dungeon/index';
import { unlockLevel } from '@engine/progression/unlocks';
import type { TeamMode } from '@engine/schema/save';
import { parseTowerEncounterId } from '@engine/tower/encounter';
import { t, translate } from '@i18n/index';
import { pointerCost, progressOf, runsAffordable, stageRefOf } from '@state/campaign';
import { affordableRuns } from '@state/dungeon';
import { selectActions, selectInventory, selectRoster, selectSave } from '@state/selectors';
import { useGameStore } from '@state/store';
import type { Route } from '@state/ui-types';
import { AmbientLayer } from '@render/ambient/AmbientLayer';
import { Backdrop } from '@ui/components/Backdrop/Backdrop';
import { TopBar } from '@ui/components/TopBar/TopBar';
import { launchBattle } from '@ui/flows/battle';
import { launchBossFight } from '@ui/flows/boss';
import { launchBreweryRun } from '@ui/flows/brewery';
import { launchCampaignRun } from '@ui/flows/campaign';
import { launchDungeonRun } from '@ui/flows/dungeon';
import { launchTowerFloor } from '@ui/flows/tower';
import { useSceneAudio } from '@ui/hooks/useSceneAudio';
import type { ScreenProps } from '@ui/router/screens';
import { entriesOf } from '@ui/screens/champions/roster-view';
import { EnemyPanel } from './EnemyPanel';
import { LaunchPanel, type RepeatChoice } from './LaunchPanel';
import { RosterStrip } from './RosterStrip';
import { enemyPower, makeLeader, stagePointerOf, toggleMember } from './setup-view';
import { TeamPanel } from './TeamPanel';
import { VersusColumn } from './VersusColumn';
import styles from './BattleSetupScreen.module.css';

type SetupRoute = Extract<Route, { name: 'battle-setup' }>;

/**
 * Battle setup (docs/tech/UI_DESIGN.md §5.8): a face-off. The team stands on the left and the
 * enemy on the right, the VS mark and what the fight is for between them, the roster underneath
 * and the launch column beside it — so a player reads the matchup before they read a button.
 */
export default function BattleSetupScreen({ route }: ScreenProps) {
  const { encounterId } = route as SetupRoute;
  const encounter = content.encounterById(encounterId);
  const actions = useGameStore(selectActions);
  const roster = useGameStore(selectRoster);
  const inventory = useGameStore(selectInventory);
  const save = useGameStore(selectSave);
  useSceneAudio('hub', 'interior');
  // The encounter id carries the stage and the difficulty, so the pointer needs no route field.
  const pointer = stagePointerOf(encounterId);
  // A boss fight costs a key instead of energy, and its own flow spends it (BOSSES.md §1).
  const boss = parseBossEncounterId(encounterId);
  // So does a tower floor, and its own flow spends that (ETERNAL_TOWER.md §3).
  const towerFloor = parseTowerEncounterId(encounterId);
  // A brewery stage costs one of the day's twenty runs, spent before the fight (BREWERY.md §5).
  const brewery = parseBreweryEncounterId(encounterId);
  const keep = parseDungeonEncounterId(encounterId);
  const ref = pointer ? stageRefOf(pointer) : null;
  const partySize = encounter?.partySize ?? 3;
  // A keep fields four like a boss gate does, but a player's dungeon four is rarely their boss
  // four, so it keeps its own preset row (save v18).
  const mode: TeamMode = keep ? 'dungeon' : partySize === 4 ? 'boss' : 'campaign';
  const entries = useMemo(() => entriesOf(roster, inventory), [roster, inventory]);
  const powerOf = useMemo(() => {
    const map = new Map(entries.map((e) => [e.instance.instanceId, e.power]));
    return (id: string): number => map.get(id) ?? 0;
  }, [entries]);
  const [team, setTeam] = useState<string[]>(() =>
    suggestTeam(roster, save?.teams[mode].lastUsed ?? [], partySize, powerOf),
  );
  const [wave, setWave] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // A boss gate is a damage race against authored numbers: a sum of stats says nothing about it.
  const enemy = useMemo(() => (encounter && !boss ? enemyPower(encounter) : null), [encounter, boss]);
  const place = useCallback(
    (instanceId: string): void => {
      setError(null);
      setTeam((current) => toggleMember(current, instanceId, partySize));
      playSfx('ui.tab');
    },
    [partySize],
  );
  if (!encounter || !save) return null;

  const teamPower = team.reduce((sum, id) => sum + powerOf(id), 0);
  const auto = save.settings.autoBattle;
  const control = auto ? 'auto' : 'manual';
  const keepEnergy = keep ? dungeonBand(keep.stage, keep.difficulty).energy : 0;
  const cost = pointer ? pointerCost(pointer) : keepEnergy;
  const repeatRuns = save.campaign.autoRepeat;
  const affordable = pointer
    ? runsAffordable(save, pointer, repeatRuns)
    : keep
      ? affordableRuns(save, keep.difficulty, keep.stage, repeatRuns)
      : 1;
  const canPay = pointer || keep ? affordable > 0 : true;
  const progress = progressOf(save);

  const removeAt = (index: number): void => {
    setTeam((current) => current.filter((_, i) => i !== index));
    playSfx('ui.cancel');
  };
  const leadFrom = (index: number): void => {
    setTeam((current) => makeLeader(current, index));
    playSfx('ui.confirm');
  };
  const loadPreset = (index: number): void => {
    const preset = save.teams[mode].presets[index] ?? [];
    const ids = sanitizeTeam(roster, preset, partySize);
    if (!ids.length) return;
    setTeam(ids);
    playSfx('ui.confirm');
  };
  const savePreset = (index: number): void => {
    const result = actions.saveTeamPreset(mode, index, team, partySize);
    if (result.ok) actions.toast('info', 'battleSetup.presetSaved', { index: index + 1 });
  };
  const chooseRepeat = (runs: number): void => {
    if (!autoRepeatTiers(save.profile.level).includes(runs)) {
      const tier = AUTO_REPEAT_TIERS.find((entry) => entry.runs === runs);
      playSfx('ui.error');
      if (tier)
        setError(
          t('campaignRun.repeatLocked', { count: runs, level: unlockLevel(tier.feature as FeatureId) }),
        );
      return;
    }
    setError(null);
    actions.setAutoRepeat(runs);
  };
  const start = (): void => {
    const result = pointer
      ? launchCampaignRun({ pointer, instanceIds: team, control, repeat: repeatRuns })
      : boss
        ? launchBossFight({ bossId: boss.bossId, tierId: boss.tierId, instanceIds: team, control })
        : towerFloor !== null
          ? launchTowerFloor({ floor: towerFloor, instanceIds: team, control })
          : brewery
            ? launchBreweryRun({ ...brewery, instanceIds: team, control })
            : keep
              ? launchDungeonRun({ ...keep, instanceIds: team, control, repeat: repeatRuns })
              : launchBattle({ encounterId, instanceIds: team, control });
    if (!result.ok) {
      setError(
        result.error.code === 'insufficient_energy'
          ? t('campaignRun.insufficientEnergy', { cost })
          : result.error.code === 'insufficient_keys'
            ? brewery
              ? t('brewery.runsNone')
              : t('tower.noKeys')
            : result.error.message,
      );
      playSfx('ui.error');
    }
  };

  const repeat: RepeatChoice | null =
    pointer || keep
      ? {
          value: repeatRuns,
          options: [1, ...AUTO_REPEAT_TIERS.map((tier) => tier.runs)],
          open: [1, ...autoRepeatTiers(save.profile.level)],
          affordable,
          onChange: chooseRepeat,
        }
      : null;
  // The button names the price it is about to take: a keep's deepest rung costs more than twice
  // its shallowest, and a key or a brewery run is as real a cost as energy.
  const price =
    pointer || keep
      ? t('battleSetup.cost', { cost })
      : boss
        ? t('bosses.keyCost')
        : towerFloor !== null
          ? t('tower.keyCost')
          : brewery
            ? t('brewery.runCost')
            : null;

  return (
    <div className={styles.root} data-testid="screen-battle-setup">
      <Backdrop asset={encounter.backdrop} grade="rgba(14, 12, 20, 0.58)" parallax={6} />
      <AmbientLayer preset="interior" />
      <div className={styles.shade} aria-hidden="true" />
      <TopBar
        title={
          pointer
            ? `${t('settlement.stage', { settlement: pointer.settlement, stage: pointer.stage })} · ${t(
                `campaign.difficulty.${pointer.difficulty}`,
              )} · ${translate(encounter.name)}`
            : brewery
              ? `${translate(encounter.name)} · ${t('brewery.stageOf', {
                  stage: brewery.stage,
                  total: content.breweryByElement(brewery.element).stages.length,
                })}`
              : boss
                ? `${translate(encounter.name)} · ${translate(
                    content.bossTier(boss.bossId, boss.tierId)?.name ?? 'bosses.title',
                  )}`
                : towerFloor !== null
                  ? `${t('tower.title')} · ${t('tower.result.floor', { floor: towerFloor })}`
                  : keep
                    ? `${translate(encounter.name)} · ${t(`dungeon.difficulty.${keep.difficulty}`)} · ${t(
                        'dungeon.stage',
                        { stage: keep.stage },
                      )}`
                    : `${t('battleSetup.title')} · ${translate(encounter.name)}`
        }
        onBack={() => actions.pop()}
      />

      <div className={styles.faceoff}>
        <TeamPanel
          team={team}
          partySize={partySize}
          roster={roster}
          powerOf={powerOf}
          presets={save.teams[mode].presets}
          onRemove={removeAt}
          onLead={leadFrom}
          onLoadPreset={loadPreset}
          onSavePreset={savePreset}
        />
        <VersusColumn
          encounter={encounter}
          teamPower={teamPower}
          enemyPower={enemy}
          stand={
            ref
              ? {
                  earned: starsOf(progress, ref.stage.id, ref.difficulty),
                  turns3Star: ref.stage.turnLimit3Star,
                  best: bestTurnsOf(progress, ref.stage.id, ref.difficulty),
                }
              : null
          }
        />
        <EnemyPanel encounter={encounter} wave={wave} onWave={setWave} showPower={enemy !== null} />
      </div>

      <div className={styles.dock}>
        <RosterStrip entries={entries} team={team} onPick={place} />
        <LaunchPanel
          price={price}
          repeat={repeat}
          auto={auto}
          onAuto={(value) => actions.updateSettings({ autoBattle: value })}
          error={error}
          canStart={team.length > 0 && canPay}
          onStart={start}
        />
      </div>
    </div>
  );
}
