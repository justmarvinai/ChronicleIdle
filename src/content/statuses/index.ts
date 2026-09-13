/**
 * Status effect presentation (docs/design/BATTLE.md §5): kind, icon glyph and name key per id.
 * The numbers live in `balance/battle.ts`; the engine never reads this table.
 */
import type { GlyphKey } from '@assets/manifest.generated';
import { BUFF_IDS, STATUS_IDS, type StatusId } from '@content/champions/types';

export interface StatusMeta {
  id: StatusId;
  kind: 'buff' | 'debuff';
  glyph: GlyphKey;
  /** i18n keys. */
  name: string;
  description: string;
}

const GLYPHS: Readonly<Record<StatusId, GlyphKey>> = {
  atk_up: 'glyph.sword_clash',
  def_up: 'glyph.shield_block',
  spd_up: 'glyph.rockets',
  crit_rate_up: 'glyph.shooting_stars',
  res_up: 'glyph.holy_cross',
  shield: 'glyph.nature_shield',
  regen: 'glyph.health_potion',
  block_debuffs: 'glyph.holy_totem',
  counter: 'glyph.crossed_swords',
  ally_protection: 'glyph.ribcage_armor',
  revive_on_death: 'glyph.phoenix',
  veil: 'glyph.cloaked_figure',
  atk_down: 'glyph.sword_clash',
  def_down: 'glyph.shield_block',
  spd_down: 'glyph.rockets',
  weaken: 'glyph.broken_shackle',
  poison: 'glyph.thorny_branch',
  burn: 'glyph.magic_flame',
  bleed: 'glyph.spiked_cleaver',
  stun: 'glyph.stomp_impact',
  freeze: 'glyph.hourglass',
  sleep: 'glyph.owl',
  provoke: 'glyph.fist_punch',
  heal_reduction: 'glyph.cursed_eye',
  block_buffs: 'glyph.evil_eye',
  fear: 'glyph.flaming_skull',
};

export const STATUSES: readonly StatusMeta[] = STATUS_IDS.map((id) => ({
  id,
  kind: (BUFF_IDS as readonly string[]).includes(id) ? 'buff' : 'debuff',
  glyph: GLYPHS[id],
  name: `status.${id}.name`,
  description: `status.${id}.description`,
}));

export const STATUS_BY_ID: Readonly<Record<StatusId, StatusMeta>> = Object.fromEntries(
  STATUSES.map((s) => [s.id, s]),
) as Record<StatusId, StatusMeta>;
