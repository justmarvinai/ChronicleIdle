/** Ambience director: a set of looping beds per scene, cross-faded on change. */
import { Howl } from 'howler';
import { audioVariants, isManifestLoaded } from '@assets/manifest';
import { audioArmed, onAudioArmed } from './gate';
import { busGain, onMixerChange } from './mixer';
import { AMBIENCE, type AmbienceBed } from './registry';

export type AmbienceScene = keyof typeof AMBIENCE;

const FADE_MS = 1500;
interface Playing {
  bed: AmbienceBed;
  howl: Howl;
}
let scene: AmbienceScene = 'none';
let playing: Playing[] = [];
/** Scene requested before the first user gesture; started as soon as audio is armed. */
let pending: AmbienceScene | null = null;

onAudioArmed(() => {
  if (pending) {
    const next = pending;
    pending = null;
    setAmbience(next);
  }
});

onMixerChange(() => {
  for (const p of playing) p.howl.volume(busGain('ambience') * p.bed.gain);
});

export function setAmbience(next: AmbienceScene): void {
  if (!isManifestLoaded()) return;
  if (!audioArmed()) {
    pending = next;
    return;
  }
  if (next === scene) return;
  scene = next;
  const beds = AMBIENCE[next];
  const keep: Playing[] = [];
  for (const p of playing) {
    const still = beds.find((b) => b.asset === p.bed.asset);
    if (still) {
      p.bed = still;
      p.howl.fade(p.howl.volume(), busGain('ambience') * still.gain, FADE_MS);
      keep.push(p);
    } else {
      p.howl.fade(p.howl.volume(), 0, FADE_MS);
      const old = p.howl;
      setTimeout(() => old.unload(), FADE_MS + 100);
    }
  }
  for (const bed of beds) {
    if (keep.some((p) => p.bed.asset === bed.asset)) continue;
    const { variants } = audioVariants(bed.asset);
    const url = variants[0]?.url;
    if (!url) continue;
    const howl = new Howl({ src: [url], loop: true, html5: true, preload: true });
    const target = busGain('ambience') * bed.gain;
    howl.volume(0);
    howl.once('play', () => howl.fade(0, target, FADE_MS));
    howl.play();
    keep.push({ bed, howl });
  }
  playing = keep;
}

export function currentAmbience(): AmbienceScene {
  return pending ?? scene;
}
