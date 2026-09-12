/** Music director: one state at a time, cross-faded (docs/tech/ARCHITECTURE.md §7). */
import { Howl } from 'howler';
import { audioVariants, isManifestLoaded } from '@assets/manifest';
import { audioArmed, onAudioArmed } from './gate';
import { busGain, onMixerChange } from './mixer';
import { MUSIC } from './registry';

export type MusicState = keyof typeof MUSIC;

const FADE_MS = 1200;
let current: { state: MusicState; howl: Howl } | null = null;
let ducked = 1;
/** State requested before the first user gesture; started as soon as audio is armed. */
let pending: MusicState | null = null;

onAudioArmed(() => {
  if (pending) {
    const state = pending;
    pending = null;
    setMusic(state);
  }
});

onMixerChange(() => {
  if (current) current.howl.volume(busGain('music') * ducked);
});

function howlFor(state: MusicState): Howl {
  const { variants } = audioVariants(MUSIC[state]);
  const url = variants[0]?.url ?? '';
  return new Howl({ src: [url], loop: true, html5: true, preload: true });
}

export function setMusic(state: MusicState): void {
  if (!isManifestLoaded()) return;
  if (!audioArmed()) {
    pending = state;
    return;
  }
  if (current?.state === state) return;
  // Same track for a different state (title/hub share one): just relabel.
  if (current && MUSIC[current.state] === MUSIC[state]) {
    current.state = state;
    return;
  }
  const previous = current;
  const target = busGain('music') * ducked;
  const howl = howlFor(state);
  current = { state, howl };
  howl.once('play', () => howl.fade(0, target, FADE_MS));
  howl.volume(0);
  howl.play();
  if (previous) {
    previous.howl.fade(previous.howl.volume(), 0, FADE_MS);
    setTimeout(() => previous.howl.unload(), FADE_MS + 100);
  }
}

export function stopMusic(): void {
  pending = null;
  if (!current) return;
  const previous = current;
  current = null;
  previous.howl.fade(previous.howl.volume(), 0, FADE_MS);
  setTimeout(() => previous.howl.unload(), FADE_MS + 100);
}

/** Temporarily lowers music (summon burst, stingers). `factor` 0..1. */
export function duckMusic(factor: number, ms: number): void {
  ducked = factor;
  current?.howl.fade(current.howl.volume(), busGain('music') * factor, 200);
  setTimeout(() => {
    ducked = 1;
    current?.howl.fade(current.howl.volume(), busGain('music'), 600);
  }, ms);
}

export function currentMusic(): MusicState | null {
  return current?.state ?? pending;
}
