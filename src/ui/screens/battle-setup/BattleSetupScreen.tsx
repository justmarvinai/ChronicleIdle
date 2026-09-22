import { useMemo, useState } from 'react';
import { content } from '@content/registry';
import { playSfx } from '@audio/index';
import { sanitizeTeam, suggestTeam } from '@engine/battle/teams';
import { scaledEnemyStats } from '@engine/battle/index';
import { parseStageEncounterId } from '@engine/campaign/encounter';
import { parseBossEncounterId } from '@engine/bosses/encounter';
import { parseBreweryEncounterId } from '@engine/brewery/encounter';
import { parseDungeonEncounterId } from '@engine/dungeon/index';
import { parseTowerEncounterId } from '@engine/tower/encounter';
import { parseStageId, type StagePointer } from '@engine/campaign/progress';
import { autoRepeatTiers } from '@engine/campaign/run';
import { unlockLevel } from '@engine/progression/unlocks';
import { AUTO_REPEAT_TIERS } from '@content/balance/campaign';
import type { FeatureId } from '@content/balance/unlocks';
import { sortAndFilter, DEFAULT_ROSTER_VIEW } from '@engine/champions/query';
import { t, translate } from '@i18n/index';
import type { TeamMode } from '@engine/schema/save';
import { selectActions, selectInventory, selectRoster, selectSave } from '@state/selectors';
import { useGameStore } from '@state/store';
import type { Route } from '@state/ui-types';
import { AmbientLayer } from '@render/ambient/AmbientLayer';
import { Backdrop } from '@ui/components/Backdrop/Backdrop';
import { Button } from '@ui/components/Button/Button';
import { ChampionCard } from '@ui/components/ChampionCard/ChampionCard';
import { Panel } from '@ui/components/Frame/Panel';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { Slot } from '@ui/components/Slot/Slot';
import { Tabs } from '@ui/components/Tab/Tabs';
import { Toggle } from '@ui/components/Toggle/Toggle';
import { TopBar } from '@ui/components/TopBar/TopBar';
import { VirtualGrid } from '@ui/components/VirtualGrid/VirtualGrid';
import { Dropdown } from '@ui/components/Dropdown/Dropdown';
import { launchBattle } from '@ui/flows/battle';
import { launchBossFight } from '@ui/flows/boss';
import { launchBreweryRun } from '@ui/flows/brewery';
import { launchDungeonRun } from '@ui/flows/dungeon';
import { launchTowerFloor } from '@ui/flows/tower';
import { launchCampaignRun } from '@ui/flows/campaign';
import { pointerCost, runsAffordable, stageRefOf } from '@state/campaign';
import { affordableRuns } from '@state/dungeon';
import { dungeonBand } from '@content/balance/dungeon';
import { useSceneAudio } from '@ui/hooks/useSceneAudio';
import type { ScreenProps } from '@ui/router/screens';
import { entriesOf, elementLabel, roleLabel } from '@ui/screens/champions/roster-view';
import { ELEMENT_COLOR, ELEMENT_GLYPH, ROLE_GLYPH } from '@ui/styles/display-maps';
import styles from './BattleSetupScreen.module.css';

type SetupRoute = Extract<Route, { name: 'battle-setup' }>;
const CARD = 96;

/** `encounter.stage.03.07.normal` → the stage pointer the campaign actions take. */
function stagePointerOf(encounterId: string): StagePointer | null {
  const parsed = parseStageEncounterId(encounterId);
  const stage = parsed ? parseStageId(parsed.stageId) : null;
  return parsed && stage ? { ...stage, difficulty: parsed.difficulty } : null;
}

/** Battle setup (docs/tech/UI_DESIGN.md §5.8): team slots, presets, enemy preview, start. */
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
  const shown = useMemo(
    () => sortAndFilter(entries, { ...DEFAULT_ROSTER_VIEW, sort: 'power', descending: true }),
    [entries],
  );
  if (!encounter || !save) return null;

  const leader = team[0] ? roster[team[0]] : undefined;
  const leaderDef = leader ? content.championById(leader.defId) : undefined;
  const teamPower = team.reduce((sum, id) => sum + powerOf(id), 0);
  const control = save.settings.autoBattle ? 'auto' : 'manual';
  const keepEnergy = keep ? dungeonBand(keep.stage, keep.difficulty).energy : 0;
  const cost = pointer ? pointerCost(pointer) : keepEnergy;
  const repeat = save.campaign.autoRepeat;
  const tiers = autoRepeatTiers(save.profile.level);
  const affordable = pointer
    ? runsAffordable(save, pointer, repeat)
    : keep
      ? affordableRuns(save, keep.difficulty, keep.stage, repeat)
      : 1;
  const canPay = pointer || keep ? affordable > 0 : true;

  const place = (instanceId: string): void => {
    setError(null);
    setTeam((current) => {
      if (current.includes(instanceId)) return current.filter((id) => id !== instanceId);
      if (current.length >= partySize) return [...current.slice(0, partySize - 1), instanceId];
      return [...current, instanceId];
    });
    playSfx('ui.tab');
  };
  const removeAt = (index: number): void => {
    setTeam((current) => current.filter((_, i) => i !== index));
    playSfx('ui.cancel');
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
  const start = (): void => {
    const result = pointer
      ? launchCampaignRun({ pointer, instanceIds: team, control, repeat })
      : boss
        ? launchBossFight({ bossId: boss.bossId, tierId: boss.tierId, instanceIds: team, control })
        : towerFloor !== null
          ? launchTowerFloor({ floor: towerFloor, instanceIds: team, control })
          : brewery
            ? launchBreweryRun({ ...brewery, instanceIds: team, control })
            : keep
              ? launchDungeonRun({ ...keep, instanceIds: team, control, repeat })
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

  return (
    <div className={styles.root} data-testid="screen-battle-setup">
      <Backdrop asset={encounter.backdrop} grade="rgba(14, 12, 20, 0.62)" parallax={6} />
      <AmbientLayer preset="interior" />
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
              : `${t('battleSetup.title')} · ${translate(encounter.name)}`
        }
        onBack={() => actions.pop()}
      />

      <section className={styles.team} aria-label={t('battleSetup.team')} data-testid="setup-team">
        <h2 className={`display ${styles.heading}`}>{t('battleSetup.team')}</h2>
        <div className={styles.slots}>
          {Array.from({ length: partySize }, (_, i) => {
            const id = team[i];
            const instance = id ? roster[id] : undefined;
            const def = instance ? content.championById(instance.defId) : undefined;
            return (
              <div key={i} className={styles.slotWrap}>
                <Slot
                  size="md"
                  emptyGlyph="glyph.cloaked_figure"
                  {...(i === 0 ? { label: t('battleSetup.leader') } : {})}
                  selected={i === 0 && !!def}
                  onClick={() => (id ? removeAt(i) : undefined)}
                  data-testid={`team-slot-${i}`}
                  aria-label={
                    def ? `${translate(def.name)}, ${t('battleSetup.remove')}` : t('battleSetup.slotEmpty')
                  }
                >
                  {def && instance ? (
                    <ChampionCard
                      name={translate(def.name)}
                      rarity={def.rarity}
                      element={def.element}
                      role={def.role}
                      stars={instance.stars}
                      level={instance.level}
                      avatar={def.art.avatar}
                      tint={def.art.tint}
                      placeholder={def.art.placeholder}
                      placeholderLabel={t('champions.placeholder')}
                      size={96}
                      compact
                    />
                  ) : null}
                </Slot>
                {i === 0 ? (
                  <span className={`display ${styles.leaderTag}`}>{t('battleSetup.leader')}</span>
                ) : null}
              </div>
            );
          })}
        </div>
        <p className={styles.aura}>
          {leaderDef?.aura
            ? t('battleSetup.leaderAura', { name: translate(leaderDef.aura.name) })
            : t('battleSetup.noAura')}
        </p>
        <div className={styles.powerRow}>
          <span className={styles.label}>{t('battleSetup.teamPower')}</span>
          <span className={`num ${styles.power}`} data-testid="team-power">
            {teamPower.toLocaleString('en-US')}
          </span>
        </div>
        <div className={styles.presets}>
          <span className={styles.label}>{t('battleSetup.presets')}</span>
          {[0, 1, 2].map((index) => {
            const preset = save.teams[mode].presets[index] ?? [];
            return (
              <div key={index} className={styles.preset}>
                <span className={`display ${styles.presetName}`}>
                  {t('battleSetup.preset', { index: index + 1 })}
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={!preset.length}
                  onClick={() => loadPreset(index)}
                  data-testid={`preset-load-${index}`}
                >
                  {preset.length ? t('battleSetup.presetLoad') : t('battleSetup.presetEmpty')}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={!team.length}
                  onClick={() => savePreset(index)}
                  data-testid={`preset-save-${index}`}
                >
                  {t('battleSetup.presetSave')}
                </Button>
              </div>
            );
          })}
        </div>
        <p className={styles.hint}>{t('battleSetup.slotsHint')}</p>
        {ref ? (
          <Panel kind="thin" padding={12} className={styles.stars} data-testid="star-conditions">
            <span className={styles.label}>{t('settlement.starConditions')}</span>
            <ol className={styles.starList}>
              <li>{t('settlement.star1')}</li>
              <li>{t('settlement.star2')}</li>
              <li>{t('settlement.star3', { turns: ref.stage.turnLimit3Star })}</li>
            </ol>
            <span className={styles.turnLimit}>
              {t('settlement.turnLimit', { turns: ref.stage.turnLimitDefeat })}
            </span>
          </Panel>
        ) : null}
      </section>

      <section className={styles.enemies} aria-label={t('battleSetup.enemies')}>
        <h2 className={`display ${styles.heading}`}>{t('battleSetup.enemies')}</h2>
        <Tabs<string>
          items={encounter.waves.map((_, i) => ({
            key: String(i),
            label: t('battleSetup.wave', { index: i + 1 }),
            testId: `wave-tab-${i + 1}`,
          }))}
          value={String(wave)}
          onChange={(key) => setWave(Number(key))}
        />
        <Panel kind="thin" padding={14} className={styles.wavePanel} contentClassName={styles.waveContent}>
          <ul className={styles.enemyList} data-testid="wave-enemies">
            {(encounter.waves[wave]?.enemies ?? []).map((spawn, i) => {
              const def = content.enemyById(spawn.enemyId);
              if (!def) return null;
              const stats = scaledEnemyStats(def, encounter, spawn.statMult ?? 1);
              return (
                <li key={`${spawn.enemyId}-${i}`} className={styles.enemy}>
                  <span
                    className={styles.sigil}
                    style={{
                      background: `radial-gradient(circle, ${ELEMENT_COLOR[def.element]} 0%, rgba(11,10,13,0.9) 75%)`,
                    }}
                  >
                    <Glyph
                      glyph={ELEMENT_GLYPH[def.element]}
                      size={20}
                      color="var(--text-1)"
                      label={elementLabel(def.element)}
                    />
                  </span>
                  <span className={styles.enemyText}>
                    <span className={`display ${styles.enemyName}`}>
                      {translate(def.name)}{' '}
                      {def.boss ? <span className={styles.bossTag}>{t('battle.boss')}</span> : null}
                    </span>
                    <span className={styles.enemyMeta}>
                      <Glyph
                        glyph={ROLE_GLYPH[def.role]}
                        size={14}
                        color="var(--text-3)"
                        label={roleLabel(def.role)}
                      />{' '}
                      {roleLabel(def.role)} · {t('battleSetup.enemyLevel', { level: encounter.enemyLevel })} ·
                      HP <span className="num">{stats.hp.toLocaleString('en-US')}</span>
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </Panel>
        {pointer || keep ? (
          <div className={styles.repeat} data-testid="auto-repeat">
            <Dropdown<number>
              label={t('campaignRun.repeat')}
              width={220}
              value={repeat}
              options={[1, ...AUTO_REPEAT_TIERS.map((tier) => tier.runs)].map((runs) => ({
                value: runs,
                label:
                  runs === 1
                    ? t('campaignRun.repeatOnce')
                    : tiers.includes(runs)
                      ? t('campaignRun.repeatTimes', { count: runs })
                      : `${t('campaignRun.repeatTimes', { count: runs })} 🔒`,
              }))}
              onChange={(runs) => {
                if (!tiers.includes(runs)) {
                  const tier = AUTO_REPEAT_TIERS.find((entry) => entry.runs === runs);
                  playSfx('ui.error');
                  if (tier)
                    setError(
                      t('campaignRun.repeatLocked', {
                        count: runs,
                        level: unlockLevel(tier.feature as FeatureId),
                      }),
                    );
                  return;
                }
                setError(null);
                actions.setAutoRepeat(runs);
              }}
            />
            {repeat > 1 ? (
              <span className={`num ${styles.affordable}`} data-testid="repeat-affordable">
                {t('campaignRun.summary', { count: affordable })}
              </span>
            ) : null}
          </div>
        ) : null}
        <div className={styles.controls}>
          <span className={styles.label}>{t('battleSetup.control')}</span>
          <span data-testid="setup-auto">
            <Toggle
              label={control === 'auto' ? t('battleSetup.auto') : t('battleSetup.manual')}
              checked={control === 'auto'}
              onChange={(v) => actions.updateSettings({ autoBattle: v })}
            />
          </span>
        </div>
        {error ? <p className={styles.error}>{error}</p> : null}
        <div className={styles.start}>
          <Button
            variant="primary"
            size="lg"
            disabled={team.length === 0 || !canPay}
            icon={<Glyph glyph="glyph.sword_clash" size={28} color="var(--gold-3)" />}
            onClick={start}
            data-testid="start-battle"
          >
            {t('battleSetup.start')}
            {/* A keep charges energy like a stand does, and the deepest rung charges more than
                twice the shallowest — so the button names the price it is about to take. */}
            {pointer || keep ? ` · ${t('battleSetup.cost', { cost })}` : ''}
            {boss ? ` · ${t('bosses.keyCost')}` : ''}
            {brewery ? ` · ${t('brewery.runCost')}` : ''}
          </Button>
        </div>
      </section>

      <section className={styles.roster} aria-label={t('battleSetup.roster')}>
        <VirtualGrid
          items={shown}
          columns={12}
          cellWidth={CARD}
          cellHeight={Math.round(CARD * 1.28)}
          gap={10}
          height={270}
          keyOf={(e) => e.instance.instanceId}
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
              selected={team.includes(entry.instance.instanceId)}
              dimmed={team.includes(entry.instance.instanceId)}
              onClick={() => place(entry.instance.instanceId)}
              testId={`pick-${entry.instance.instanceId}`}
            />
          )}
        />
      </section>
    </div>
  );
}
