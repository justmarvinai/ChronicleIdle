import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from 'zustand';
import { playSfx } from '@audio/index';
import type { DecisionRequest, UnitView } from '@engine/battle/index';
import { battleController, type BattleSpeed } from '@state/battle/index';
import { t, translate } from '@i18n/index';
import { selectActions, selectMaxBattleSpeed, selectSave } from '@state/selectors';
import { useGameStore } from '@state/store';
import type { BattleStageHandle } from '@render/battle/index';
import { Bar } from '@ui/components/Bar/Bar';
import { Button } from '@ui/components/Button/Button';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { StatusIcon } from '@ui/components/StatusIcon/StatusIcon';
import { STATUS_BY_ID } from '@content/statuses/index';
import { batchRewards, campaignSession, stopCampaignBatch } from '@state/campaign-session';
import { settleBossFight } from '@ui/flows/boss';
import { settleCampaignRun } from '@ui/flows/campaign';
import { useSceneAudio } from '@ui/hooks/useSceneAudio';
import type { ScreenProps } from '@ui/router/screens';
import { AbilityBar } from './AbilityBar';
import { BossChips } from './BossChips';
import { BattleStageMount } from './BattleStageMount';
import { CutIn, type CutInState } from './CutIn';
import { InfoPanel } from './InfoPanel';
import { UnitPlate } from './UnitPlate';
import { useBattleSession } from './useBattleSession';
import styles from './BattleScreen.module.css';

const RESULT_DELAY_MS = 900;

/** A new request preselects the policy's ability and target (BATTLE.md §8). */
function defaultChoice(request: DecisionRequest | null): {
  request: DecisionRequest | null;
  abilityId: string | null;
  targetId: string | null;
} {
  if (!request) return { request: null, abilityId: null, targetId: null };
  const forced = request.forced;
  const first = forced
    ? request.abilities.find((a) => a.abilityId === forced.abilityId)
    : (request.abilities.find((a) => a.ready && a.slot === 'a1') ?? request.abilities.find((a) => a.ready));
  return {
    request,
    abilityId: first?.abilityId ?? null,
    targetId: forced?.targetId ?? first?.autoTarget ?? null,
  };
}

/** The battle screen (docs/tech/UI_DESIGN.md §5.9): Pixi stage under a React HUD. */
export default function BattleScreen({ route }: ScreenProps) {
  const bench = route.name === 'battle' && route.bench === true;
  const actions = useGameStore(selectActions);
  const save = useGameStore(selectSave);
  const status = useBattleSession((s) => s.status);
  const encounter = useBattleSession((s) => s.encounter);
  const view = useBattleSession((s) => s.view);
  const seed = useBattleSession((s) => s.seed);
  const request = useBattleSession((s) => s.request);
  const control = useBattleSession((s) => s.control);
  const speed = useBattleSession((s) => s.speed);
  const paused = useBattleSession((s) => s.paused);
  const log = useBattleSession((s) => s.log);
  const outcome = useBattleSession((s) => s.outcome);
  useSceneAudio(encounter?.music ?? 'battle', 'none');

  // The player's choice for the current request; a new request resets to the policy's defaults.
  const [choiceState, setChoiceState] = useState<{
    request: DecisionRequest | null;
    abilityId: string | null;
    targetId: string | null;
  }>({ request: null, abilityId: null, targetId: null });
  const current = choiceState.request === request ? choiceState : defaultChoice(request);
  const selectedAbility = current.abilityId;
  const target = current.targetId;
  const setSelectedAbility = useCallback(
    (abilityId: string | null): void =>
      setChoiceState((prev) => ({
        request,
        abilityId,
        targetId: prev.request === request ? prev.targetId : defaultChoice(request).targetId,
      })),
    [request],
  );
  const setTarget = useCallback(
    (targetId: string | null): void =>
      setChoiceState((prev) => ({
        request,
        abilityId: prev.request === request ? prev.abilityId : defaultChoice(request).abilityId,
        targetId,
      })),
    [request],
  );
  const [hovered, setHovered] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [cutIn, setCutIn] = useState<CutInState | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const stage = useRef<BattleStageHandle | null>(null);
  const cutInKey = useRef(0);
  const recorded = useRef(false);
  const maxSpeed = useGameStore(selectMaxBattleSpeed);
  const repeat = useStore(campaignSession);
  const repeatGold = batchRewards(repeat)?.currencies.find((entry) => entry.currency === 'gold')?.amount ?? 0;

  // Leave gracefully if there is no live battle (deep link, reload).
  useEffect(() => {
    if (status === 'idle') actions.resetStack({ name: 'hub' });
  }, [status, actions]);

  // Elapsed timer (pauses with the battle).
  useEffect(() => {
    if (status !== 'running' || paused) return;
    const started = Date.now() - elapsed;
    const id = window.setInterval(() => setElapsed(Date.now() - started), 500);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, paused]);

  // When the fight ends, record it once and move to the result screen after the last beat.
  useEffect(() => {
    if (status !== 'ended' || !outcome || !encounter) return;
    if (bench) {
      // Bench fights hand their frame statistics back to the perf screen and are never recorded.
      battleController.recordFrameStats(stage.current?.frameStats() ?? null);
      const id = window.setTimeout(() => actions.pop(), RESULT_DELAY_MS);
      return () => window.clearTimeout(id);
    }
    if (recorded.current) return;
    recorded.current = true;
    actions.recordBattle(outcome, encounter.id);
    // A boss fight banks its damage here; a campaign run pays out and may start the next of a batch.
    if (!settleBossFight(outcome) && settleCampaignRun(outcome).repeated) return;
    const id = window.setTimeout(() => actions.replace({ name: 'battle-result' }), RESULT_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [status, outcome, encounter, actions, bench]);

  // A fresh fight (the next run of an auto-repeat batch) may be recorded again.
  useEffect(() => {
    if (status === 'running') recorded.current = false;
  }, [status, seed]);

  const activeUnitId = useMemo(() => {
    for (let i = log.length - 1; i >= 0; i--) {
      const e = log[i];
      if (e?.type === 'turn.started') return e.unitId;
      if (e?.type === 'turn.ended') return null;
    }
    return null;
  }, [log]);
  const currentUnit: UnitView | null = useMemo(() => {
    const id = request?.unitId ?? activeUnitId;
    return (id && view?.units.find((u) => u.id === id)) || null;
  }, [request, activeUnitId, view]);
  const choice = request?.abilities.find((a) => a.abilityId === selectedAbility) ?? null;
  const validTargets = useMemo(() => new Set(choice?.validTargets ?? []), [choice]);

  const cast = useCallback(
    (abilityId: string, targetId: string | null): void => {
      const pending = battleController.store.getState().request;
      if (!pending) return;
      const picked = pending.abilities.find((a) => a.abilityId === abilityId);
      if (!picked || !picked.ready) {
        playSfx('ui.error');
        return;
      }
      const finalTarget = picked.targeting === 'none' ? null : targetId;
      if (picked.targeting !== 'none' && (!finalTarget || !picked.validTargets.includes(finalTarget))) {
        setSelectedAbility(abilityId);
        setTarget(picked.autoTarget);
        playSfx('ui.tab');
        return;
      }
      const result = battleController.decide({ unitId: pending.unitId, abilityId, targetId: finalTarget });
      if (!result.ok) playSfx('ui.error');
    },
    [setSelectedAbility, setTarget],
  );

  const onSelectAbility = (abilityId: string): void => {
    const picked = request?.abilities.find((a) => a.abilityId === abilityId);
    if (!picked?.ready) return;
    const chosenTarget =
      validTargets.has(target ?? '') && selectedAbility === abilityId ? target : picked.autoTarget;
    cast(abilityId, chosenTarget);
  };
  const onPickUnit = (unitId: string): void => {
    if (!selectedAbility || !validTargets.has(unitId)) return;
    setTarget(unitId);
    cast(selectedAbility, unitId);
  };

  const cycleSpeed = useCallback((): void => {
    // ×3 comes with Normal complete and ×4 with Hard (CAMPAIGN.md §1).
    const next = ((speed % maxSpeed) + 1) as BattleSpeed;
    battleController.setSpeed(next);
    actions.updateSettings({ battleSpeed: next });
    playSfx('ui.tab');
  }, [speed, maxSpeed, actions]);
  const toggleAuto = useCallback((): void => {
    const next = control === 'auto' ? 'manual' : 'auto';
    battleController.setControl(next);
    actions.updateSettings({ autoBattle: next === 'auto' });
    playSfx('ui.tab');
  }, [control, actions]);
  const pause = useCallback((): void => {
    if (status !== 'running') return;
    battleController.setPaused(true);
    stage.current?.setPaused(true);
    actions.openDialog({ name: 'battle-pause' });
  }, [status, actions]);
  useEffect(() => {
    if (!paused) stage.current?.setPaused(false);
  }, [paused]);

  // Hotkeys (BATTLE.md §8).
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.repeat) return;
      const dialogOpen = useGameStore.getState().ui.dialog !== null;
      if (dialogOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        pause();
        return;
      }
      if (e.key === 'a' || e.key === 'A') {
        toggleAuto();
        return;
      }
      if (e.key === '+' || e.key === '=' || e.key === '-' || e.key === '_') {
        cycleSpeed();
        return;
      }
      if (e.key === 'i' || e.key === 'I') {
        setShowInfo((v) => !v);
        return;
      }
      const pending = battleController.store.getState().request;
      if (!pending) return;
      if (/^[1-4]$/.test(e.key)) {
        const slot = `a${e.key}`;
        const picked = pending.abilities.find((a) => a.slot === slot);
        if (picked?.ready) {
          setSelectedAbility(picked.abilityId);
          cast(
            picked.abilityId,
            selectedAbility === picked.abilityId && validTargets.has(target ?? '')
              ? target
              : picked.autoTarget,
          );
        } else playSfx('ui.error');
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        const list = choice?.validTargets ?? [];
        if (!list.length) return;
        const index = target ? list.indexOf(target) : -1;
        setTarget(list[(index + 1) % list.length] ?? null);
        playSfx('ui.hover');
        return;
      }
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (selectedAbility) cast(selectedAbility, target);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    pause,
    toggleAuto,
    cycleSpeed,
    cast,
    selectedAbility,
    target,
    choice,
    validTargets,
    setSelectedAbility,
    setTarget,
  ]);

  if (!encounter || !view || !save) return null;
  const boss = view.units.find((u) => u.isBoss);
  // How much of its escort is still on its feet, for the guard chip (BOSSES.md §3).
  const standing = boss?.boss?.adds
    ? view.units.filter((u) => u.alive && boss.boss?.adds?.ids.includes(u.id)).length
    : 0;
  const turnLimit = view.turnLimit;
  const minutes = Math.floor(elapsed / 60_000);
  const seconds = Math.floor((elapsed % 60_000) / 1000);

  return (
    <div
      className={styles.root}
      data-testid="screen-battle"
      data-status={status}
      data-boss={boss ? 'true' : 'false'}
    >
      <BattleStageMount
        backdrop={encounter.backdrop}
        initialView={view}
        onCutIn={(unitId, abilityId, ms) => {
          const unit = battleController.store.getState().view?.units.find((u) => u.id === unitId);
          if (!unit) return;
          cutInKey.current += 1;
          setCutIn({ unitDefId: unit.defId, abilityId, ms, key: cutInKey.current });
          window.setTimeout(() => setCutIn((c) => (c?.key === cutInKey.current ? null : c)), ms);
        }}
        onStage={(handle) => {
          stage.current = handle;
        }}
      />

      <div className={styles.plates}>
        {view.units.map((unit) => (
          <UnitPlate
            key={unit.id}
            unit={unit}
            active={unit.id === (request?.unitId ?? activeUnitId)}
            targetable={!!request && validTargets.has(unit.id)}
            targeted={!!request && (target === unit.id || (hovered === unit.id && validTargets.has(unit.id)))}
            onPick={request ? onPickUnit : undefined}
            onHover={setHovered}
          />
        ))}
      </div>

      <div className={styles.topLeft}>
        <Button
          variant="square"
          size="sm"
          sound="ui.open"
          onClick={pause}
          aria-label={t('battle.pause')}
          data-testid="battle-pause"
        >
          <Glyph glyph="glyph.hourglass" size={26} color="var(--gold-3)" />
        </Button>
        <div className={styles.counters}>
          <span className={`display ${styles.counter}`} data-testid="battle-wave">
            {t('battle.wave', { wave: view.wave, count: view.waveCount })}
          </span>
          <span className={`num ${styles.counterSmall}`} data-testid="battle-turns">
            {t('battle.turnsUsed', { turns: view.allyTurns, limit: turnLimit })}
          </span>
          <span className={`num ${styles.counterSmall}`}>
            {t('battle.time')} {minutes}:{String(seconds).padStart(2, '0')}
          </span>
        </div>
      </div>

      {repeat.requested > 1 ? (
        <div className={styles.repeatHud} data-testid="repeat-hud">
          <span className={`display ${styles.repeatRun}`}>
            {t('campaignRun.run', {
              index: Math.min(repeat.completed + 1, repeat.requested),
              total: repeat.requested,
            })}
          </span>
          <span className={`num ${styles.repeatDrops}`}>
            {t('campaignRun.gold', { gold: repeatGold.toLocaleString('en-US') })}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => stopCampaignBatch()}
            disabled={repeat.stopping}
            data-testid="repeat-stop"
          >
            {repeat.stopping ? t('campaignRun.stopping') : t('campaignRun.stop')}
          </Button>
        </div>
      ) : null}

      {boss ? (
        <div className={styles.bossBar} data-testid="boss-bar">
          <span className={`display ${styles.bossName}`}>{translate(boss.name)}</span>
          <Bar value={boss.hp} max={boss.maxHp} kind="ember" height={40} width={640} showNumbers />
          <div className={styles.bossStatuses}>
            {boss.statuses.slice(0, 10).map((s) => {
              const meta = STATUS_BY_ID[s.id];
              return (
                <StatusIcon
                  key={s.id}
                  glyph={meta.glyph}
                  kind={meta.kind}
                  turns={s.turns}
                  label={translate(meta.name)}
                  size={26}
                />
              );
            })}
          </div>
          {boss.boss ? <BossChips boss={boss.boss} standing={standing} /> : null}
        </div>
      ) : null}

      <div className={styles.turnBanner} data-testid="turn-banner">
        {request && currentUnit ? (
          <span className={`display ${styles.turnText}`}>
            {t('battle.yourTurn', { name: translate(currentUnit.name) })}
            {request.forced ? (
              <span className={styles.forced}>
                {' '}
                ·{' '}
                {t('battle.provoked', {
                  name: translate(view.units.find((u) => u.id === request.forced?.targetId)?.name ?? ''),
                })}
              </span>
            ) : null}
          </span>
        ) : currentUnit && currentUnit.side === 'enemy' ? (
          <span className={`display ${styles.turnTextEnemy}`}>{t('battle.enemyTurn')}</span>
        ) : null}
      </div>

      <div className={styles.bottomLeft}>
        <Button
          variant="square"
          size="sm"
          active={showInfo}
          onClick={() => setShowInfo((v) => !v)}
          data-testid="battle-info-toggle"
        >
          <Glyph glyph="glyph.spell_book" size={24} color="var(--gold-3)" />
          <span className="display">{t('battle.info')}</span>
        </Button>
        <Button
          variant="square"
          size="sm"
          active={control === 'auto'}
          onClick={toggleAuto}
          data-testid="battle-auto"
          aria-pressed={control === 'auto'}
        >
          <Glyph glyph="glyph.spirit_vortex" size={24} color="var(--gold-3)" />
          <span className="display">{t('battle.auto')}</span>
        </Button>
        <Button variant="square" size="sm" onClick={cycleSpeed} data-testid="battle-speed">
          <span className={`num ${styles.speedLabel}`}>×{speed}</span>
        </Button>
      </div>

      <AbilityBar
        unit={currentUnit ?? view.units.find((u) => u.side === 'ally' && u.alive) ?? null}
        request={request}
        selectedAbilityId={selectedAbility}
        onSelect={onSelectAbility}
      />

      {showInfo ? <InfoPanel log={log} view={view} /> : null}
      <CutIn state={cutIn} />
      {status === 'ended' && outcome ? (
        <div
          className={[
            styles.endBanner,
            outcome.kind === 'victory' ? styles.endVictory : styles.endDefeat,
          ].join(' ')}
          data-testid="battle-end"
        >
          <span className="display">{t(`battleResult.${outcome.kind}`)}</span>
        </div>
      ) : null}
    </div>
  );
}
