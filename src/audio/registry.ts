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
  // The Mine (MINE.md): a pick into the seam as the store is taken, the rock giving way a level down.
  'mine.strike': s('sfx.mining.mine', 0.75, 0.08, 90),
  'mine.deepen': s('sfx.spells.rock_wall', 0.8, 0.02, 600),
  // An instant clear (CAMPAIGN.md §10): a page of the chronicle turned, once per run the ledger counts.
  'instant.write': s('sfx.summon.flip', 0.6, 0.08, 45),
  // The Unwritten (UNWRITTEN.md §21): a page turned between passages, a quill writing an inscription,
  // the chord an ink illuminates with, a blot landing on the page.
  'unwritten.page': s('sfx.unwritten.page', 0.55, 0.06, 150),
  'unwritten.quill': s('sfx.unwritten.quill', 0.7, 0.05, 120),
  'unwritten.illuminate': s('sfx.unwritten.illuminate', 0.85, 0, 800),
  'unwritten.blot': s('sfx.unwritten.blot', 0.75, 0.04, 300),
  // The summoning ritual (SUMMONING.md §5): the charge, a tell per rarity climbed (pitched by the
  // Portal), the held breath before gold, the wind-up, the shatter, and one reveal per tier; then
  // the cards: a flip for each of ten, a ping per star, a stamp under the rarest.
  'summon.charge': s('sfx.summon.charge', 0.7, 0, 200),
  'summon.crack': s('sfx.summon.crack', 0.8, 0.03, 80),
  'summon.tell': s('sfx.summon.tell', 0.75, 0, 60),
  'summon.stall': s('sfx.summon.stall', 0.95, 0, 300),
  'summon.windup': s('sfx.summon.windup', 0.7, 0, 200),
  'summon.shatter': s('sfx.summon.shatter', 0.75, 0.03, 200),
  'summon.flip': s('sfx.summon.flip', 0.55, 0.06, 40),
  'summon.star': s('sfx.summon.star', 0.5, 0, 30),
  'summon.stamp': s('sfx.summon.stamp', 0.8, 0.02, 200),
  'summon.reveal.common': s('sfx.summon.reveal_common', 0.8, 0.02, 120),
  'summon.reveal.rare': s('sfx.summon.reveal_rare', 0.85, 0.02, 120),
  'summon.reveal.epic': s('sfx.summon.reveal_epic', 0.85, 0, 200),
  'summon.reveal.legendary': s('sfx.summon.reveal_legendary', 0.9, 0, 400),
  'summon.reveal.mythic': s('sfx.summon.reveal_mythic', 0.95, 0, 600),
  'gear.equip': s('sfx.sword.sword_unsheath', 0.7, 0.04, 150),
  // Battle (docs/tech/UI_DESIGN.md §7): owner attack/spell packs plus generated stingers.
  'battle.start': s('sfx.doors.portcullis_gate', 0.8, 0.02, 800),
  'battle.attack.melee': s('sfx.sword.sword_attack', 0.75, 0.06, 40),
  'battle.attack.ranged': s('sfx.bow.bow_attack', 0.7, 0.06, 40),
  'battle.hit.light': s('sfx.sword.sword_impact_hit', 0.75, 0.07, 30),
  'battle.hit.heavy': s('sfx.torch.torch_impact', 0.85, 0.05, 30),
  'battle.hit.crit': s('sfx.spells.spell_impact', 0.95, 0.04, 30),
  'battle.block': s('sfx.sword.sword_blocked', 0.7, 0.05, 30),
  'battle.cast.valor': s('sfx.spells.fireball', 0.75, 0.05, 40),
  'battle.cast.faith': s('sfx.spells.ice_throw', 0.75, 0.05, 40),
  'battle.cast.justice': s('sfx.spells.firebuff', 0.75, 0.05, 40),
  'battle.cast.eclipse': s('sfx.spells.ice_freeze', 0.75, 0.08, 40),
  'battle.heal': s('sfx.spells.waterspray', 0.65, 0.05, 60),
  'battle.buff': s('sfx.spells.firebuff', 0.55, 0.06, 60),
  'battle.debuff': s('sfx.spells.ice_freeze', 0.55, 0.06, 60),
  'battle.death': s('sfx.torch.torch_impact', 0.9, 0.08, 120),
  'battle.revive': s('sfx.spells.firebuff', 0.85, 0.02, 300),
  'battle.wave': s('sfx.doors.gate_open', 0.75, 0.02, 500),
  'battle.ultimate': s('sfx.spells.rock_meteor_swarm', 0.9, 0.02, 300),
  // A weekly boss changing gear (BOSSES.md §3): the gate behind it closing a notch.
  'battle.boss.phase': s('sfx.doors.gate_close', 0.9, 0.02, 600),
  'battle.victory': s('sfx.stinger.victory', 0.95, 0, 1000),
  'battle.defeat': s('sfx.stinger.defeat', 0.9, 0, 1000),
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
export const AMBIENCE: Record<'title' | 'hub' | 'interior' | 'unwritten' | 'none', AmbienceBed[]> = {
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
  // The Unwritten (UNWRITTEN.md §21): the void's low drone under a cave's hollow air.
  unwritten: [
    { asset: 'ambience.generated.void_drone', gain: 0.55 },
    { asset: 'ambience.cave.alt_1', gain: 0.45 },
  ],
};

/** Target RMS (dBFS) for SFX so packs with different mastering sit at one level. */
export const SFX_TARGET_RMS_DB = -18;
