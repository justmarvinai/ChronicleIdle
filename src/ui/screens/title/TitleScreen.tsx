import { useEffect, useRef } from 'react';
import { motion, type Variants } from 'motion/react';
import { imageUrl } from '@assets/manifest';
import { t } from '@i18n/index';
import { entryRoute, selectActions, selectBoot, selectProfile } from '@state/selectors';
import { useGameStore } from '@state/store';
import { services, servicesReady } from '@state/services';
import { AmbientLayer } from '@render/ambient/AmbientLayer';
import { Backdrop } from '@ui/components/Backdrop/Backdrop';
import { Button } from '@ui/components/Button/Button';
import { Panel } from '@ui/components/Frame/Panel';
import { useFullscreenOffer } from '@ui/hooks/useFullscreen';
import { useSceneAudio } from '@ui/hooks/useSceneAudio';
import { importChronicle } from '@ui/flows/importChronicle';
import { downloadTextFile } from '@platform/files';
import type { ScreenProps } from '@ui/router/screens';
import styles from './TitleScreen.module.css';

const WELCOME_BACK_AFTER_MS = 10 * 60_000;

export default function TitleScreen(_props: ScreenProps) {
  const actions = useGameStore(selectActions);
  const boot = useGameStore(selectBoot);
  const profile = useGameStore(selectProfile);
  const hasSave = useGameStore((s) => s.save !== null);
  const fullscreen = useGameStore((s) => s.ui.fullscreen);
  const lastOffline = useGameStore((s) => s.lastOffline);
  const { offer, toggle, supported } = useFullscreenOffer();
  const root = useRef<HTMLDivElement>(null);
  useSceneAudio('title', 'title');

  // Fullscreen is offered once on the first click anywhere on the title screen (never forced).
  // A fullscreen request spends the click's user activation, so controls that need it themselves
  // (the file picker behind Import) opt out with `data-keeps-activation`; the offer then waits
  // for the next click.
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const onFirstClick = (event: PointerEvent): void => {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('[data-keeps-activation]')) return;
      node.removeEventListener('pointerdown', onFirstClick);
      offer();
    };
    node.addEventListener('pointerdown', onFirstClick);
    return () => node.removeEventListener('pointerdown', onFirstClick);
  }, [offer]);

  const continueGame = (): void => {
    actions.resetStack(entryRoute(useGameStore.getState()));
    if (lastOffline && lastOffline.elapsedMs >= WELCOME_BACK_AFTER_MS)
      actions.openDialog({ name: 'welcome-back' });
  };

  const exportCorrupt = (): void => {
    if (boot.corruptSaveText)
      downloadTextFile(`chronicle-recovered-${Date.now()}.json`, boot.corruptSaveText, 'application/json');
  };

  return (
    <div ref={root} className={styles.root} data-testid="screen-title">
      <Backdrop asset="bg.bg9" grade="rgba(70, 30, 110, 0.28)" parallax={16} />
      <AmbientLayer preset="title" />
      <motion.img
        src={imageUrl('logo.chronicle_idle_png')}
        alt={t('app.name')}
        className={styles.logo}
        draggable={false}
        initial={{ opacity: 0, y: -24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}
      />
      <div className={styles.glint} aria-hidden="true" />

      <motion.nav
        className={styles.menu}
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.35 } } }}
        aria-label={t('app.name')}
      >
        {hasSave && profile ? (
          <motion.div variants={item}>
            <Button
              variant="primary"
              size="lg"
              className={styles.menuButton}
              onClick={continueGame}
              data-testid="btn-continue"
            >
              {t('title.continue')}
            </Button>
            <div className={`num ${styles.continueAs}`}>
              {t('title.continueAs', { name: profile.name, level: profile.level })}
            </div>
          </motion.div>
        ) : null}
        <motion.div variants={item}>
          <Button
            variant={hasSave ? 'secondary' : 'primary'}
            size="lg"
            className={styles.menuButton}
            onClick={() => actions.openDialog({ name: hasSave ? 'new-game-confirm' : 'new-game' })}
            data-testid="btn-new-chronicle"
          >
            {t('title.newChronicle')}
          </Button>
        </motion.div>
        <motion.div variants={item}>
          <Button
            variant="secondary"
            size="md"
            className={styles.menuButton}
            onClick={() => void importChronicle()}
            data-testid="btn-import"
            data-keeps-activation="true"
          >
            {t('title.import')}
          </Button>
        </motion.div>
        <motion.div variants={item}>
          <Button
            variant="secondary"
            size="md"
            className={styles.menuButton}
            onClick={() => actions.openDialog({ name: 'settings' })}
            data-testid="btn-settings"
          >
            {t('title.settings')}
          </Button>
        </motion.div>
      </motion.nav>

      {boot.unsupportedSaveVersion !== null ? (
        <Panel kind="thin" className={styles.notice} data-testid="notice-newer-save">
          <div className={`display ${styles.noticeTitle}`}>{t('save.newerVersion.title')}</div>
          <p className={styles.noticeBody}>{t('save.newerVersion.body')}</p>
          <Button size="sm" variant="secondary" onClick={exportCorrupt}>
            {t('settings.export')}
          </Button>
        </Panel>
      ) : null}
      {boot.error === 'save_corrupt' && boot.corruptSaveText ? (
        <Panel kind="thin" className={styles.notice} data-testid="notice-corrupt-save">
          <div className={`display ${styles.noticeTitle}`}>{t('app.error.title')}</div>
          <p className={styles.noticeBody}>{t('save.import.error.schema', { detail: 'stored save' })}</p>
          <Button size="sm" variant="secondary" onClick={exportCorrupt}>
            {t('settings.export')}
          </Button>
        </Panel>
      ) : null}

      <div className={styles.corner}>
        {supported ? (
          <Button variant="ghost" size="sm" onClick={() => void toggle()} data-testid="btn-fullscreen">
            {fullscreen ? t('title.exitFullscreen') : t('title.fullscreen')}
          </Button>
        ) : null}
        <Button variant="ghost" size="sm" onClick={() => actions.openDialog({ name: 'credits' })}>
          {t('title.credits')}
        </Button>
        <span className={`num ${styles.version}`}>
          {t('app.version', { version: servicesReady() ? services().appVersion : '' })}
        </span>
      </div>
    </div>
  );
}

const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.2, 0.8, 0.2, 1] } },
};
