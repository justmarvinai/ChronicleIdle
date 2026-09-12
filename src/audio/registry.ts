/**
 * Sound keys used by the game → manifest audio keys (docs/tech/UI_DESIGN.md §7). Adding a sound
 * means adding a row here; nothing else changes.
 */
import type { AmbienceKey, MusicKey, SfxKey } from '@assets/manifest.generated';

export interface SoundDef {
  asset: SfxKey;
  /** Linear gain multiplier applied after RMS compensation. */
  gain: number;
  /** Random playback-rate jitter (±). */
  jitter: number;
  /** Minimum ms between two plays of the same key (spam guard). */
  throttleMs: number;
}

const s = (asset: SfxKey, gain = 1, jitter = 0.04, throttleMs = 30): SoundDef => ({
  asset,
  gain,
  jitter,
  throttleMs,
});

export const SOUNDS = {
  'ui.hover': s('sfx.ui.hover', 0.35, 0.06, 40),
  'ui.confirm': s('sfx.ui.confirm', 0.7, 0.02),
  'ui.cancel': s('sfx.ui.cancel', 0.6, 0.03),
  'ui.tab': s('sfx.ui.tab', 0.5, 0.05),
  'ui.error': s('sfx.ui.error', 0.7, 0.01, 200),
  'ui.open': s('sfx.ui.open', 0.5, 0.05),
  'ui.close': s('sfx.ui.close', 0.5, 0.05),
  'reward.small': s('sfx.reward.small', 0.8, 0.02, 150),
  'reward.medium': s('sfx.reward.medium', 0.85, 0.01, 300),
  'reward.large': s('sfx.reward.large', 0.9, 0, 500),
  'stinger.levelup': s('sfx.stinger.levelup', 0.9, 0, 1000),
  'stinger.new_chronicle': s('sfx.stinger.new_chronicle', 0.9, 0, 1000),
  'chest.open': s('sfx.doors.chest_open', 0.8, 0.03, 300),
  'chest.close': s('sfx.doors.chest_close', 0.7, 0.03, 300),
  'lock.unlock': s('sfx.doors.lock_unlock', 0.7, 0.02, 300),
  'gate.open': s('sfx.doors.gate_open', 0.8, 0.02, 500),
  'gate.portcullis': s('sfx.doors.portcullis_gate', 0.8, 0.02, 500),
  'torch.light': s('sfx.torch.light_torch', 0.6, 0.05, 200),
  'forge.hammer': s('sfx.mining.mine', 0.8, 0.06, 80),
  'gear.equip': s('sfx.sword.sword_unsheath', 0.7, 0.04, 150),
} as const satisfies Record<string, SoundDef>;

export type SoundKey = keyof typeof SOUNDS;

/** Music states (docs/tech/ARCHITECTURE.md §7). */
export const MUSIC: Record<'title' | 'hub' | 'battle' | 'boss' | 'summon', MusicKey> = {
  title: 'music.outside_combat',
  hub: 'music.outside_combat',
  summon: 'music.outside_combat',
  battle: 'music.combat_campaign_depths_arena',
  boss: 'music.combat_campaign_depths_arena',
};

export interface AmbienceBed {
  asset: AmbienceKey;
  gain: number;
}

/** Ambience beds per scene (docs/tech/ASSETS.md §2). */
export const AMBIENCE: Record<'title' | 'hub' | 'interior' | 'none', AmbienceBed[]> = {
  none: [],
  title: [
    { asset: 'ambience.generated.void_drone', gain: 0.7 },
    { asset: 'ambience.cave.alt_1', gain: 0.35 },
  ],
  hub: [
    { asset: 'ambience.town.alt_1', gain: 0.55 },
    { asset: 'ambience.night.alt_1', gain: 0.4 },
  ],
  interior: [{ asset: 'ambience.interior_night.clear', gain: 0.6 }],
};

/** Target RMS (dBFS) for SFX so packs with different mastering sit at one level. */
export const SFX_TARGET_RMS_DB = -18;
