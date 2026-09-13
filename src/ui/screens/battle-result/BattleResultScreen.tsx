import { useStore } from 'zustand';
import { content } from '@content/registry';
import { CURRENCY_BY_ID } from '@content/currencies/index';
import { battleController } from '@state/battle/index';
import { batchRewards, batchStars, campaignSession, clearCampaignSession } from '@state/campaign-session';
import { currentRunView, launchCampaignRun, nextPointerAfter } from '@ui/flows/campaign';
import { StarRow } from '@ui/components/StarRow/StarRow';
import { t, translate } from '@i18n/index';
import type { I18nKey } from '@i18n/index';
import { selectActions } from '@state/selectors';
import { useGameStore } from '@state/store';
import { AmbientLayer } from '@render/ambient/AmbientLayer';
import { championAvatar } from '@ui/champions/art';
import { Backdrop } from '@ui/components/Backdrop/Backdrop';
import { Button } from '@ui/components/Button/Button';
import { Panel } from '@ui/components/Frame/Panel';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { useSceneAudio } from '@ui/hooks/useSceneAudio';
import type { ScreenProps } from '@ui/router/screens';
import styles from './BattleResultScreen.module.css';

const TITLE: Record<string, I18nKey> = {
  victory: 'battleResult.victory',
  defeat: 'battleResult.defeat',
  timeout: 'battleResult.timeout',
  retreat: 'battleResult.retreat',
};

/** Battle result (docs/tech/UI_DESIGN.md §5.10): outcome, turns, per-champion report, next steps. */
export default function BattleResultScreen(_props: ScreenProps) {
  const actions = useGameStore(selectActions);
  const session = useStore(battleController.store);
  const campaign = useStore(campaignSession);
  const outcome = session.outcome;
  const encounter = session.encounter;
  const victory = outcome?.kind === 'victory';
  useSceneAudio(victory ? 'hub' : 'battle', 'none');
  if (!outcome || !encounter) {
    return null;
  }
  const run = currentRunView();
  const batch = batchStars(campaign);
  const last = campaign.summaries[campaign.summaries.length - 1] ?? null;
  const repeated = campaign.requested > 1;
  const rewards = repeated ? batchRewards(campaign) : (last?.rewards ?? null);
  const allies = outcome.units.filter((u) => u.side === 'ally');
  const teamIds = allies.map((u) => u.instanceId).filter((id): id is string => !!id);
  const enemyTurns = outcome.turns - outcome.allyTurns;
  const hints: I18nKey[] = [];
  if (!victory && outcome.kind !== 'retreat') {
    if (enemyTurns > outcome.allyTurns * 1.4) hints.push('battleResult.hint.outsped');
    const healers = encounter.waves.some((w) =>
      w.enemies.some((e) => content.enemyById(e.enemyId)?.archetype === 'mender'),
    );
    if (healers && outcome.wavesCleared < outcome.waveCount) hints.push('battleResult.hint.healer');
    if (outcome.kind === 'timeout') hints.push('battleResult.hint.turns');
    hints.push('battleResult.hint.level');
  }
  /** Every exit clears the run: the next fight is charged and seeded on its own. */
  const leave = (route: 'team' | 'hub' | 'campaign'): void => {
    battleController.end();
    clearCampaignSession();
    actions.resetStack({ name: 'hub' });
    if (route === 'hub') return;
    actions.push({ name: 'campaign' });
    if (run) actions.push({ name: 'settlement', settlement: run.pointer.settlement });
    if (route === 'team' && run) actions.push({ name: 'battle-setup', encounterId: run.encounterId });
  };
  const again = (pointer: typeof run extends null ? never : NonNullable<typeof run>['pointer']): void => {
    battleController.end();
    const requested = campaign.requested;
    clearCampaignSession();
    actions.resetStack({ name: 'hub' });
    actions.push({ name: 'campaign' });
    actions.push({ name: 'settlement', settlement: pointer.settlement });
    actions.push({ name: 'battle-setup', encounterId: encounter.id });
    const result = launchCampaignRun({ pointer, instanceIds: teamIds, repeat: requested });
    if (!result.ok) actions.toast('error', 'campaignRun.insufficientEnergy', { cost: run?.cost ?? 0 });
  };
  const next = run ? nextPointerAfter(run.pointer) : null;
  const goNext = (): void => {
    if (!next) return;
    battleController.end();
    clearCampaignSession();
    actions.resetStack({ name: 'hub' });
    actions.push({ name: 'campaign' });
    actions.push({ name: 'settlement', settlement: next.settlement });
    actions.selectStage(next);
    const ref = content.settlementByIndex(next.settlement)?.stages[next.stage - 1];
    if (ref)
      actions.push({
        name: 'battle-setup',
        encounterId: `encounter.${ref.id}.${next.difficulty}`,
      });
  };

  return (
    <div
      className={[styles.root, victory ? styles.victory : styles.defeat].join(' ')}
      data-testid="screen-battle-result"
    >
      <Backdrop
        asset={encounter.backdrop}
        grade={victory ? 'rgba(40, 30, 10, 0.55)' : 'rgba(40, 8, 12, 0.65)'}
        parallax={6}
      />
      <AmbientLayer preset={victory ? 'hub' : 'interior'} />
      <div className={styles.vignette} aria-hidden="true" />
      <header className={styles.header}>
        <Glyph
          glyph={victory ? 'glyph.trophy_cup' : 'glyph.skull_wreath'}
          size={72}
          color={victory ? 'var(--gold-3)' : 'var(--debuff)'}
        />
        <h1 className={`display ${styles.title}`} data-testid="result-title">
          {t(TITLE[outcome.kind] ?? 'battleResult.defeat')}
        </h1>
        <p className={styles.subtitle}>
          {run
            ? `${t('settlement.stage', {
                settlement: run.pointer.settlement,
                stage: run.pointer.stage,
              })} · ${translate(run.settlementName)}`
            : translate(encounter.name)}
        </p>
      </header>

      <div className={styles.columns}>
        <Panel kind="stone" padding={22} className={styles.stats}>
          {last ? (
            <div className={styles.starsRow} data-testid="result-stars">
              <StarRow stars={repeated ? batch.best : last.stars} max={3} size={30} />
              {repeated ? (
                <span className={`num ${styles.batch}`}>
                  {t('campaignRun.summary', { count: campaign.completed })}
                  {campaign.endedBecause === 'energy'
                    ? ` · ${t('campaignRun.outOfEnergy', { count: campaign.completed })}`
                    : campaign.endedBecause === 'defeat'
                      ? ` · ${t('campaignRun.stoppedOnDefeat')}`
                      : ''}
                </span>
              ) : null}
              {last.newRecord ? <span className={styles.record}>{t('battleResult.newRecord')}</span> : null}
            </div>
          ) : null}
          <dl className={styles.statList}>
            <div>
              <dt>{t('battleResult.turns')}</dt>
              <dd className="num" data-testid="result-turns">
                {outcome.allyTurns}
              </dd>
            </div>
            <div>
              <dt>{t('battleResult.totalTurns')}</dt>
              <dd className="num">{outcome.turns}</dd>
            </div>
            <div>
              <dt>{t('battleResult.waves')}</dt>
              <dd className="num">
                {outcome.wavesCleared} / {outcome.waveCount}
              </dd>
            </div>
          </dl>
          {!victory && outcome.kind !== 'retreat' ? (
            <p className={styles.enemyHp}>
              {t('battleResult.enemyHpLeft', { percent: Math.round(outcome.enemyHpLeft * 100) })}
            </p>
          ) : null}
          {hints.length ? (
            <ul className={styles.hints}>
              {hints.map((key) => (
                <li key={key}>{t(key)}</li>
              ))}
            </ul>
          ) : null}
          {rewards ? (
            <div className={styles.rewards} data-testid="result-rewards">
              <h3 className={`display ${styles.rewardTitle}`}>{t('battleResult.rewards')}</h3>
              <ul className={styles.rewardList}>
                {rewards.currencies.map((entry) => (
                  <li key={entry.currency}>
                    <span>{translate(CURRENCY_BY_ID[entry.currency].name)}</span>
                    <span className="num">+{entry.amount.toLocaleString('en-US')}</span>
                  </li>
                ))}
                {rewards.gems > 0 ? (
                  <li>
                    <span>{translate(CURRENCY_BY_ID.gems.name)}</span>
                    <span className="num">+{rewards.gems}</span>
                  </li>
                ) : null}
                {rewards.energy > 0 ? (
                  <li>
                    <span>{translate(CURRENCY_BY_ID.energy.name)}</span>
                    <span className="num">+{rewards.energy}</span>
                  </li>
                ) : null}
                <li>
                  <span>{t('battleResult.championXpLabel')}</span>
                  <span className="num">+{rewards.championXp.toLocaleString('en-US')}</span>
                </li>
                <li>
                  <span>{t('battleResult.playerXpLabel')}</span>
                  <span className="num">+{rewards.playerXp.toLocaleString('en-US')}</span>
                </li>
              </ul>
              {last?.firstClear || batch.firstClear ? (
                <p className={styles.bonus}>{t('battleResult.firstClear')}</p>
              ) : null}
              {(last?.chestThresholds ?? []).map((threshold) => (
                <p key={threshold} className={styles.bonus}>
                  {t('battleResult.starChest', { stars: threshold })}
                </p>
              ))}
              {rewards.gear.length ? <p className={styles.gear}>{t('battleResult.gearDrop')}</p> : null}
              {(last?.levelUps ?? []).map((up) => {
                const def = content.championById(
                  (useGameStore.getState().save?.roster[up.instanceId]?.defId ?? '') as never,
                );
                return (
                  <p key={up.instanceId} className={styles.bonus}>
                    {t('battleResult.levelUp', {
                      name: def ? translate(def.name) : up.instanceId,
                      level: up.level,
                    })}
                  </p>
                );
              })}
              {last && last.playerLevelsGained > 0 ? (
                <p className={styles.bonus}>
                  {t('battleResult.playerLevelUp', {
                    level: useGameStore.getState().save?.profile.level ?? 0,
                  })}
                </p>
              ) : null}
            </div>
          ) : (
            <p className={styles.noRewards}>{t('battleResult.noRewards')}</p>
          )}
          <p className={`num ${styles.seed}`}>{t('battleResult.seed', { seed: outcome.seed })}</p>
        </Panel>

        <Panel kind="stone" padding={22} className={styles.report}>
          <h2 className={`display ${styles.heading}`}>{t('battleResult.champions')}</h2>
          <table className={styles.table} data-testid="result-report">
            <thead>
              <tr>
                <th />
                <th>{t('battleResult.damageDealt')}</th>
                <th>{t('battleResult.damageTaken')}</th>
                <th>{t('battleResult.healing')}</th>
                <th>{t('battleResult.kills')}</th>
              </tr>
            </thead>
            <tbody>
              {allies.map((unit) => {
                const def = content.championById(unit.defId as never);
                const art = def ? championAvatar(def, 128) : null;
                return (
                  <tr key={unit.unitId} className={unit.alive ? '' : styles.fallen}>
                    <td className={styles.champ}>
                      {art ? (
                        <span className={styles.avatar} style={{ backgroundImage: `url("${art.url}")` }} />
                      ) : null}
                      <span className={`display ${styles.champName}`}>
                        {def ? translate(def.name) : unit.defId}
                      </span>
                      {!unit.alive ? (
                        <span className={styles.fallenTag}>{t('battleResult.fallen')}</span>
                      ) : null}
                    </td>
                    <td className="num">{unit.damageDealt.toLocaleString('en-US')}</td>
                    <td className="num">{unit.damageTaken.toLocaleString('en-US')}</td>
                    <td className="num">{unit.healingDone.toLocaleString('en-US')}</td>
                    <td className="num">{unit.kills}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>
      </div>

      <footer className={styles.actions}>
        <Button variant="secondary" size="md" onClick={() => leave('hub')} data-testid="result-hub">
          {t('battleResult.hub')}
        </Button>
        <Button variant="secondary" size="md" onClick={() => leave('campaign')} data-testid="result-campaign">
          {t('battleResult.campaign')}
        </Button>
        <Button variant="secondary" size="md" onClick={() => leave('team')} data-testid="result-team">
          {t('battleResult.team')}
        </Button>
        {run ? (
          <Button
            variant="secondary"
            size="md"
            onClick={() => again(run.pointer)}
            data-testid="result-replay"
          >
            {t('battleResult.replay')}
          </Button>
        ) : null}
        {victory && next ? (
          <Button variant="primary" size="lg" onClick={goNext} data-testid="result-next">
            {t('battleResult.nextStage')}
          </Button>
        ) : (
          <Button variant="primary" size="lg" onClick={() => leave('team')} data-testid="result-retry">
            {t('battleResult.team')}
          </Button>
        )}
      </footer>
    </div>
  );
}
