import { useEffect, useMemo, useRef, useState } from 'react';
import { playSfx } from '@audio/index';
import { AUTO_REPEAT_TIERS } from '@content/balance/campaign';
import { DUNGEON_STAGES, type DungeonDifficulty } from '@content/balance/dungeon';
import { content } from '@content/registry';
import { dungeonEncounterId } from '@engine/dungeon/index';
import { isFeatureUnlocked } from '@engine/progression/unlocks';
import { t, translate, type I18nKey } from '@i18n/index';
import { dungeonView, type DungeonStageView } from '@state/dungeon';
import { selectActions, selectSave } from '@state/selectors';
import { useGameStore } from '@state/store';
import type { Route } from '@state/ui-types';
import { AmbientLayer } from '@render/ambient/AmbientLayer';
import { Backdrop } from '@ui/components/Backdrop/Backdrop';
import { Button } from '@ui/components/Button/Button';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { Panel } from '@ui/components/Frame/Panel';
import { ScrollArea } from '@ui/components/ScrollArea/ScrollArea';
import { SetEmblem } from '@ui/components/SetEmblem/SetEmblem';
import { Tabs } from '@ui/components/Tab/Tabs';
import { TopBar } from '@ui/components/TopBar/TopBar';
import { useSceneAudio } from '@ui/hooks/useSceneAudio';
import type { ScreenProps } from '@ui/router/screens';
import { raritiesLabel, starsLabel } from './dungeons-view';
import styles from './DungeonScreen.module.css';

/** A set's emblem at the head of its chip in the keep's set list, in CSS pixels. */
const CHIP_EMBLEM = 22;

type DungeonRoute = Extract<Route, { name: 'dungeon' }>;

/**
 * One keep (docs/tech/UI_DESIGN.md §5.24): the keeper and its sets on the left, the ladder of
 * twenty stages on the right, under a tab per difficulty.
 *
 * A stage row says the three things a farm is chosen on — how many stars it can drop, which
 * rarities, and what it costs — because in a mode with forty rungs, *which rung* is the whole
 * decision. The ladder opens on the deepest stage the player may enter.
 */
export default function DungeonScreen({ route }: ScreenProps) {
  const params = route as DungeonRoute;
  const actions = useGameStore(selectActions);
  const save = useGameStore(selectSave);
  useSceneAudio('hub', 'interior');
  const def = content.dungeonBySlug(params.dungeon);
  const [difficulty, setDifficulty] = useState<DungeonDifficulty>(params.difficulty ?? 'normal');
  const [runs, setRuns] = useState(1);
  const ladder = useRef<HTMLDivElement>(null);
  const view = useMemo(() => (save && def ? dungeonView(save, def) : null), [save, def]);

  const focus = params.stage ?? view?.stages[difficulty].find((stage) => stage.next)?.stage ?? 1;
  useEffect(() => {
    const node = ladder.current?.querySelector(`[data-stage="${focus}"]`);
    node?.scrollIntoView({ block: 'center' });
  }, [focus, difficulty]);

  if (!save || !def || !view) return null;
  const keeper = content.enemyById(def.keeperId);
  const energy = save.energy.value;

  const descend = (stage: number): void => {
    playSfx('ui.open');
    actions.setAutoRepeat(runs);
    actions.push({
      name: 'battle-setup',
      encounterId: dungeonEncounterId(def.slug, difficulty, stage),
    });
  };

  const repeats = [
    1,
    ...AUTO_REPEAT_TIERS.filter((tier) => isFeatureUnlocked(tier.feature, save.profile.level)).map(
      (tier) => tier.runs,
    ),
  ];

  return (
    <div className={styles.root} data-testid="screen-dungeon" data-dungeon={def.slug}>
      <Backdrop asset={def.backdrop} grade="rgba(14, 12, 20, 0.58)" parallax={10} />
      <AmbientLayer preset="interior" />
      <TopBar title={translate(def.name)} onBack={() => actions.pop()} />

      <aside className={styles.side}>
        <Panel kind="ember-tall" padding={18} className={styles.panel} contentClassName={styles.panelBody}>
          <h2 className={`display ${styles.heading}`}>{translate(def.name)}</h2>
          <p className={styles.lore}>{translate(def.lore)}</p>

          <div className={styles.keeper} data-testid="dungeon-keeper">
            <Glyph glyph={def.glyph} size={30} color="var(--gold-3)" />
            <div>
              <div className={styles.keeperLabel}>{t('dungeon.keeper')}</div>
              <div className={styles.keeperName}>{keeper ? translate(keeper.name) : def.keeperId}</div>
            </div>
          </div>

          <div>
            <p className={styles.setsLabel}>{t('dungeon.sets')}</p>
            <ul className={styles.setList} data-testid="dungeon-sets">
              {def.sets.map((id) => {
                const set = content.gearSetById(id);
                return (
                  <li key={id} className={styles.setChip}>
                    {set ? <SetEmblem emblem={set.emblem} size={CHIP_EMBLEM} /> : null}
                    <span>{set ? translate(set.name) : id}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          <p className={`num ${styles.deepest}`} data-testid="dungeon-deepest">
            {view.deepest
              ? t('dungeon.deepest', {
                  label: `${t(`dungeon.difficulty.${view.deepest.difficulty}` as I18nKey)} ${view.deepest.stage}`,
                })
              : t('dungeon.deepestNone')}
          </p>
        </Panel>
      </aside>

      <section className={styles.ladderWrap} aria-label={translate(def.name)}>
        <Tabs
          items={[
            { key: 'normal' as const, label: t('dungeon.difficulty.normal'), testId: 'dungeon-tab-normal' },
            { key: 'hard' as const, label: t('dungeon.difficulty.hard'), testId: 'dungeon-tab-hard' },
          ]}
          value={difficulty}
          onChange={setDifficulty}
        />

        {difficulty === 'hard' && !view.hardOpen ? (
          <p className={styles.hardLocked} data-testid="dungeon-hard-locked">
            {t('dungeon.hardLocked', { stage: DUNGEON_STAGES })}
          </p>
        ) : (
          <>
            {repeats.length > 1 ? (
              <div className={styles.repeatRow}>
                <span className={styles.repeatLabel}>{t('dungeon.repeat')}</span>
                <Tabs
                  items={repeats.map((count) => ({
                    key: String(count),
                    label: t('dungeon.repeatRuns', { runs: count }),
                    testId: `dungeon-repeat-${count}`,
                  }))}
                  value={String(runs)}
                  onChange={(key: string) => setRuns(Number.parseInt(key, 10))}
                />
              </div>
            ) : null}
            <ScrollArea height={780} className={styles.ladder} data-testid="dungeon-ladder">
              <div ref={ladder} className={styles.stages}>
                {view.stages[difficulty].map((stage) => (
                  <StageRow key={stage.stage} stage={stage} energy={energy} onDescend={descend} />
                ))}
              </div>
            </ScrollArea>
          </>
        )}
      </section>
    </div>
  );
}

/** One rung: its number and plate level, what it drops, what it costs and the way in. */
function StageRow({
  stage,
  energy,
  onDescend,
}: {
  stage: DungeonStageView;
  energy: number;
  onDescend: (stage: number) => void;
}) {
  const affordable = energy >= stage.band.energy;
  return (
    <div
      className={styles.stage}
      data-stage={stage.stage}
      data-open={stage.open}
      data-next={stage.next}
      data-testid={`dungeon-stage-${stage.stage}`}
    >
      <div>
        <span className={`num ${styles.stageNo}`}>{t('dungeon.stage', { stage: stage.stage })}</span>
        <span className={`num ${styles.stageLevel}`}>{t('dungeon.level', { level: stage.enemyLevel })}</span>
      </div>
      <div>
        <span className={`num ${styles.stars}`} data-testid={`dungeon-stars-${stage.stage}`}>
          {starsLabel(stage.stars)}
        </span>
        <span className={styles.rarities}>{raritiesLabel(stage.band)}</span>
      </div>
      <div className={`num ${styles.cost}`}>
        <span>{t('dungeon.energy', { energy: stage.band.energy })}</span>
        <span className={styles.second}>
          {stage.band.extraPiece > 0
            ? t('dungeon.extraPiece', { percent: Math.round(stage.band.extraPiece * 100) })
            : t('dungeon.onePiece')}
        </span>
      </div>
      <div>
        {stage.open ? (
          <>
            <Button
              variant={stage.next ? 'primary' : 'secondary'}
              size="md"
              disabled={!affordable}
              onClick={() => onDescend(stage.stage)}
              data-testid={`dungeon-enter-${stage.stage}`}
            >
              {affordable ? t('dungeon.enter') : t('dungeon.noEnergy')}
            </Button>
            {stage.cleared ? <span className={styles.clearedMark}>{t('dungeon.cleared')}</span> : null}
          </>
        ) : (
          <span className={styles.lockedMark}>{t('dungeon.locked', { stage: stage.stage - 1 })}</span>
        )}
      </div>
    </div>
  );
}
