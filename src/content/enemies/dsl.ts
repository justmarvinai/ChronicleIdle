/**
 * `defineEnemy`: the enemy counterpart of `defineChampion`. Ids and i18n keys derive from the
 * enemy id (`enemy.remnant_raider` → `ab.remnant_raider.<key>`), abilities use the champion
 * effect builders, and the lizard placeholder is tinted per faction until faction models exist.
 */
import type { ModelKey, SpellKey } from '@assets/manifest.generated';
import type {
  AbilityAi,
  AbilityDef,
  AbilitySlot,
  Effect,
  PassiveDef,
  PassiveEffect,
  PassiveTrigger,
} from '@content/champions/types';
import type { EnemyBossConfig, EnemyDef } from './types';

interface EnemyAbilityInput {
  slot: AbilitySlot;
  key: string;
  icon: SpellKey;
  cooldown?: number;
  startsOnCooldown?: boolean;
  effects: Effect[];
  ai?: AbilityAi;
}

interface EnemyPassiveInput {
  key: string;
  icon: SpellKey;
  trigger: PassiveTrigger;
  effects: PassiveEffect[];
  oncePerBattle?: boolean;
}

export interface EnemyInput {
  id: string;
  archetype: EnemyDef['archetype'];
  element: EnemyDef['element'];
  role: EnemyDef['role'];
  /** HP / ATK / DEF / SPD / C.RATE / C.DMG / RES / ACC at Intro, stage index 0. */
  stats: [number, number, number, number, number, number, number, number];
  art: { tint: string; scale?: number; model?: ModelKey; facing?: 'left' | 'right' };
  abilities: EnemyAbilityInput[];
  passives?: EnemyPassiveInput[];
  boss?: EnemyBossConfig;
  version?: number;
}

export function defineEnemy(input: EnemyInput): EnemyDef {
  const slug = input.id.replace(/^enemy\./, '');
  const [hp, atk, def, spd, critRate, critDmg, res, acc] = input.stats;
  const abilities: AbilityDef[] = input.abilities.map((a) => ({
    slot: a.slot,
    id: `ab.${slug}.${a.key}`,
    name: `ab.${slug}.${a.key}.name`,
    description: `ab.${slug}.${a.key}.description`,
    icon: a.icon,
    cooldown: a.cooldown ?? 0,
    ...(a.startsOnCooldown ? { startsOnCooldown: true } : {}),
    effects: a.effects,
    upgrades: [],
    // Campaign enemies prefer their strongest ready ability (CAMPAIGN.md §5, BATTLE.md §7).
    ai: a.ai ?? { priority: a.slot === 'a1' ? 1 : a.slot === 'a2' ? 2 : 3 },
  }));
  const passives: PassiveDef[] = (input.passives ?? []).map((p) => ({
    id: `ab.${slug}.${p.key}`,
    name: `ab.${slug}.${p.key}.name`,
    description: `ab.${slug}.${p.key}.description`,
    icon: p.icon,
    trigger: p.trigger,
    effects: p.effects,
    ...(p.oncePerBattle ? { oncePerBattle: true } : {}),
  }));
  return {
    id: input.id,
    name: `${input.id}.name`,
    archetype: input.archetype,
    element: input.element,
    role: input.role,
    stats: { hp, atk, def, spd, critRate, critDmg, res, acc },
    art: {
      model: input.art.model ?? 'model.teritorial_lizard',
      tint: input.art.tint,
      facing: input.art.facing ?? 'left',
      scale: input.art.scale ?? 1,
    },
    abilities,
    passives,
    ...(input.boss ? { boss: input.boss } : {}),
    version: input.version ?? 1,
  };
}
