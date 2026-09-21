import { useMemo } from 'react';
import type { GlyphKey } from '@assets/manifest.generated';
import { content } from '@content/registry';
import type { BossDef } from '@content/bosses/types';
import { formatDuration } from '@engine/time/clock';
import { unlockLevel } from '@engine/progression/unlocks';
import { t, translate, type I18nKey } from '@i18n/index';
import { bossView } from '@state/bosses';
import { selectActions, selectFeatureUnlocked, selectSave } from '@state/selectors';
import { useGameStore } from '@state/store';
import { AmbientLayer } from '@render/ambient/AmbientLayer';
import { Backdrop } from '@ui/components/Backdrop/Backdrop';
import { ModeCard } from '@ui/components/ModeCard/ModeCard';
import { TopBar } from '@ui/components/TopBar/TopBar';
import { useNow } from '@ui/hooks/useNow';
import { useSceneAudio } from '@ui/hooks/useSceneAudio';
import type { ScreenProps } from '@ui/router/screens';
import styles from './BossMenuScreen.module.css';

/** A glyph per boss, so the two cards read apart at a glance. */
const BOSS_GLYPH: Readonly<Record<string, GlyphKey>> = {
  'boss.gargoyle': 'glyph.flaming_skull',
  'boss.titan': 'glyph.cursed_eye',
};

/**
 * The Bosses menu (docs/tech/UI_DESIGN.md §5.13a): the second menu behind Battle → Bosses, one
 * tall card per period boss. Each card is the boss's own — its name, what it is, how often it
 * opens and the keys waiting at it — because nothing in the game calls them "the daily" and "the
 * weekly" any more.
 */
export default function BossMenuScreen(_props: ScreenProps) {
  const actions = useGameStore(selectActions);
  useSceneAudio('hub', 'hub');
  return (
    <div className={styles.root} data-testid="screen-boss-menu">
      <Backdrop asset="bg.bg3" grade="rgba(16, 12, 18, 0.5)" parallax={8} />
      <AmbientLayer preset="interior" />
      <TopBar title={t('bosses.menu.title')} onBack={() => actions.pop()} />
      <div className={styles.cards}>
        {content.bosses.map((boss, index) => (
          <BossCard key={boss.id} boss={boss} index={index} />
        ))}
      </div>
    </div>
  );
}

function BossCard({ boss, index }: { boss: BossDef; index: number }) {
  const actions = useGameStore(selectActions);
  const save = useGameStore(selectSave);
  const unlocked = useGameStore(selectFeatureUnlocked(boss.feature));
  // Both the keys and the reset are countdowns; a minute's resolution is plenty for a period.
  const now = useNow(30_000);
  const view = useMemo(
    () => (save && unlocked ? bossView(save, boss.id, now) : null),
    [save, unlocked, boss.id, now],
  );
  const keys = view
    ? view.keysLeft > 0
      ? t('bosses.menu.keys', {
          left: view.keysLeft,
          total: boss.keysPerPeriod,
          time: formatDuration(view.msUntilReset),
        })
      : t('bosses.menu.spent', { time: formatDuration(view.msUntilReset) })
    : null;
  return (
    <ModeCard
      title={translate(boss.name)}
      body={translate(boss.lore)}
      art={boss.backdrop}
      glyph={BOSS_GLYPH[boss.id] ?? 'glyph.flaming_skull'}
      {...(keys ? { note: keys } : {})}
      unlocked={unlocked}
      lockedLabel={t('common.unlocksAtLevel', { level: unlockLevel(boss.feature) })}
      index={index}
      testId={`mode-${boss.period}`}
      onOpen={(open) =>
        actions.push(
          open
            ? { name: 'bosses', boss: boss.id }
            : { name: 'locked', feature: boss.feature, titleKey: boss.name as I18nKey },
        )
      }
    >
      {/* How often the gate opens: the cadence stays, only the words "daily boss" are gone. */}
      <p className={styles.cadence}>{t(`bosses.menu.cadence.${boss.period}` as I18nKey)}</p>
    </ModeCard>
  );
}
