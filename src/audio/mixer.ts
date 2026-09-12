/** Global volume buses. Values are 0..1; settings are applied by `initAudio`. */
import { Howler } from 'howler';

export interface MixerLevels {
  master: number;
  music: number;
  ambience: number;
  sfx: number;
  muted: boolean;
}

const levels: MixerLevels = { master: 1, music: 0.7, ambience: 0.6, sfx: 0.8, muted: false };
const listeners = new Set<(levels: MixerLevels) => void>();

export function setMixer(patch: Partial<MixerLevels>): void {
  Object.assign(levels, patch);
  Howler.volume(levels.muted ? 0 : levels.master);
  for (const listener of listeners) listener(levels);
}

export function getMixer(): MixerLevels {
  return levels;
}

export function onMixerChange(listener: (levels: MixerLevels) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Effective bus gain (master is applied globally by Howler). */
export function busGain(bus: 'music' | 'ambience' | 'sfx'): number {
  return levels.muted ? 0 : levels[bus];
}
