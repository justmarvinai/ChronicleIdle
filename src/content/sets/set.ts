/**
 * The helper every gear set is written with (docs/tech/CONTENT_AUTHORING.md §5). A set is a
 * passive a champion wears, so it is authored in the same vocabulary champions' own passives use
 * (`BATTLE.md` §6) and the battle engine needs to learn nothing new.
 */
import type { EmblemKey, GearArtKey, SpellKey } from '@assets/manifest.generated';
import type { GearSlot, PassiveDef, PassiveEffect, PassiveTrigger } from '@content/champions/types';
import type { GearSetDef, SetSize } from './types';

export interface Grant {
  trigger?: PassiveTrigger;
  effects: PassiveEffect[];
}

export interface SetInput {
  /** The id becomes `gear_set.<slug>`. */
  slug: string;
  pieces: SetSize;
  /**
   * The painting the set's passives carry, as every passive does (`BATTLE.md` §6). It is not how
   * the set is shown: pieces wear `art` and the set is named by its `emblem`.
   */
  icon: SpellKey;
  /** The set's identifier, from `gear_sets/!gear_set_identifier_icons` (`ASSETS.md` §2). */
  emblem: EmblemKey;
  /** One painting per slot, from `gear_sets/<slug>/`. */
  art: Readonly<Record<GearSlot, GearArtKey>>;
  /** One entry per passive the complete group grants; the trigger defaults to `static`. */
  grants: Grant[];
  /** Settlements whose drops favour the set; each one must list it in its `setPool`. */
  homes: readonly number[];
}

export function set(input: SetInput): GearSetDef {
  const id = `gear_set.${input.slug}`;
  const passives: PassiveDef[] = input.grants.map((grant, index) => ({
    id: index === 0 ? `${id}.bonus` : `${id}.bonus_${index + 1}`,
    name: `${id}.name`,
    description: `${id}.description`,
    icon: input.icon,
    trigger: grant.trigger ?? 'static',
    effects: grant.effects,
  }));
  return {
    id,
    name: `${id}.name`,
    description: `${id}.description`,
    emblem: input.emblem,
    art: input.art,
    pieces: input.pieces,
    passives,
    homes: input.homes,
    version: 1,
  };
}
