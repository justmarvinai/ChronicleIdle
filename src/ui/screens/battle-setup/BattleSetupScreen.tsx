import { useMemo, useState } from 'react';
import { content } from '@content/registry';
import { playSfx } from '@audio/index';
import { sanitizeTeam, suggestTeam } from '@engine/battle/teams';
import { scaledEnemyStats } from '@engine/battle/index';
import { sortAndFilter, DEFAULT_ROSTER_VIEW } from '@engine/champions/query';
import { t, translate } from '@i18n/index';
import type { TeamMode } from '@engine/schema/save';
import { selectActions, selectRoster, selectSave } from '@state/selectors';
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
import { launchBattle } from '@ui/flows/battle';
import { useSceneAudio } from '@ui/hooks/useSceneAudio';
import type { ScreenProps } from '@ui/router/screens';
import { entriesOf, elementLabel, roleLabel } from '@ui/screens/champions/roster-view';
import { ELEMENT_COLOR, ELEMENT_GLYPH, ROLE_GLYPH } from '@ui/styles/display-maps';
import styles from './BattleSetupScreen.module.css';

type SetupRoute = Extract<Route, { name: 'battle-setup' }>;
const CARD = 96;

/** Battle setup (docs/tech/UI_DESIGN.md §5.8): team slots, presets, enemy preview, start. */
export default function BattleSetupScreen({ route }: ScreenProps) {
  const { encounterId } = route as SetupRoute;
  const encounter = content.encounterById(encounterId);
  const actions = useGameStore(selectActions);
  const roster = useGameStore(selectRoster);
  const save = useGameStore(selectSave);
  useSceneAudio('hub', 'interior');
  const partySize = encounter?.partySize ?? 3;
  const mode: TeamMode = partySize === 4 ? 'boss' : 'campaign';
  const entries = useMemo(() => entriesOf(roster), [roster]);
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
    const result = launchBattle({ encounterId, instanceIds: team, control });
    if (!result.ok) {
      setError(result.error.message);
      playSfx('ui.error');
    }
  };

  return (
    <div className={styles.root} data-testid="screen-battle-setup">
      <Backdrop asset={encounter.backdrop} grade="rgba(14, 12, 20, 0.62)" parallax={6} />
      <AmbientLayer preset="interior" />
      <TopBar
        title={`${t('battleSetup.title')} · ${translate(encounter.name)}`}
        onBack={() => actions.pop()}
      />

      <section className={styles.team} aria-label={t('battleSetup.team')}>
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
        <Panel kind="stone" padding={18} className={styles.wavePanel}>
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
            disabled={team.length === 0}
            icon={<Glyph glyph="glyph.sword_clash" size={28} color="var(--gold-3)" />}
            onClick={start}
            data-testid="start-battle"
          >
            {t('battleSetup.start')} · {t('battleSetup.free')}
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
