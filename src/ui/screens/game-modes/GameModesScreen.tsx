import { backdrop } from '@assets/manifest';
import type { BackdropKey, GlyphKey } from '@assets/manifest.generated';
import type { FeatureId } from '@content/balance/unlocks';
import { playSfx } from '@audio/index';
import { t } from '@i18n/index';
import type { I18nKey } from '@i18n/index';
import { unlockLevel } from '@engine/progression/unlocks';
import { selectActions, selectFeatureUnlocked } from '@state/selectors';
import { useGameStore } from '@state/store';
import { AmbientLayer } from '@render/ambient/AmbientLayer';
import { Backdrop } from '@ui/components/Backdrop/Backdrop';
import { Button } from '@ui/components/Button/Button';
import { DecoFrame } from '@ui/components/Frame/DecoFrame';
import { CARD_FRAME, CARD_TINT } from '@ui/styles/display-maps';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { TopBar } from '@ui/components/TopBar/TopBar';
import { useSceneAudio } from '@ui/hooks/useSceneAudio';
import type { ScreenProps } from '@ui/router/screens';
import styles from './GameModesScreen.module.css';

interface ModeDef {
  id: string;
  feature: FeatureId;
  titleKey: I18nKey;
  bodyKey: I18nKey;
  art: BackdropKey;
  glyph: GlyphKey;
}

const MODES: readonly ModeDef[] = [
  {
    id: 'campaign',
    feature: 'campaign',
    titleKey: 'gameModes.campaign',
    bodyKey: 'gameModes.campaign.body',
    art: 'bg.bg7',
    glyph: 'glyph.crossed_swords',
  },
  {
    id: 'daily',
    feature: 'daily_boss',
    titleKey: 'gameModes.dailyBoss',
    bodyKey: 'gameModes.dailyBoss.body',
    art: 'bg.bg3',
    glyph: 'glyph.flaming_skull',
  },
  {
    id: 'weekly',
    feature: 'weekly_boss',
    titleKey: 'gameModes.weeklyBoss',
    bodyKey: 'gameModes.weeklyBoss.body',
    art: 'bg.bg9',
    glyph: 'glyph.cursed_eye',
  },
];

/** Game Modes (clones `different_content_battles_screen.png`): tall illustrated cards. */
export default function GameModesScreen(_props: ScreenProps) {
  const actions = useGameStore(selectActions);
  useSceneAudio('hub', 'hub');
  return (
    <div className={styles.root} data-testid="screen-game-modes">
      <Backdrop asset="bg.bg6" grade="rgba(20, 18, 40, 0.45)" parallax={8} />
      <AmbientLayer preset="interior" />
      <TopBar title={t('gameModes.title')} onBack={() => actions.pop()} />
      <div className={styles.cards}>
        {MODES.map((mode, index) => (
          <ModeCard
            key={mode.id}
            mode={mode}
            index={index}
            onOpen={() => actions.push({ name: 'locked', feature: mode.feature, titleKey: mode.titleKey })}
          />
        ))}
      </div>
    </div>
  );
}

function ModeCard({ mode, index, onOpen }: { mode: ModeDef; index: number; onOpen: () => void }) {
  const unlocked = useGameStore(selectFeatureUnlocked(mode.feature));
  const art = backdrop(mode.art);
  return (
    <DecoFrame
      frame={unlocked ? CARD_FRAME.unlocked : CARD_FRAME.locked}
      tint={unlocked ? CARD_TINT.unlocked : CARD_TINT.locked}
      thickness={16}
      className={[styles.card, unlocked ? '' : styles.cardLocked].join(' ')}
      style={{ animationDelay: `${index * 80}ms` }}
      data-testid={`mode-${mode.id}`}
    >
      <div className={styles.art} style={{ backgroundImage: `url("${art.url}")` }} />
      <div className={styles.shade} />
      <div className={styles.head}>
        <h2 className={`display ${styles.title}`}>{t(mode.titleKey)}</h2>
      </div>
      <div className={styles.glyph}>
        <Glyph
          glyph={unlocked ? mode.glyph : 'glyph.broken_shackle'}
          size={120}
          color={unlocked ? 'rgba(243,236,220,0.9)' : 'rgba(141,133,119,0.8)'}
        />
      </div>
      <div className={styles.foot}>
        <p className={styles.body}>{t(mode.bodyKey)}</p>
        {unlocked ? (
          <Button variant="primary" size="md" onClick={onOpen}>
            {t('gameModes.enter')}
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="md"
            sound="ui.cancel"
            onClick={() => (playSfx('ui.error'), onOpen())}
          >
            {t('common.unlocksAtLevel', { level: unlockLevel(mode.feature) })}
          </Button>
        )}
      </div>
    </DecoFrame>
  );
}
