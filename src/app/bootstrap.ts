/**
 * Boot sequence (docs/tech/ARCHITECTURE.md §2). Reports progress for the loading screen and never
 * throws: failures land in `boot.error` and the Title screen explains them.
 */
import { groupKeys, loadManifest, preloadImages } from '@assets/manifest';
import type { AssetKey, UiKey } from '@assets/manifest.generated';
import { loadDecoImages } from '@ui/hooks/useDecoTint';
import { KIT } from '@ui/styles/kit';
import { initAudio } from '@audio/index';
import { bootGame } from '@state/boot';
import { startPersistence } from '@state/persistence';
import { registerServices } from '@state/services';
import { useGameStore } from '@state/store';
import { systemClock } from '@platform/clock';
import { registerPwa } from '@platform/pwa';
import { createStorage } from '@platform/storage';
import { prefersReducedMotion } from '@platform/window';
import { installInputGuards } from './inputGuards';

export type ProgressReporter = (fraction: number, label?: string) => void;

const ENERGY_TICK_MS = 10_000;
const PLAYTIME_TICK_MS = 60_000;

let booted: Promise<void> | null = null;

export function bootstrap(report: ProgressReporter): Promise<void> {
  booted ??= run(report);
  return booted;
}

async function run(report: ProgressReporter): Promise<void> {
  const store = useGameStore;
  const actions = store.getState().actions;
  installInputGuards();

  await loadManifest();
  report(0.15);

  const storage = await createStorage();
  await bootGame({ store, storage, clock: systemClock });
  report(0.3);

  const persistence = startPersistence({ store, storage, clock: systemClock });
  const pwa = registerPwa({
    onNeedRefresh: () => actions.setUpdateAvailable(true),
    onOfflineReady: () => {
      actions.setOfflineReady(true);
      actions.toast('info', 'app.offlineReady');
    },
  });
  registerServices({ storage, persistence, appVersion: __APP_VERSION__, applyUpdate: pwa.applyUpdate });
  initAudio(store);
  applyReducedMotion(store);

  // The loading screen waits only for what the title paints (logo, backdrop, its button kit,
  // toast frame) plus the deco sheet; everything the hub and dialogs need warms in the background
  // and is precached by the service worker for the next visit.
  const critical: AssetKey[] = [
    'logo.chronicle_idle_png',
    'bg.bg9',
    'ui.dark_ember.btn_ember_wide',
    'ui.dark_ember.btn_ember_wide_on',
    'ui.stone_vine.btn_stone_wide',
    'ui.dark_ember.frame_sm_thin',
    'ui.dark_ember.bg_tile_sm',
  ];
  await Promise.all([
    preloadImages(critical, (done, total) => report(0.3 + 0.7 * (done / total))),
    loadDecoImages(),
  ]);
  const warm: AssetKey[] = [
    ...(Object.keys(KIT) as UiKey[]).filter((key) => !critical.includes(key)),
    ...groupKeys('ui').filter((key) => /\.(icon_|btn_icon_|divider_vine|frame_round_sm)/.test(key)),
    'bg.bg8',
  ];
  void preloadImages(warm);
  report(1);

  // Save whenever the tab loses focus or closes; keep energy and playtime moving while it is open.
  const flush = (): void => {
    persistence.flushSync();
    void persistence.flush();
  };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) flush();
    else actions.tickEnergy();
  });
  window.addEventListener('pagehide', flush);
  setInterval(() => actions.tickEnergy(), ENERGY_TICK_MS);
  setInterval(() => {
    if (!document.hidden && store.getState().save) actions.touchStat('playtime_ms', PLAYTIME_TICK_MS);
  }, PLAYTIME_TICK_MS);

  if (import.meta.env.DEV) {
    // Chronicle Debug (grants for testing) — development builds only, Ctrl+Shift+D.
    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        actions.openDialog({ name: 'debug' });
      }
    });
  }
  // `?screen=devkit` opens the component gallery (docs/tech/UI_DESIGN.md §9) and `?screen=perf`
  // the battle perf bench (CLAUDE.md §5.6) in every build; neither is linked from the game.
  const screen = new URLSearchParams(window.location.search).get('screen');
  if (screen === 'devkit' || screen === 'perf') actions.resetStack({ name: screen });
}

/** Menu motion follows the setting, or the OS preference until a chronicle exists. */
function applyReducedMotion(store: typeof useGameStore): void {
  const apply = (): void => {
    const setting = store.getState().save?.settings.reducedMotion;
    const reduced = setting ?? prefersReducedMotion();
    document.documentElement.dataset['reducedMotion'] = reduced ? 'true' : 'false';
  };
  apply();
  store.subscribe((s) => s.save?.settings.reducedMotion, apply);
}
