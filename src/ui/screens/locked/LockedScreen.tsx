import { unlockLevel } from '@engine/progression/unlocks';
import { t } from '@i18n/index';
import { selectActions, selectProfile } from '@state/selectors';
import { useGameStore } from '@state/store';
import { AmbientLayer } from '@render/ambient/AmbientLayer';
import { Backdrop } from '@ui/components/Backdrop/Backdrop';
import { Bar } from '@ui/components/Bar/Bar';
import { Button } from '@ui/components/Button/Button';
import { Divider } from '@ui/components/Divider/Divider';
import { Panel } from '@ui/components/Frame/Panel';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { TopBar } from '@ui/components/TopBar/TopBar';
import { useSceneAudio } from '@ui/hooks/useSceneAudio';
import type { ScreenProps } from '@ui/router/screens';
import type { Route } from '@state/ui-types';
import styles from './LockedScreen.module.css';

type LockedRoute = Extract<Route, { name: 'locked' }>;

/** Shown for features that unlock at a later level or arrive in a later development chapter. */
export default function LockedScreen({ route }: ScreenProps) {
  const locked = route as LockedRoute;
  const actions = useGameStore(selectActions);
  const profile = useGameStore(selectProfile);
  const level = profile?.level ?? 1;
  const feature = locked.feature;
  const needed = feature === 'later-phase' ? 0 : unlockLevel(feature);
  const levelLocked = feature !== 'later-phase' && level < needed;
  useSceneAudio('hub', 'interior');
  return (
    <div className={styles.root} data-testid="screen-locked">
      <Backdrop asset="bg.bg5" grade="rgba(30, 20, 20, 0.45)" parallax={6} />
      <AmbientLayer preset="interior" />
      <TopBar title={t(locked.titleKey)} onBack={() => actions.pop()} />
      <div className={styles.center}>
        <Panel kind="arch" className={styles.panel} contentClassName={styles.panelBody} padding={40}>
          <Glyph glyph="glyph.broken_shackle" size={96} color="var(--gold-2)" />
          <h2 className={`display ${styles.title}`}>{t('locked.title')}</h2>
          <Divider kind="deco" index={3} width={320} />
          {locked.reasonKey ? (
            <p className={styles.body}>{t(locked.reasonKey)}</p>
          ) : levelLocked ? (
            <>
              <p className={styles.body}>{t('locked.levelBody', { level: needed, current: level })}</p>
              <Bar
                value={level}
                max={needed}
                kind="xp"
                width={420}
                height={40}
                showNumbers
                label={t('common.level', { level })}
              />
            </>
          ) : (
            <p className={styles.body}>{t('locked.phaseBody')}</p>
          )}
          <Button variant="primary" onClick={() => actions.pop()} data-testid="locked-back">
            {t('common.back')}
          </Button>
        </Panel>
      </div>
    </div>
  );
}
