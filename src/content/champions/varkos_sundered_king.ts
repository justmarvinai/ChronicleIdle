import { defineChampion, extraTurn, hit, leech, status, strip, up, when } from './dsl';

/** Mythic Eclipse all-rounder: strips, sovereign buffs, a kingdom-ending blow (CHAMPIONS.md §4.6). */
export default defineChampion({
  id: 'champ.varkos_sundered_king',
  rarity: 'mythic',
  element: 'eclipse',
  role: 'attack',
  stats: [19_800, 1_880, 1_240, 112, 20, 75, 40, 40],
  art: { placeholderTint: '#4b2a6e' },
  obtain: ['summon'],
  abilities: [
    {
      slot: 'a1',
      key: 'sundering_blow',
      icon: 'spell.weapon_obsidian_mace',
      effects: [hit(3.6), status('weaken', 2, { chance: 40, value: 25 })],
      upgrades: [up.dmg(5), up.chance(10)],
    },
    {
      slot: 'a2',
      key: 'crown_of_ash',
      icon: 'spell.crest_gilded_crown',
      cooldown: 4,
      effects: [hit(3.2, 'all_enemies'), strip('all_enemies', 1), leech(15)],
      upgrades: [up.dmg(5), up.dmg(5), up.cd()],
      ai: { priority: 3, when: { enemiesAlive: { gte: 2 } } },
    },
    {
      slot: 'a3',
      key: 'sovereign_will',
      icon: 'spell.hero_demon_lord',
      cooldown: 5,
      effects: [
        status('atk_up', 2, { target: 'all_allies', value: 30 }),
        status('def_up', 2, { target: 'all_allies', value: 30 }),
        status('block_debuffs', 2, { target: 'all_allies' }),
      ],
      upgrades: [up.duration(), up.cd(), up.cd()],
      ai: { priority: 4, when: { waveStart: true } },
    },
    {
      slot: 'a4',
      key: 'the_kingdom_falls',
      icon: 'spell.earth_obsidian_rift',
      cooldown: 6,
      effects: [
        hit(8.0, 'single_enemy', { defIgnore: 0.5 }),
        when({ killedThisAction: true }, [hit(2.0, 'all_enemies'), extraTurn()]),
      ],
      upgrades: [up.dmg(5), up.dmg(10), up.cd()],
      ai: { priority: 5 },
    },
  ],
  passive: {
    key: 'sundered',
    icon: 'spell.earth_fractured_block',
    trigger: 'onDeath',
    oncePerBattle: true,
    effects: [
      { kind: 'survive_lethal', hpPercent: 50, oncePerBattle: true, shield: 30 },
      { kind: 'damage_reduction', value: 0.15, if: { attackerElement: 'eclipse' } },
    ],
  },
  aura: {
    key: 'sovereign_aura',
    icon: 'spell.hero_voidguard',
    effects: [
      { kind: 'stat_mod', stat: 'atk', percent: 18 },
      { kind: 'stat_mod', stat: 'hp', percent: 10 },
    ],
  },
});
