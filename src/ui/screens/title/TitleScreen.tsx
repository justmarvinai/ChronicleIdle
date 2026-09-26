import { useEffect, useMemo, useRef } from 'react';
import { motion, type Variants } from 'motion/react';
import { imageUrl } from '@assets/manifest';
import { t } from '@i18n/index';
import { entryRoute, selectActions, selectBoot, selectWornFrame } from '@state/selectors';
import { useGameStore } from '@state/store';
import { services, servicesReady } from '@state/services';
import { AmbientLayer } from '@render/ambient/AmbientLayer';
import { Backdrop } from '@ui/components/Backdrop/Backdrop';
import { Button } from '@ui/components/Button/Button';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { Panel } from '@ui/components/Frame/Panel';
import { ChangelogView } from '@ui/changelog/ChangelogView';
import { preloadChangelog } from '@ui/changelog/load-changelog';
import { useFullscreenOffer } from '@ui/hooks/useFullscreen';
import { useNow } from '@ui/hooks/useNow';
import { useSceneAudio } from '@ui/hooks/useSceneAudio';
import { importChronicle } from '@ui/flows/importChronicle';
import { downloadTextFile } from '@platform/files';
import type { ScreenProps } from '@ui/router/screens';
import { ChronicleCard, FirstChronicleCard } from './ChronicleCard';
import { chronicleCardView } from './title-view';
import styles from './TitleScreen.module.css';

const WELCOME_BACK_AFTER_MS = 10 * 60_000;

/**
 * The painting a little larger than the stage and anchored right, which moves the Eclipse gate into
 * the open middle between the chronicle and the changelog instead of behind the changelog's frame.
 * The ambient layer's glows sit on the gate at this framing (`AMBIENT_PRESETS.title`).
 */
const GATE_FRAMING = { size: 'auto 116%', position: '100% 40%' } as const;

// The Chronicle of Changes is a window on this screen from its first frame, so its pages start
// loading with the screen rather than after it (ADR-049 keeps them out of the first bundle).
preloadChangelog();

/**
 * The title screen (docs/tech/UI_DESIGN.md §5.1): three zones over the Eclipse gate. The wordmark,
 * the chronicle saved on this device and the way in on the left; the gate itself breathing in the
 * middle; the Chronicle of Changes open on the right, always — never a window you have to open.
 */
export default function TitleScreen(_props: ScreenProps) {
  const actions = useGameStore(selectActions);
  const boot = useGameStore(selectBoot);
  const save = useGameStore((s) => s.save);
  const frame = useGameStore(selectWornFrame);
  const fullscreen = useGameStore((s) => s.ui.fullscreen);
  const lastOffline = useGameStore((s) => s.lastOffline);
  const now = useNow(60_000);
  const { offer, toggle, supported } = useFullscreenOffer();
  const root = useRef<HTMLDivElement>(null);
  useSceneAudio('title', 'title');

  const card = useMemo(
    () => (save ? chronicleCardView(save, frame, now, lastOffline?.elapsedMs ?? null) : null),
    [save, frame, now, lastOffline],
  );

  // Fullscreen is offered once on the first click anywhere on the title screen (never forced).
  // A fullscreen request spends the click's user activation and races a fullscreen toggle, so the
  // controls that manage that themselves (Import's file picker, the Fullscreen button) opt out
  // with `data-skip-fullscreen-offer`; the offer then waits for the next click.
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const onFirstClick = (event: PointerEvent): void => {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('[data-skip-fullscreen-offer]')) return;
      node.removeEventListener('pointerdown', onFirstClick);
      offer();
    };
    node.addEventListener('pointerdown', onFirstClick);
    return () => node.removeEventListener('pointerdown', onFirstClick);
  }, [offer]);

  const continueGame = (): void => {
    actions.resetStack(entryRoute(useGameStore.getState()));
    // A tribute is worth saying out loud even after a short absence across the reset.
    if (lastOffline && (lastOffline.elapsedMs >= WELCOME_BACK_AFTER_MS || lastOffline.bossTributes.length))
      actions.openDialog({ name: 'welcome-back' });
  };
  const newChronicle = (): void => actions.openDialog({ name: card ? 'new-game-confirm' : 'new-game' });

  const exportCorrupt = (): void => {
    if (boot.corruptSaveText)
      downloadTextFile(`chronicle-recovered-${Date.now()}.json`, boot.corruptSaveText, 'application/json');
  };

  return (
    <div ref={root} className={styles.root} data-testid="screen-title">
      <Backdrop asset="bg.bg9" grade="rgba(70, 30, 110, 0.22)" parallax={14} framing={GATE_FRAMING} />
      <AmbientLayer preset="title" />
      <div className={styles.shade} aria-hidden="true" />

      <div className={styles.left}>
        <motion.div
          className={styles.brand}
          initial={{ opacity: 0, y: -24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <span className={styles.halo} aria-hidden="true" />
          <img
            src={imageUrl('logo.chronicle_idle_png')}
            alt={t('app.name')}
            className={styles.logo}
            draggable={false}
          />
          {/* The sweep is masked to the letters, so it lights the wordmark and never its box. */}
          <span
            className={styles.shine}
            style={{
              WebkitMaskImage: `url("${imageUrl('logo.chronicle_idle_png')}")`,
              maskImage: `url("${imageUrl('logo.chronicle_idle_png')}")`,
            }}
            aria-hidden="true"
          />
        </motion.div>

        <motion.div
          className={styles.slot}
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
        >
          {card ? (
            <ChronicleCard view={card} onContinue={continueGame} />
          ) : (
            <FirstChronicleCard>
              <Button variant="primary" size="lg" onClick={newChronicle} data-testid="btn-new-chronicle">
                {t('title.newChronicle')}
              </Button>
            </FirstChronicleCard>
          )}
        </motion.div>

        <motion.nav
          className={styles.actions}
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.5 } } }}
          aria-label={t('app.name')}
        >
          {card ? (
            <motion.div variants={item}>
              <Button
                variant="secondary"
                size="md"
                className={styles.action}
                icon={<Glyph glyph="glyph.quill" size={20} />}
                onClick={newChronicle}
                data-testid="btn-new-chronicle"
              >
                {t('title.newChronicle')}
              </Button>
            </motion.div>
          ) : null}
          <motion.div variants={item}>
            <Button
              variant="secondary"
              size="md"
              className={styles.action}
              icon={<Glyph glyph="glyph.chest" size={20} />}
              onClick={() => void importChronicle()}
              data-testid="btn-import"
              data-skip-fullscreen-offer="true"
            >
              {t('title.import')}
            </Button>
          </motion.div>
          <motion.div variants={item}>
            <Button
              variant="secondary"
              size="md"
              className={styles.action}
              icon={
                <img
                  className={styles.cog}
                  src={imageUrl('ui.stone_vine.btn_icon_settings')}
                  alt=""
                  draggable={false}
                />
              }
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
      </div>

      <motion.section
        className={styles.chronicle}
        initial={{ opacity: 0, x: 32 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.55, delay: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
        aria-label={t('changelog.title')}
      >
        <Panel
          kind="ember-tall"
          padding={20}
          className={styles.chroniclePanel}
          contentClassName={styles.chronicleBody}
          data-testid="title-changelog"
        >
          <header className={styles.chronicleHead}>
            <Glyph glyph="glyph.burning_scroll" size={26} className={styles.chronicleMark ?? ''} />
            <div className={styles.chronicleTitles}>
              <h2 className={`display ${styles.chronicleTitle}`}>{t('changelog.title')}</h2>
              <span className={styles.chronicleSubtitle}>{t('changelog.subtitle')}</span>
            </div>
          </header>
          <ChangelogView height="100%" testId="title-changelog-view" />
        </Panel>
      </motion.section>

      <motion.footer
        className={styles.foot}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.7 }}
      >
        <span className={styles.local}>
          <Glyph glyph="glyph.nature_shield" size={16} className={styles.localGlyph ?? ''} />
          {t('title.footer.local')}
        </span>
        <span className={styles.corner}>
          {supported ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void toggle()}
              data-testid="btn-fullscreen"
              data-skip-fullscreen-offer="true"
            >
              {fullscreen ? t('title.exitFullscreen') : t('title.fullscreen')}
            </Button>
          ) : null}
          <Button variant="ghost" size="sm" onClick={() => actions.openDialog({ name: 'credits' })}>
            {t('title.credits')}
          </Button>
          <span className={`num ${styles.version}`} data-testid="title-version">
            {t('app.version', { version: servicesReady() ? services().appVersion : '' })}
          </span>
        </span>
      </motion.footer>
    </div>
  );
}

const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.2, 0.8, 0.2, 1] } },
};
