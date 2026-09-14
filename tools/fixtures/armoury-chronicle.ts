/**
 * Writes `tests/fixtures/saves/armoury.chronicle`: a chronicle past the gear gate with a purse
 * and a stocked armoury — among it a Warcry weapon and a Warcry helmet, so the e2e suite can
 * complete a two-piece set in a production build. Deterministic (fixed clock, fixed seed).
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { GearSlot, Rarity } from '@content/champions/types';
import { content } from '@content/registry';
import { seedStartingRoster } from '@engine/champions/roster';
import { walletWith } from '@engine/economy/wallet';
import { generateGear } from '@engine/gear/generate';
import type { GearInstance, Inventory } from '@engine/gear/instance';
import { createRng } from '@engine/rng/rng';
import { createNewGame } from '@engine/save/new-game';
import { encodeChronicleFile } from '@state/chronicle-file';

const REPO_ROOT = join(import.meta.dirname, '..', '..');
const OUT = join(REPO_ROOT, 'tests', 'fixtures', 'saves', 'armoury.chronicle');
/** 2026-09-12 12:00 local, the same instant every save fixture froze. */
const NOW = new Date(2026, 8, 12, 12, 0).getTime();
const SEED = 'fixture.armoury';

/** What the racks hold: a pair of Warcry pieces first, then a spread across slots and sets. */
const STOCK: readonly { slot: GearSlot; setId: string; rarity: Rarity; stars: number }[] = [
  { slot: 'weapon', setId: 'gear_set.warcry', rarity: 'epic', stars: 5 },
  { slot: 'helmet', setId: 'gear_set.warcry', rarity: 'rare', stars: 4 },
  { slot: 'shield', setId: 'gear_set.ironhide', rarity: 'rare', stars: 4 },
  { slot: 'gauntlets', setId: 'gear_set.keen_eye', rarity: 'uncommon', stars: 3 },
  { slot: 'chestplate', setId: 'gear_set.ember_guard', rarity: 'epic', stars: 5 },
  { slot: 'boots', setId: 'gear_set.swiftfoot', rarity: 'rare', stars: 4 },
  { slot: 'weapon', setId: 'gear_set.executioner', rarity: 'uncommon', stars: 2 },
  { slot: 'helmet', setId: 'gear_set.ember_guard', rarity: 'common', stars: 2 },
  { slot: 'shield', setId: 'gear_set.warding', rarity: 'epic', stars: 4 },
  { slot: 'gauntlets', setId: 'gear_set.warcry', rarity: 'rare', stars: 3 },
  { slot: 'chestplate', setId: 'gear_set.truesight', rarity: 'uncommon', stars: 3 },
  { slot: 'boots', setId: 'gear_set.ironhide', rarity: 'common', stars: 1 },
];

async function main(): Promise<void> {
  const save = createNewGame({ name: 'Marvin', now: NOW, seedRoot: SEED });
  const seeded = seedStartingRoster(
    { roster: save.roster, counters: save.counters },
    content,
    'champ.ser_corvin',
    NOW,
  );
  if (!seeded.ok) throw new Error(`starter: ${seeded.error.message}`);

  const rng = createRng(`${SEED}:stock`);
  const inventory: Inventory = {};
  STOCK.forEach((entry, index) => {
    const piece: GearInstance = generateGear(
      { serial: index + 1, ...entry, source: 'campaign_drop', now: NOW + index },
      rng,
    );
    inventory[piece.instanceId] = piece;
  });

  const full = {
    ...save,
    roster: seeded.value.state.roster,
    counters: { instances: seeded.value.state.counters.instances, gear: STOCK.length },
    inventory,
    // Level 5 clears the gear gate (level 3) with room to spare.
    profile: { ...save.profile, avatarChampionId: 'champ.ser_corvin' as const, level: 5 },
    wallet: walletWith([
      { currency: 'gold', amount: 200_000 },
      { currency: 'gems', amount: 300 },
    ]),
  };
  const text = await encodeChronicleFile(full, '0.0.6', NOW);
  await mkdir(join(OUT, '..'), { recursive: true });
  await writeFile(OUT, `${text}\n`);
  console.log(`[fixtures] wrote ${OUT} (${STOCK.length} pieces, level 5)`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
