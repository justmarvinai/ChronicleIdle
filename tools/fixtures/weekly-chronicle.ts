/**
 * Writes `tests/fixtures/saves/weekly-boss.chronicle`: a chronicle deep enough for the weekly
 * boss's gate, with four 6★ champions in full Legendary gear — the roster BOSSES.md §3 is written
 * for. That is what it takes to see Titan's chorus fall, her phases turn and a real dent in her
 * pool, so the e2e suite and the screenshots can watch the whole mechanic in a production build.
 *
 * Deterministic: fixed clock, fixed seed, and every piece rolled from one seeded RNG.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { GearStat } from '@content/balance/gear';
import { GEAR_SLOTS, type ChampionId, type GearSlot } from '@content/champions/types';
import { content } from '@content/registry';
import { levelCap } from '@engine/champions/stats';
import { createInstance, instanceIdFor, type Roster } from '@engine/champions/instance';
import { walletWith } from '@engine/economy/wallet';
import { generateGear } from '@engine/gear/generate';
import type { GearInstance, Inventory } from '@engine/gear/instance';
import { createRng } from '@engine/rng/rng';
import { createNewGame } from '@engine/save/new-game';
import { encodeChronicleFile } from '@state/chronicle-file';

const REPO_ROOT = join(import.meta.dirname, '..', '..');
const OUT = join(REPO_ROOT, 'tests', 'fixtures', 'saves', 'weekly-boss.chronicle');
/** 2026-09-12 12:00 local, the same instant every save fixture froze. */
const NOW = new Date(2026, 8, 12, 12, 0).getTime();
const SEED = 'fixture.weekly';

/**
 * The three slots that roll a main stat pick it at random (GEAR.md §1), and a finished roster does
 * not keep what it rolls — it keeps what it wants. These are the mains a player farms for: damage
 * on the champions that deal it, turns and health on the ones that keep the party standing.
 */
type MainPlan = Partial<Record<GearSlot, GearStat>>;
const OFFENCE: MainPlan = { gauntlets: 'critDmg', chestplate: 'atkPct', boots: 'spd' };
const SUPPORT: MainPlan = { gauntlets: 'hpPct', chestplate: 'hpPct', boots: 'spd' };

/**
 * The party the gate fields, in slot order, each in a full six-piece set: the damage that answers
 * a 5,000,000 pool, a healer to survive the Eclipse Hymn, and the sets a finished roster wears.
 */
const PARTY: readonly { id: ChampionId; setId: string; mains: MainPlan }[] = [
  { id: 'champ.varkos_sundered_king', setId: 'gear_set.executioner', mains: OFFENCE },
  { id: 'champ.aurelia_dawnwarden', setId: 'gear_set.warcry', mains: SUPPORT },
  { id: 'champ.seraphine_vale', setId: 'gear_set.immortal', mains: SUPPORT },
  { id: 'champ.rattledagger', setId: 'gear_set.keen_eye', mains: OFFENCE },
];

async function main(): Promise<void> {
  const save = createNewGame({ name: 'Marvin', now: NOW, seedRoot: SEED });
  const rng = createRng(`${SEED}:gear`);
  const roster: Roster = {};
  const inventory: Inventory = {};
  const instanceIds: string[] = [];
  let serial = 0;

  PARTY.forEach((member, index) => {
    const def = content.championById(member.id);
    if (!def) throw new Error(`unknown champion ${member.id}`);
    const instanceId = instanceIdFor(def.id, index + 1);
    const instance = createInstance(def, { instanceId, now: NOW, source: 'summon' });
    instance.stars = 6;
    instance.level = levelCap(6);
    // Every ability at its last tome step: the kit a finished roster brings.
    for (const ability of def.abilities) instance.skillUpgrades[ability.id] = 4;

    for (const slot of GEAR_SLOTS) {
      serial += 1;
      const rolled = generateGear(
        {
          serial,
          slot,
          setId: member.setId,
          rarity: 'legendary',
          stars: 6,
          source: 'boss_chest',
          now: NOW,
          level: 16,
        },
        rng,
      );
      const piece: GearInstance = {
        ...rolled,
        mainStat: member.mains[slot] ?? rolled.mainStat,
        // A main the champion wants is never also a substat on the same piece.
        subs: rolled.subs.filter((sub) => sub.stat !== (member.mains[slot] ?? rolled.mainStat)),
        equippedTo: instanceId,
      };
      inventory[piece.instanceId] = piece;
      instance.gear[slot] = piece.instanceId;
    }

    roster[instanceId] = instance;
    instanceIds.push(instanceId);
  });

  const full = {
    ...save,
    roster,
    inventory,
    counters: { ...save.counters, instances: PARTY.length, gear: serial },
    // Level 30 is well past the weekly boss's gate (level 15) and the daily one's.
    profile: { ...save.profile, avatarChampionId: PARTY[0]?.id ?? null, level: 30 },
    // The party is pre-picked and remembered, so the gate's Battle goes straight into the race.
    teams: {
      ...save.teams,
      boss: { presets: [instanceIds, [], []], lastUsed: instanceIds },
    },
    wallet: walletWith([
      { currency: 'gold', amount: 500_000 },
      { currency: 'gems', amount: 1_000 },
    ]),
  };
  const text = await encodeChronicleFile(full, '0.0.11', NOW);
  await mkdir(join(OUT, '..'), { recursive: true });
  await writeFile(OUT, `${text}\n`);
  console.log(`[fixtures] wrote ${OUT} (${PARTY.length} champions at 6★${levelCap(6)}, ${serial} pieces)`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
