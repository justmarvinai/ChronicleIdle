/**
 * Champion art helpers: placeholders borrow the lizard avatar and model with a per-champion tint
 * (CLAUDE.md §2.7, docs/tech/ASSETS.md §3); finished models render untinted.
 */
import { avatarUrl } from '@assets/manifest';
import type { ChampionDef, ChampionId } from '@content/champions/types';
import { content } from '@content/registry';

export interface ChampionArtView {
  url: string;
  tint: string | null;
  placeholder: boolean;
}

export type AvatarSize = 128 | 256 | 512 | 1024;

export function championAvatar(def: ChampionDef, size: AvatarSize): ChampionArtView {
  return { url: avatarUrl(def.art.avatar, size), tint: def.art.tint, placeholder: def.art.placeholder };
}

/** The profile avatar: the chosen champion, or the Chronicler's own likeness before one is chosen. */
export function profileAvatar(defId: ChampionId | null, size: AvatarSize): ChampionArtView {
  const def = defId ? content.championById(defId) : undefined;
  if (!def) return { url: avatarUrl('avatar.tutorial_npc', size), tint: null, placeholder: false };
  return championAvatar(def, size);
}
