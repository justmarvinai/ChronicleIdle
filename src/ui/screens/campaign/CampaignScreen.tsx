import { useMemo } from 'react';
import { backdrop } from '@assets/manifest';
import type { Difficulty } from '@content/balance/battle';
import { BOSS_STAGE_NUMBER, STARS_PER_SETTLEMENT, STAR_CHEST_THRESHOLDS } from '@content/balance/campaign';
import { content } from '@content/registry';
import type { SettlementDef } from '@content/stages/types';
import { playSfx } from '@audio/index';
import {
  difficultyStars,
  isSettlementUnlocked,
  isStageCleared,
  nextStage,
  settlementStars,
  stageIdOf,
  type CampaignProgress,
} from '@engine/campaign/progress';
import { t, translate } from '@i18n/index';
import { availableDifficulties, currentPointer, progressOf } from '@state/campaign';
import { selectActions, selectSave } from '@state/selectors';
import { useGameStore } from '@state/store';
import { AmbientLayer } from '@render/ambient/AmbientLayer';
import { Backdrop } from '@ui/components/Backdrop/Backdrop';
import { Button } from '@ui/components/Button/Button';
import { Dropdown } from '@ui/components/Dropdown/Dropdown';
import { DecoFrame } from '@ui/components/Frame/DecoFrame';
import { Panel } from '@ui/components/Frame/Panel';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { StarRow } from '@ui/components/StarRow/StarRow';
import { TopBar } from '@ui/components/TopBar/TopBar';
import { useSceneAudio } from '@ui/hooks/useSceneAudio';
import type { ScreenProps } from '@ui/router/screens';
import { ELEMENT_COLOR, ELEMENT_GLYPH } from '@ui/styles/display-maps';
import styles from './CampaignScreen.module.css';

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  intro: t('campaign.difficulty.intro'),
  normal: t('campaign.difficulty.normal'),
  hard: t('campaign.difficulty.hard'),
};

/** Campaign map (docs/tech/UI_DESIGN.md §5.6): twelve settlement banners on one painted map. */
export default function CampaignScreen(_props: ScreenProps) {
  const actions = useGameStore(selectActions);
  const save = useGameStore(selectSave);
  useSceneAudio('hub', 'hub');
  const progress = useMemo<CampaignProgress>(
    () => (save ? progressOf(save) : { stars: {}, bestTurns: {} }),
    [save],
  );
  const here = useMemo(() => (save ? currentPointer(save) : null), [save]);
  if (!save || !here) return null;
  const difficulty = here.difficulty;
  const open = availableDifficulties(save);
  const total = difficultyStars(progress, difficulty);

  const setDifficulty = (next: Difficulty): void => {
    const first = nextStage({
      stars: Object.fromEntries(Object.entries(progress.stars).filter(([k]) => k.endsWith(`|${next}`))),
      bestTurns: progress.bestTurns,
    });
    actions.selectStage({ ...first, difficulty: next });
    playSfx('ui.tab');
  };

  return (
    <div className={styles.root} data-testid="screen-campaign">
      <Backdrop asset="bg.bg2" grade="rgba(28, 20, 12, 0.55)" parallax={10} />
      <AmbientLayer preset="hub" />
      <TopBar title={t('campaign.title')} onBack={() => actions.pop()} />

      <div className={styles.head}>
        <p className={styles.subtitle}>{t('campaign.subtitle')}</p>
        <div className={styles.headRight}>
          <span className={`num ${styles.total}`} data-testid="campaign-stars">
            {t('campaign.stars', { stars: total.stars, max: total.max })}
          </span>
        </div>
      </div>

      <div className={styles.map} data-testid="campaign-map">
        {content.settlements.map((settlement) => (
          <SettlementBanner
            key={settlement.id}
            settlement={settlement}
            difficulty={difficulty}
            progress={progress}
            current={here.settlement === settlement.index}
            onOpen={() => {
              actions.selectStage({
                settlement: settlement.index,
                stage: here.settlement === settlement.index ? here.stage : 1,
                difficulty,
              });
              actions.push({ name: 'settlement', settlement: settlement.index });
            }}
          />
        ))}
      </div>

      <div className={styles.foot}>
        <div className={styles.difficulty} data-testid="difficulty-select">
          <Dropdown<Difficulty>
            label={t('campaign.difficulty')}
            width={220}
            value={difficulty}
            options={(['intro', 'normal', 'hard'] as Difficulty[]).map((d) => ({
              value: d,
              label: open.includes(d) ? DIFFICULTY_LABEL[d] : `${DIFFICULTY_LABEL[d]} 🔒`,
            }))}
            onChange={(d) => (open.includes(d) ? setDifficulty(d) : playSfx('ui.error'))}
          />
          {open.length < 3 ? (
            <p className={styles.locked}>
              {t('campaign.difficulty.locked', {
                previous: DIFFICULTY_LABEL[open.length === 1 ? 'intro' : 'normal'],
                next: DIFFICULTY_LABEL[open.length === 1 ? 'normal' : 'hard'],
              })}
            </p>
          ) : null}
        </div>

        <Panel kind="thin" padding={12} className={styles.chests}>
          <span className={styles.chestLabel}>{t('campaign.chests')}</span>
          <div className={styles.chestRow}>
            {STAR_CHEST_THRESHOLDS.map((threshold) => {
              const claimed = settlementStars(progress, here.settlement, difficulty) >= threshold;
              return (
                <span
                  key={threshold}
                  className={[styles.chest, claimed ? styles.chestOn : ''].join(' ')}
                  data-testid={`chest-${threshold}`}
                >
                  <Glyph
                    glyph={claimed ? 'glyph.trophy_cup' : 'glyph.broken_shackle'}
                    size={26}
                    color={claimed ? 'var(--gold-3)' : 'var(--text-3)'}
                  />
                  <span className="num">{t('campaign.chestAt', { stars: threshold })}</span>
                </span>
              );
            })}
          </div>
        </Panel>

        <Button variant="secondary" size="md" onClick={() => actions.resetStack({ name: 'hub' })}>
          {t('campaign.hub')}
        </Button>
      </div>
    </div>
  );
}

function SettlementBanner({
  settlement,
  difficulty,
  progress,
  current,
  onOpen,
}: {
  settlement: SettlementDef;
  difficulty: Difficulty;
  progress: CampaignProgress;
  current: boolean;
  onOpen: () => void;
}) {
  const unlocked = isSettlementUnlocked(progress, settlement.index, difficulty);
  const stars = settlementStars(progress, settlement.index, difficulty);
  // "Cleared" means the boss fell: the settlement then wears the ornate frame.
  const cleared = isStageCleared(progress, stageIdOf(settlement.index, BOSS_STAGE_NUMBER), difficulty);
  const art = backdrop(settlement.backdrop);
  const previous = content.settlementByIndex(settlement.index - 1);
  return (
    <DecoFrame
      frame={cleared ? 13 : unlocked ? 3 : 5}
      tint={cleared ? '#f2a93b' : unlocked ? '#c9a24a' : '#6c6458'}
      thickness={14}
      className={[styles.banner, unlocked ? '' : styles.bannerLocked, current ? styles.bannerHere : ''].join(
        ' ',
      )}
      style={{ animationDelay: `${settlement.index * 45}ms` }}
      data-testid={`settlement-${settlement.index}`}
    >
      <div
        className={styles.art}
        style={{ backgroundImage: `url("${art.url}")`, filter: unlocked ? undefined : 'grayscale(0.8)' }}
      />
      <div
        className={styles.shade}
        style={{ background: `linear-gradient(to bottom, rgba(11,10,13,0.35), ${settlement.grade})` }}
      />
      <div className={styles.bannerHead}>
        <span className={`num ${styles.index}`}>{settlement.index}</span>
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
            label={settlement.element}
          />
        </span>
      </div>
      <h2 className={`display ${styles.name}`}>{translate(settlement.name)}</h2>
      {unlocked ? (
        <>
          <StarRow stars={Math.round((stars / STARS_PER_SETTLEMENT) * 5)} max={5} size={15} />
          <span className={`num ${styles.count}`}>
            {stars} / {STARS_PER_SETTLEMENT} ★
          </span>
          {current ? <span className={styles.here}>{t('campaign.current')}</span> : null}
          <Button
            size="sm"
            variant={current ? 'primary' : 'secondary'}
            onClick={onOpen}
            data-testid={`enter-${settlement.index}`}
          >
            {t('campaign.enter')}
          </Button>
        </>
      ) : (
        <>
          <Glyph glyph="glyph.broken_shackle" size={34} color="rgba(141,133,119,0.85)" />
          <span className={styles.lockText}>
            {t('campaign.settlementLocked', {
              previous: previous ? translate(previous.name) : t('campaign.settlementNumber', { index: 1 }),
            })}
          </span>
        </>
      )}
    </DecoFrame>
  );
}
