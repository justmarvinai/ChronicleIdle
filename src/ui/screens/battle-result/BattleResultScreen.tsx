import { useEffect, useRef } from 'react';
import { useStore } from 'zustand';
import { STAGE_MAX_STARS } from '@content/balance/campaign';
import { content } from '@content/registry';
import { isFeatureUnlocked, unlockLevel } from '@engine/progression/unlocks';
import { playSfx } from '@audio/index';
import { battleController } from '@state/battle/index';
import { bossSession } from '@state/boss-session';
import { brewerySession } from '@state/brewery-session';
import { dungeonSession } from '@state/dungeon-session';
import { towerSession } from '@state/tower-session';
import { batchRewards, batchStars, campaignSession } from '@state/campaign-session';
import { currentRunView, nextPointerAfter } from '@ui/flows/campaign';
import { t, translate, type I18nKey } from '@i18n/index';
import { selectActions, selectSave } from '@state/selectors';
import { openChampionChoices } from '@state/summon';
import { useGameStore } from '@state/store';
import { AmbientLayer } from '@render/ambient/AmbientLayer';
import { Backdrop } from '@ui/components/Backdrop/Backdrop';
import { Button } from '@ui/components/Button/Button';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { ScrollArea } from '@ui/components/ScrollArea/ScrollArea';
import { useSceneAudio } from '@ui/hooks/useSceneAudio';
import type { ScreenProps } from '@ui/router/screens';
import { BossOutcomePanel } from './BossOutcomePanel';
import { BreweryOutcomePanel } from './BreweryOutcomePanel';
import { ChampionReport } from './ChampionReport';
import { DefeatAdvice } from './DefeatAdvice';
import { DungeonOutcomePanel } from './DungeonOutcomePanel';
import { PalacePlate } from './PalacePlate';
import { ResultCrest } from './ResultCrest';
import { ResultStats } from './ResultStats';
import { SpoilsPanel } from './SpoilsPanel';
import { TowerOutcomePanel } from './TowerOutcomePanel';
import { adviceFor } from './result-view';
import {
  backToGate,
  backToHall,
  backToKeep,
  backToTower,
  leaveResult,
  nextStand,
  replayStand,
} from './result-nav';
import styles from './BattleResultScreen.module.css';

/**
 * Battle result (docs/tech/UI_DESIGN.md §5.10): the word and the stars under a crown of light, the
 * team as cards of what each did, and beside them what the fight paid — or, after a loss, what to
 * try next — over one row of presses with the one that matters on the right.
 */
export default function BattleResultScreen(_props: ScreenProps) {
  const actions = useGameStore(selectActions);
  const save = useGameStore(selectSave);
  const session = useStore(battleController.store);
  const campaign = useStore(campaignSession);
  // A boss fight banks damage instead of stars, so its result reads its own panel (BOSSES.md §1).
  const boss = useStore(bossSession);
  // A tower floor banks a climb; its own panel says what the floor paid (ETERNAL_TOWER.md §4).
  const tower = useStore(towerSession);
  // A brewery run banks brews and one of the day's twenty runs (BREWERY.md §6).
  const brewery = useStore(brewerySession);
  // A dungeon batch banks gear — the whole evening of it, not the last fight (DUNGEONS.md §6).
  const keep = useStore(dungeonSession);
  const outcome = session.outcome;
  const encounter = session.encounter;
  const victory = outcome?.kind === 'victory';
  useSceneAudio(victory ? 'hub' : 'battle', 'none');
  const cued = useRef(false);
  // A brewery run's brews are its whole reward, so they cue the spoils sound the same way a
  // stand's do — and a first clear, which opens the next stage, cues the big one.
  const brewed = brewery.summary?.cleared ?? false;
  // Gear off the racks is a reward like brews are, so a keep's haul cues the same spoils sound.
  const looted = keep.gear.length > 0;
  const hasRewards = campaign.summaries.some((summary) => summary.rewards !== null) || brewed || looted;
  const bigReward =
    campaign.summaries.some((summary) => summary.firstClear || summary.chestThresholds.length > 0) ||
    campaign.requested > 1 ||
    (brewery.summary?.firstClear ?? false);
  // A chronicle level-up brings its own dialog and stinger; this is the champions' cue.
  const championLevelUp = campaign.summaries.some((summary) => summary.levelUps.length > 0);
  const chronicleLevelUp = campaign.summaries.some((summary) => summary.playerLevelsGained > 0);
  // The spoils land with a sound, and a level-up with its stinger (AGENTS.md definition of done).
  useEffect(() => {
    if (cued.current || !hasRewards) return;
    cued.current = true;
    playSfx(bigReward ? 'reward.large' : 'reward.medium');
    if (championLevelUp && !chronicleLevelUp) window.setTimeout(() => playSfx('stinger.levelup'), 450);
  }, [hasRewards, bigReward, championLevelUp, chronicleLevelUp]);
  if (!outcome || !encounter || !save) {
    return null;
  }

  const run = currentRunView();
  const batch = batchStars(campaign);
  const last = campaign.summaries[campaign.summaries.length - 1] ?? null;
  const repeated = campaign.requested > 1;
  const rewards = repeated ? batchRewards(campaign) : (last?.rewards ?? null);
  // A skill point for the Glorious Palace, whichever of the three kinds of fight paid it.
  const palacePoints =
    campaign.summaries.reduce((sum, summary) => sum + summary.palacePoints, 0) +
    (tower.summary?.palacePoints ?? 0) +
    (boss.summary?.palacePoints ?? 0);
  // Every piece the batch minted, and the drops the racks were too full to hold (GEAR.md §7).
  const dropped = campaign.summaries.flatMap((summary) => summary.gear);
  const gearLost = campaign.summaries.reduce((sum, summary) => sum + summary.gearLost, 0);
  // Mastering a difficulty owes a champion of the player's choosing; it is claimed at the Portal.
  const owedChoice = openChampionChoices(save).length > 0;
  // A run that took the stand to its last star says what that star buys (CAMPAIGN.md §10).
  const masteredNow = campaign.summaries.some(
    (summary) => summary.stars >= STAGE_MAX_STARS && summary.starsBefore < STAGE_MAX_STARS,
  );
  const mastered = masteredNow
    ? {
        opensAt: isFeatureUnlocked('instant_clear', save.profile.level) ? null : unlockLevel('instant_clear'),
      }
    : null;
  const sideMode = Boolean(boss.summary || tower.summary || brewery.summary || keep.summary);
  const allies = outcome.units.filter((u) => u.side === 'ally');
  const teamIds = allies.map((u) => u.instanceId).filter((id): id is string => !!id);
  // The highest level each champion reached across the batch.
  const levelUps = [
    ...campaign.summaries
      .flatMap((summary) => summary.levelUps)
      .reduce(
        (best, up) => best.set(up.instanceId, Math.max(best.get(up.instanceId) ?? 0, up.level)),
        new Map<string, number>(),
      ),
  ].map(([instanceId, level]) => ({ instanceId, level }));
  const advice = adviceFor({
    outcome,
    encounter,
    levels: teamIds.map((id) => save.roster[id]?.level ?? 0),
    boss: boss.summary ? { percent: boss.summary.percent } : null,
  });
  // After any fight that went against the team — but not a boss race, where the turn limit is the
  // normal ending and its advice is its own — the places a team grows stronger are one press away.
  const grow = !victory && !boss.summary;
  const stand = run ? { pointer: run.pointer, encounterId: run.encounterId, cost: run.cost } : null;
  const next = run && victory ? nextPointerAfter(run.pointer) : null;

  const subtitle = boss.summary
    ? `${translate(encounter.name)} · ${t(
        (content.bossTier(boss.summary.bossId, boss.summary.tierId)?.name ?? 'bosses.title') as I18nKey,
      )}`
    : run
      ? `${t('settlement.stage', { settlement: run.pointer.settlement, stage: run.pointer.stage })} · ${translate(
          run.settlementName,
        )} · ${t(`campaign.difficulty.${run.pointer.difficulty}`)}`
      : translate(encounter.name);
  const batchLine = repeated
    ? `${t('campaignRun.summary', { count: campaign.completed })}${
        campaign.endedBecause === 'energy'
          ? ` · ${t('campaignRun.outOfEnergy', { count: campaign.completed })}`
          : campaign.endedBecause === 'defeat'
            ? ` · ${t('campaignRun.stoppedOnDefeat')}`
            : ''
      }`
    : null;

  // The one press that matters sits on the right: the mode's own way back, the next stand after a
  // won one, or the team after a lost one — and the team is never offered twice.
  const primary = boss.summary ? (
    <Button
      variant="primary"
      size="lg"
      onClick={() => backToGate(actions, boss.summary?.bossId ?? null)}
      data-testid="result-gate"
    >
      {t('bosses.result.back')}
    </Button>
  ) : tower.summary ? (
    <Button variant="primary" size="lg" onClick={() => backToTower(actions)} data-testid="result-tower">
      {t('tower.result.back')}
    </Button>
  ) : keep.summary ? (
    <Button
      variant="primary"
      size="lg"
      onClick={() => backToKeep(actions, keep.slug, keep.difficulty)}
      data-testid="result-dungeon"
    >
      {t('dungeon.outcome.back')}
    </Button>
  ) : brewery.summary ? (
    <Button
      variant="primary"
      size="lg"
      onClick={() => backToHall(actions, brewery.summary?.element ?? null)}
      data-testid="result-brewery"
    >
      {t('brewery.result.back')}
    </Button>
  ) : next ? (
    <Button
      variant="primary"
      size="lg"
      iconRight={<Glyph glyph="glyph.sword_clash" size={26} color="var(--gold-3)" />}
      onClick={() => nextStand(actions, next)}
      data-testid="result-next"
    >
      {t('battleResult.nextStage')}
    </Button>
  ) : null;

  return (
    <div
      className={[styles.root, victory ? styles.victory : styles.defeat].join(' ')}
      data-testid="screen-battle-result"
      data-outcome={outcome.kind}
    >
      <Backdrop
        asset={encounter.backdrop}
        grade={victory ? 'rgba(30, 22, 10, 0.62)' : 'rgba(36, 8, 12, 0.7)'}
        parallax={6}
      />
      <AmbientLayer preset={victory ? 'hub' : 'interior'} />
      <div className={styles.vignette} aria-hidden="true" />

      <ResultCrest
        kind={outcome.kind}
        subtitle={subtitle}
        stars={victory && last ? (repeated ? batch.best : last.stars) : null}
        newRecord={victory && (last?.newRecord ?? false)}
        batch={batchLine}
        enemyLeft={!victory && outcome.kind !== 'retreat' && !boss.summary ? outcome.enemyHpLeft : null}
      />

      <div className={styles.body}>
        <ChampionReport
          allies={allies}
          roster={save.roster}
          xpGained={rewards?.championXp ?? keep.championXp}
          levelUps={levelUps}
          aside={<ResultStats outcome={outcome} />}
        />

        <section className={styles.side}>
          {/* Bounded above the buttons: a long batch — its spoils, its drops — scrolls inside the
              panel rather than running on underneath them. */}
          <ScrollArea height="100%" fade className={styles.sideScroll} data-testid="result-stats-scroll">
            <div className={styles.sideContent}>
              {boss.summary ? (
                <BossOutcomePanel summary={boss.summary} />
              ) : tower.summary ? (
                <TowerOutcomePanel summary={tower.summary} />
              ) : keep.summary ? (
                <DungeonOutcomePanel session={keep} />
              ) : brewery.summary ? (
                <BreweryOutcomePanel summary={brewery.summary} />
              ) : rewards ? (
                <SpoilsPanel
                  rewards={rewards}
                  firstClear={(last?.firstClear ?? false) || batch.firstClear}
                  chestThresholds={last?.chestThresholds ?? []}
                  owedChoice={owedChoice}
                  dropped={dropped}
                  gearLost={gearLost}
                  chronicleLevel={last && last.playerLevelsGained > 0 ? save.profile.level : null}
                  mastered={mastered}
                />
              ) : null}
              {advice.length || grow ? (
                <DefeatAdvice
                  advice={advice}
                  note={!rewards && !sideMode ? t('battleResult.noRewards') : null}
                  grow={grow}
                  onGo={(go) => leaveResult(actions, go, null)}
                />
              ) : null}
              {palacePoints > 0 ? (
                <PalacePlate points={palacePoints} onOpen={() => leaveResult(actions, 'palace', null)} />
              ) : null}
              <p className={`num ${styles.seed}`}>{t('battleResult.seed', { seed: outcome.seed })}</p>
            </div>
          </ScrollArea>
        </section>
      </div>

      <footer className={styles.actions}>
        <div className={styles.secondary}>
          <Button
            variant="secondary"
            size="md"
            onClick={() => leaveResult(actions, 'hub', stand)}
            data-testid="result-hub"
          >
            {t('battleResult.hub')}
          </Button>
          {sideMode ? null : (
            <Button
              variant="secondary"
              size="md"
              onClick={() => leaveResult(actions, 'campaign', stand)}
              data-testid="result-campaign"
            >
              {t('battleResult.campaign')}
            </Button>
          )}
          {/* A mode's own screen is where its team is set, so only a stand offers the setup here. */}
          {primary && !sideMode ? (
            <Button
              variant="secondary"
              size="md"
              onClick={() => leaveResult(actions, 'team', stand)}
              data-testid="result-team"
            >
              {t('battleResult.team')}
            </Button>
          ) : null}
          {stand ? (
            <Button
              variant="secondary"
              size="md"
              onClick={() => replayStand(actions, stand, teamIds, campaign.requested)}
              data-testid="result-replay"
            >
              {victory ? t('battleResult.replay') : t('battleResult.tryAgain')} ·{' '}
              {t('battleSetup.cost', { cost: stand.cost })}
            </Button>
          ) : null}
        </div>
        {primary ?? (
          <Button
            variant="primary"
            size="lg"
            onClick={() => leaveResult(actions, 'team', stand)}
            data-testid="result-team"
          >
            {t('battleResult.team')}
          </Button>
        )}
      </footer>
    </div>
  );
}
