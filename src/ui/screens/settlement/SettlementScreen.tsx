import { useMemo } from 'react';
import type { Difficulty } from '@content/balance/battle';
import {
  BREW_DROP_CHANCE,
  MATERIAL_DROPS,
  SHARD_DROP_CHANCE,
  STARS_PER_SETTLEMENT,
} from '@content/balance/campaign';
import { content } from '@content/registry';
import type { StageDef } from '@content/stages/types';
import { playSfx } from '@audio/index';
import { stageEnemyLevel, stageEncounterId, stageEnergyCost } from '@engine/campaign/encounter';
import {
  bestTurnsOf,
  isStageUnlocked,
  settlementStars,
  starsOf,
  type CampaignProgress,
} from '@engine/campaign/progress';
import { globalStageIndex } from '@content/balance/campaign';
import { t, translate } from '@i18n/index';
import { currentPointer, progressOf } from '@state/campaign';
import { selectActions, selectSave } from '@state/selectors';
import { useGameStore } from '@state/store';
import type { Route } from '@state/ui-types';
import { AmbientLayer } from '@render/ambient/AmbientLayer';
import { Backdrop } from '@ui/components/Backdrop/Backdrop';
import { Button } from '@ui/components/Button/Button';
import { Panel } from '@ui/components/Frame/Panel';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { ScrollArea } from '@ui/components/ScrollArea/ScrollArea';
import { StarRow } from '@ui/components/StarRow/StarRow';
import { TopBar } from '@ui/components/TopBar/TopBar';
import { useSceneAudio } from '@ui/hooks/useSceneAudio';
import type { ScreenProps } from '@ui/router/screens';
import { ELEMENT_COLOR, ELEMENT_GLYPH } from '@ui/styles/display-maps';
import { elementLabel } from '@ui/screens/champions/roster-view';
import styles from './SettlementScreen.module.css';

type SettlementRoute = Extract<Route, { name: 'settlement' }>;

/** Settlement stands (docs/tech/UI_DESIGN.md §5.7): ten stages, their stars and what they drop. */
export default function SettlementScreen({ route }: ScreenProps) {
  const index = (route as SettlementRoute).settlement;
  const actions = useGameStore(selectActions);
  const save = useGameStore(selectSave);
  useSceneAudio('hub', 'interior');
  const settlement = content.settlementByIndex(index);
  const progress = useMemo<CampaignProgress>(
    () => (save ? progressOf(save) : { stars: {}, bestTurns: {} }),
    [save],
  );
  const here = useMemo(() => (save ? currentPointer(save) : null), [save]);
  if (!save || !settlement || !here) return null;
  const difficulty: Difficulty = here.difficulty;
  const stars = settlementStars(progress, index, difficulty);

  const openStage = (stage: StageDef): void => {
    const pointer = { settlement: index, stage: stage.number, difficulty };
    if (!isStageUnlocked(progress, index, stage.number, difficulty)) {
      playSfx('ui.error');
      return;
    }
    actions.selectStage(pointer);
    actions.push({ name: 'battle-setup', encounterId: stageEncounterId(stage.id, difficulty) });
  };

  return (
    <div className={styles.root} data-testid="screen-settlement">
      <Backdrop asset={settlement.backdrop} grade={settlement.grade} parallax={8} />
      <AmbientLayer preset="interior" />
      <TopBar title={translate(settlement.name)} onBack={() => actions.pop()} />

      <aside className={styles.side}>
        <Panel kind="stone" padding={18} className={styles.sidePanel}>
          <h2 className={`display ${styles.sideTitle}`}>{translate(settlement.name)}</h2>
          <p className={styles.lore}>{translate(settlement.description)}</p>
          <div className={styles.starsRow}>
            <StarRow stars={Math.round((stars / STARS_PER_SETTLEMENT) * 5)} max={5} size={18} />
            <span className={`num ${styles.starCount}`} data-testid="settlement-stars">
              {stars} / {STARS_PER_SETTLEMENT} ★
            </span>
          </div>
          <div className={styles.metaRow}>
            <span className={styles.label}>{t('settlement.element')}</span>
            <span
              className={styles.element}
              style={{
                background: `radial-gradient(circle, ${ELEMENT_COLOR[settlement.element]} 0%, rgba(11,10,13,0.9) 75%)`,
              }}
            >
              <Glyph
                glyph={ELEMENT_GLYPH[settlement.element]}
                size={18}
                color="var(--text-1)"
                label={elementLabel(settlement.element)}
              />
            </span>
            <span className={styles.elementName}>{elementLabel(settlement.element)}</span>
          </div>
          <h3 className={`display ${styles.dropsTitle}`}>{t('settlement.drops')}</h3>
          <ul className={styles.drops}>
            <li>
              {t('settlement.dropGear', {
                sets: settlement.setPool.map((id) => setName(id)).join(', '),
              })}
            </li>
            <li>
              {t('settlement.dropMaterials')}:{' '}
              {MATERIAL_DROPS[difficulty]
                .map((roll) => `${translate(`currency.${roll.currency}.name`)} ${roll.min}–${roll.max}`)
                .join(', ')}
            </li>
            <li>{t('settlement.dropShard', { percent: Math.round(SHARD_DROP_CHANCE[difficulty] * 100) })}</li>
            <li>
              {t('settlement.dropBrew', {
                element: elementLabel(settlement.element),
                percent: Math.round(BREW_DROP_CHANCE * 100),
              })}
            </li>
          </ul>
        </Panel>
      </aside>

      <section className={styles.stages} aria-label={t('settlement.stages')}>
        <ScrollArea height="100%" className={styles.scroller}>
          <ul className={styles.list} data-testid="stage-list">
            {settlement.stages.map((stage) => (
              <StageRow
                key={stage.id}
                stage={stage}
                settlementIndex={index}
                difficulty={difficulty}
                progress={progress}
                current={here.stage === stage.number}
                onOpen={() => openStage(stage)}
              />
            ))}
          </ul>
        </ScrollArea>
      </section>
    </div>
  );
}

function StageRow({
  stage,
  settlementIndex,
  difficulty,
  progress,
  current,
  onOpen,
}: {
  stage: StageDef;
  settlementIndex: number;
  difficulty: Difficulty;
  progress: CampaignProgress;
  current: boolean;
  onOpen: () => void;
}) {
  const unlocked = isStageUnlocked(progress, settlementIndex, stage.number, difficulty);
  const stars = starsOf(progress, stage.id, difficulty);
  const best = bestTurnsOf(progress, stage.id, difficulty);
  const cost = stageEnergyCost(settlementIndex, stage.boss, difficulty);
  const level = stageEnemyLevel(globalStageIndex(settlementIndex, stage.number), difficulty);
  const enemies = stage.waves.flat();
  const shown = [...new Set(enemies)].slice(0, 5);
  return (
    <li>
      <Panel
        kind={stage.boss ? 'ember-wide' : 'thin'}
        padding={14}
        className={[styles.row, unlocked ? '' : styles.rowLocked, current ? styles.rowHere : ''].join(' ')}
        data-testid={`stage-${stage.id.replace(/\./g, '-')}`}
      >
        <div className={styles.rowHead}>
          <span className={`num ${styles.stageNumber}`}>
            {settlementIndex}-{stage.number}
          </span>
          {stage.boss ? <span className={styles.bossTag}>{t('settlement.bossStand')}</span> : null}
          <StarRow stars={stars} max={3} size={18} />
          <span className={`num ${styles.best}`}>
            {best === null ? t('settlement.noRecord') : t('settlement.bestTurns', { turns: best })}
          </span>
        </div>
        <div className={styles.rowBody}>
          <span className={styles.enemiesText}>
            {t('settlement.enemies', { count: enemies.length, waves: stage.waves.length })} ·{' '}
            {t('battleSetup.enemyLevel', { level })}
          </span>
          <div className={styles.chips}>
            {shown.map((enemyId) => {
              const def = content.enemyById(enemyId);
              if (!def) return null;
              return (
                <span key={enemyId} className={styles.chip} title={translate(def.name)}>
                  <span
                    className={styles.chipSigil}
                    style={{
                      background: `radial-gradient(circle, ${ELEMENT_COLOR[def.element]} 0%, rgba(11,10,13,0.9) 75%)`,
                    }}
                  >
                    <Glyph glyph={ELEMENT_GLYPH[def.element]} size={14} color="var(--text-1)" />
                  </span>
                  <span className={styles.chipName}>{translate(def.name)}</span>
                </span>
              );
            })}
          </div>
        </div>
        <div className={styles.rowFoot}>
          <span className={styles.starHint}>
            {t('settlement.star3', { turns: stage.turnLimit3Star })} ·{' '}
            {t('settlement.turnLimit', { turns: stage.turnLimitDefeat })}
          </span>
          {unlocked ? (
            <Button
              variant={current ? 'primary' : 'secondary'}
              size="md"
              onClick={onOpen}
              icon={<Glyph glyph="glyph.sword_clash" size={22} color="var(--gold-3)" />}
              data-testid={`battle-${stage.id.replace(/\./g, '-')}`}
            >
              {t('settlement.battle')} · {t('settlement.energy', { cost })}
            </Button>
          ) : (
            <span className={styles.lockText}>
              <Glyph glyph="glyph.broken_shackle" size={18} color="var(--text-3)" />
              {t('settlement.locked', { settlement: settlementIndex, stage: stage.number - 1 })}
            </span>
          )}
        </div>
      </Panel>
    </li>
  );
}

/** The set's own name, or a readable fallback if a settlement names a set that has gone. */
function setName(id: string): string {
  const set = content.gearSetById(id);
  if (set) return translate(set.name);
  return id
    .replace('gear_set.', '')
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
