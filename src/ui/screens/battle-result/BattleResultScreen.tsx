import { useStore } from 'zustand';
import { content } from '@content/registry';
import { battleController } from '@state/battle/index';
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
import { launchBattle } from '@ui/flows/battle';
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
  const outcome = session.outcome;
  const encounter = session.encounter;
  const victory = outcome?.kind === 'victory';
  useSceneAudio(victory ? 'hub' : 'battle', 'none');
  if (!outcome || !encounter) {
    return null;
  }
  const allies = outcome.units.filter((u) => u.side === 'ally');
  const teamIds = allies.map((u) => u.instanceId).filter((id): id is string => !!id);
  const enemyTurns = outcome.turns - outcome.allyTurns;
  const hints: I18nKey[] = [];
  if (!victory && outcome.kind !== 'retreat') {
    if (enemyTurns > outcome.allyTurns * 1.4) hints.push('battleResult.hint.outsped');
    if (
      encounter.waves.some((w) => w.enemies.some((e) => e.enemyId === 'enemy.remnant_mender')) &&
      outcome.wavesCleared < outcome.waveCount
    )
      hints.push('battleResult.hint.healer');
    if (outcome.kind === 'timeout') hints.push('battleResult.hint.turns');
    hints.push('battleResult.hint.level');
  }
  const leave = (route: 'team' | 'hub'): void => {
    battleController.end();
    actions.resetStack({ name: 'hub' });
    if (route === 'team') {
      actions.push({ name: 'training' });
      actions.push({ name: 'battle-setup', encounterId: encounter.id });
    }
  };
  const replay = (): void => {
    battleController.end();
    actions.resetStack({ name: 'hub' });
    actions.push({ name: 'training' });
    actions.push({ name: 'battle-setup', encounterId: encounter.id });
    launchBattle({ encounterId: encounter.id, instanceIds: teamIds });
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
        <p className={styles.subtitle}>{translate(encounter.name)}</p>
      </header>

      <div className={styles.columns}>
        <Panel kind="stone" padding={22} className={styles.stats}>
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
          <p className={styles.noRewards}>{t('battleResult.noRewards')}</p>
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
        <Button variant="secondary" size="md" onClick={() => leave('team')} data-testid="result-team">
          {t('battleResult.team')}
        </Button>
        <Button variant="primary" size="lg" onClick={replay} data-testid="result-replay">
          {t('battleResult.replay')}
        </Button>
      </footer>
    </div>
  );
}
