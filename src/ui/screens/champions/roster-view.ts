/**
 * Shared roster presentation helpers for the Champions screens: display entries from the store,
 * labels for filters and the placeholder art copy.
 */
import type { ChampionDef, Element, Rarity, Role } from '@content/champions/types';
import { content } from '@content/registry';
import { rosterEntries, type RosterEntry } from '@engine/champions/query';
import { wornBy } from '@engine/gear/equip';
import type { Inventory } from '@engine/gear/instance';
import type { Roster } from '@engine/champions/instance';
import { t, translate, type I18nKey } from '@i18n/index';

const NO_INVENTORY: Inventory = {};

/** Display entries for the roster; with an armoury, every power number includes what is worn. */
export function entriesOf(roster: Roster, inventory: Inventory = NO_INVENTORY): RosterEntry[] {
  return rosterEntries(roster, content.championById, (def) => translate(def.name), {
    worn: (instance) => wornBy(instance, inventory),
    setById: content.gearSetById,
  });
}

export const rarityLabel = (rarity: Rarity): string => t(`rarity.${rarity}` as I18nKey);
export const elementLabel = (element: Element): string => t(`element.${element}` as I18nKey);
export const roleLabel = (role: Role): string => t(`role.${role}` as I18nKey);

export function championName(def: ChampionDef): string {
  return translate(def.name);
}
