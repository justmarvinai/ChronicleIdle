/**
 * One-shot sound bus (docs/tech/ARCHITECTURE.md §7): lazy Howl per variant, round-robin variants,
 * RMS compensation, pitch jitter, per-key throttling and a voice limiter.
 */
import { Howl } from 'howler';
import { audioVariants, isManifestLoaded } from '@assets/manifest';
import { busGain } from './mixer';
import { SFX_TARGET_RMS_DB, SOUNDS, type SoundKey } from './registry';

const MAX_VOICES = 10;

interface Variant {
  howl: Howl;
  gain: number;
}

const cache = new Map<SoundKey, Variant[]>();
const nextVariant = new Map<SoundKey, number>();
const lastPlayed = new Map<SoundKey, number>();
let activeVoices = 0;
/** Deterministic-enough jitter for UI feel; audio is presentation, not simulation. */
let jitterSeed = 12345;
const jitterRandom = (): number => {
  jitterSeed = (jitterSeed * 1664525 + 1013904223) >>> 0;
  return jitterSeed / 4294967296;
};

function variantsFor(key: SoundKey): Variant[] {
  const cached = cache.get(key);
  if (cached) return cached;
  const def = SOUNDS[key];
  const { variants } = audioVariants(def.asset);
  const built = variants.map((v) => {
    const compensation = v.rmsDb === 0 ? 1 : Math.min(4, Math.pow(10, (SFX_TARGET_RMS_DB - v.rmsDb) / 20));
    const howl = new Howl({ src: [v.url], preload: true, html5: false });
    howl.on('end', () => {
      activeVoices = Math.max(0, activeVoices - 1);
    });
    return { howl, gain: Math.min(1, def.gain * compensation) };
  });
  cache.set(key, built);
  return built;
}

export interface PlayOptions {
  /** 0..1 extra multiplier. */
  volume?: number;
  /** Override the jitter with a fixed rate. */
  rate?: number;
}

export function playSfx(key: SoundKey, options: PlayOptions = {}): void {
  if (!isManifestLoaded()) return;
  const def = SOUNDS[key];
  const now = performance.now();
  const last = lastPlayed.get(key) ?? -Infinity;
  if (now - last < def.throttleMs) return;
  if (activeVoices >= MAX_VOICES) return;
  const bus = busGain('sfx');
  if (bus <= 0) return;
  let variants: Variant[];
  try {
    variants = variantsFor(key);
  } catch (error) {
    console.warn(`[sfx] cannot play ${key}`, error);
    return;
  }
  if (variants.length === 0) return;
  const index = (nextVariant.get(key) ?? 0) % variants.length;
  nextVariant.set(key, index + 1);
  const variant = variants[index] as Variant;
  const rate = options.rate ?? 1 + (jitterRandom() * 2 - 1) * def.jitter;
  const id = variant.howl.play();
  variant.howl.rate(rate, id);
  variant.howl.volume(variant.gain * bus * (options.volume ?? 1), id);
  lastPlayed.set(key, now);
  activeVoices++;
}

/** Warms the cache for the most common UI sounds so the first hover is not late. */
export function preloadSfx(keys: readonly SoundKey[]): void {
  if (!isManifestLoaded()) return;
  for (const key of keys) {
    try {
      variantsFor(key);
    } catch {
      /* missing asset: reported on play */
    }
  }
}
