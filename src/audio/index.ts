/** Wires the audio buses to the settings in the store. */
import type { GameStoreApi } from '@state/store';
import { installAudioGate } from './gate';
import { setMixer } from './mixer';
import { preloadSfx } from './sfx';

export function initAudio(store: GameStoreApi): () => void {
  const apply = (): void => {
    const settings = store.getState().save?.settings;
    if (!settings) return;
    setMixer({
      master: settings.masterVolume,
      music: settings.musicVolume,
      ambience: settings.ambienceVolume,
      sfx: settings.sfxVolume,
      muted: settings.muted,
    });
  };
  apply();
  const unsubscribe = store.subscribe((state) => state.save?.settings, apply);
  const uninstallGate = installAudioGate();
  preloadSfx(['ui.hover', 'ui.confirm', 'ui.cancel', 'ui.tab', 'ui.open', 'ui.close']);
  return () => {
    unsubscribe();
    uninstallGate();
  };
}

export { playSfx } from './sfx';
export { setMusic, duckMusic, stopMusic } from './music';
export { setAmbience } from './ambience';
export { armAudio, audioArmed } from './gate';
export type { SoundKey } from './registry';
