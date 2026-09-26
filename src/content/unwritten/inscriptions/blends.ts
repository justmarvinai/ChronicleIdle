/**
 * Blended inks (docs/design/UNWRITTEN.md §7.6): an inscription written in two inks at once, offered
 * to a company that holds both once the Scriptorium's Blended Inks is written. Always Epic, and
 * counted toward both inks' illumination.
 */
import {
  damage,
  inflict,
  inscription,
  mend,
  onDeath,
  onHit,
  onHitTaken,
  onKill,
  onWave,
  statik,
} from '@content/unwritten/dsl';
import type { InscriptionDef } from '@content/unwritten/types';

export const BLENDS: readonly InscriptionDef[] = [
  inscription({
    slug: 'crusaders_zeal',
    ink: ['gold', 'crimson'],
    rarity: 'epic',
    icon: 'spell.fire_cross_blast',
    values: { a: [20, 25, 30] },
    grant: ({ a }) => ({ passives: [statik(damage(a, { selfHas: 'shield' }))] }),
  }),
  inscription({
    slug: 'sanctified_ground',
    ink: ['gold', 'azure'],
    rarity: 'epic',
    icon: 'spell.fx_emerald_blaze',
    values: { a: [10, 14, 18] },
    fixed: { t: 2 },
    grant: ({ a, t }) => ({
      passives: [onWave(inflict('shield', t, 'self', 100, a), inflict('regen', t, 'self'))],
    }),
  }),
  inscription({
    slug: 'iron_maiden',
    ink: ['gold', 'violet'],
    rarity: 'epic',
    icon: 'spell.weapon_chain_hook',
    values: { a: [40, 55, 70] },
    fixed: { t: 2 },
    grant: ({ a, t }) => ({ passives: [onHitTaken(inflict('poison', t, 'attacker', a))] }),
  }),
  inscription({
    slug: 'battle_hymn',
    ink: ['crimson', 'azure'],
    rarity: 'epic',
    icon: 'spell.fire_emerald_comet',
    values: { a: [6, 8, 10] },
    grant: ({ a }) => ({ passives: [onKill(mend(a, 'all_allies'))] }),
  }),
  inscription({
    slug: 'sanguine_frenzy',
    ink: ['crimson', 'violet'],
    rarity: 'epic',
    icon: 'spell.blood_purge_burst',
    values: { a: [15, 20, 25] },
    fixed: { l: 8 },
    grant: ({ a, l }) => ({
      passives: [statik(damage(a, { targetHasAnyDebuff: true })), onHit({ kind: 'lifesteal', percent: l })],
    }),
  }),
  inscription({
    slug: 'martyrdom',
    ink: ['azure', 'violet'],
    rarity: 'epic',
    icon: 'spell.fire_molten_heart',
    values: { a: [10, 15, 20] },
    fixed: { t: 2 },
    grant: ({ a, t }) => ({
      passives: [
        onDeath(
          inflict('poison', t, 'all_enemies'),
          inflict('poison', t, 'all_enemies'),
          mend(a, 'all_allies'),
        ),
      ],
    }),
  }),
];
