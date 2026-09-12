import { defineChampion, hit, up } from './dsl';

/** Rare Valor attacker starter: quick double cuts and a random flurry (CHAMPIONS.md §4.3). */
export default defineChampion({
  id: 'champ.reva_ashblade',
  rarity: 'rare',
  element: 'valor',
  role: 'attack',
  stats: [12_400, 1_330, 820, 102, 15, 60, 20, 0],
  art: { placeholderTint: '#e0602a' },
  obtain: ['starter', 'summon'],
  abilities: [
    {
      slot: 'a1',
      key: 'quick_cut',
      icon: 'spell.fire_slash',
      effects: [hit(3.4, 'single_enemy', { repeatChance: 20 })],
      upgrades: [up.dmg(5), up.dmg(5)],
    },
    {
      slot: 'a2',
      key: 'ash_flurry',
      icon: 'spell.fire_twin_flames',
      cooldown: 4,
      effects: [hit(1.9, { random_enemies: 3 })],
      upgrades: [up.dmg(5), up.dmg(5), up.dmg(10), up.cd()],
      ai: { priority: 3 },
    },
  ],
  passive: {
    key: 'kindled',
    icon: 'spell.fire_ember_eye',
    trigger: 'static',
    effects: [{ kind: 'damage_bonus_per', per: 'target_debuff', value: 0.05, max: 0.15 }],
  },
});
