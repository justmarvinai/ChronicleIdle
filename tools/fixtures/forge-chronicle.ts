/**
 * Writes `tests/fixtures/saves/forge.chronicle`: a chronicle past the refine gate with a full
 * material chest and a rack of pieces — among them two 4★ weapons, so the e2e suite can refine
 * in a production build. Deterministic (fixed clock, fixed seed).
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
const OUT = join(REPO_ROOT, 'tests', 'fixtures', 'saves', 'forge.chronicle');
/** 2026-09-12 12:00 local, the same instant every save fixture froze. */
const NOW = new Date(2026, 8, 12, 12, 0).getTime();
const SEED = 'fixture.forge';

/** The racks: a pair of 4★ weapons to refine, and a spread of cheap pieces to break. */
const STOCK: readonly { slot: GearSlot; setId: string; rarity: Rarity; stars: number }[] = [
  { slot: 'weapon', setId: 'gear_set.warcry', rarity: 'epic', stars: 4 },
  { slot: 'weapon', setId: 'gear_set.executioner', rarity: 'rare', stars: 4 },
  { slot: 'helmet', setId: 'gear_set.ember_guard', rarity: 'common', stars: 1 },
  { slot: 'helmet', setId: 'gear_set.ironhide', rarity: 'common', stars: 2 },
  { slot: 'shield', setId: 'gear_set.warding', rarity: 'uncommon', stars: 2 },
  { slot: 'gauntlets', setId: 'gear_set.keen_eye', rarity: 'uncommon', stars: 1 },
  { slot: 'chestplate', setId: 'gear_set.truesight', rarity: 'common', stars: 2 },
  { slot: 'boots', setId: 'gear_set.swiftfoot', rarity: 'rare', stars: 3 },
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
    // Level 20 clears the Forge's gate (8) and refining's (18).
    profile: { ...save.profile, avatarChampionId: 'champ.ser_corvin' as const, level: 20 },
    wallet: walletWith([
      { currency: 'gold', amount: 400_000 },
      { currency: 'gems', amount: 300 },
      { currency: 'mat_scrap_iron', amount: 200 },
      { currency: 'mat_ember_alloy', amount: 150 },
      { currency: 'mat_starsteel', amount: 100 },
      { currency: 'mat_arcane_dust', amount: 200 },
      { currency: 'mat_refining_core', amount: 40 },
      { currency: 'mat_glyph_sigil', amount: 6 },
    ]),
  };
  const text = await encodeChronicleFile(full, '0.0.7', NOW);
  await mkdir(join(OUT, '..'), { recursive: true });
  await writeFile(OUT, `${text}\n`);
  console.log(`[fixtures] wrote ${OUT} (${STOCK.length} pieces, level 20)`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
