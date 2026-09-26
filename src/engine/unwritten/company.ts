/**
 * The company (docs/design/UNWRITTEN.md §4): who is standing, who has fallen, and the shares of HP
 * they carry from fight to fight. A share is of the max HP a champion has when the next fight
 * begins, so levelling a wounded champion in Emberhold is neither a heal nor a wound.
 */
import { RARITY_STARS } from '@content/balance/stats';
import { ECHO_WEIGHTS } from '@content/balance/unwritten';
import type { ChampionDef } from '@content/champions/types';
import type { Roster } from '@engine/champions/instance';
import type { Rng } from '@engine/rng/rng';
import type { CompanyMember, EchoSave, Expedition } from '@engine/schema/unwritten-save';
import type { Whom } from '@content/unwritten/types';
import type { UnwrittenWorld } from './world';

/** A wound from a mystery never fells: it stops at this share. */
const WOUND_FLOOR = 0.01;

export const isStanding = (member: CompanyMember): boolean => member.hp > 0;

export function standing(run: Pick<Expedition, 'company'>): CompanyMember[] {
  return run.company.filter(isStanding);
}

export function fallenMembers(run: Pick<Expedition, 'company'>): CompanyMember[] {
  return run.company.filter((member) => !isStanding(member));
}

/** The champion a member is: the roster instance's, or the one an Echo echoes. */
export function championOf(
  member: CompanyMember,
  roster: Roster,
  world: UnwrittenWorld,
): ChampionDef | undefined {
  const defId = member.echo ? member.echo.defId : roster[member.id]?.defId;
  return defId ? world.championById(defId) : undefined;
}

/** A member's level and stars, as they fight now. */
export function standingOf(member: CompanyMember, roster: Roster): { level: number; stars: number } {
  if (member.echo) return { level: member.echo.level, stars: member.echo.stars };
  const instance = roster[member.id];
  return { level: instance?.level ?? 1, stars: instance?.stars ?? 1 };
}

/** The members to heal or wound: everyone standing, or the strongest, or one drawn at random. */
function chosen(run: Expedition, whom: Whom, roster: Roster, rng: Rng): CompanyMember[] {
  const up = standing(run);
  if (!up.length) return [];
  if (whom === 'all') return up;
  if (whom === 'random') return [rng.pick(up)];
  const strongest = up.reduce((best, member) => {
    const a = standingOf(member, roster);
    const b = standingOf(best, roster);
    return a.level * 10 + a.stars > b.level * 10 + b.stars ? member : best;
  });
  return [strongest];
}

/** Standing members gain `share` of their max HP, never past whole. */
export function heal(run: Expedition, share: number, whom: Whom, roster: Roster, rng: Rng): void {
  for (const member of chosen(run, whom, roster, rng)) member.hp = Math.min(1, member.hp + share);
}

/** Standing members lose `share` of their max HP, never falling from it. */
export function wound(run: Expedition, share: number, whom: Whom, roster: Roster, rng: Rng): void {
  for (const member of chosen(run, whom, roster, rng)) member.hp = Math.max(WOUND_FLOOR, member.hp - share);
}

/** Raises a fallen member (the first fallen, or the one named) to `share`; returns who rose. */
export function rekindle(run: Expedition, share: number, id?: string): CompanyMember | null {
  const member = run.company.find((m) => !isStanding(m) && (id === undefined || m.id === id));
  if (!member) return null;
  member.hp = Math.max(WOUND_FLOOR, Math.min(1, share));
  return member;
}

/** The company's average level and stars, which an Echo joins at (§4.3). */
export function companyStanding(run: Expedition, roster: Roster): { level: number; stars: number } {
  const all = run.company.map((member) => standingOf(member, roster));
  if (!all.length) return { level: 1, stars: 1 };
  return {
    level: Math.max(1, Math.floor(all.reduce((sum, s) => sum + s.level, 0) / all.length)),
    stars: Math.max(1, Math.floor(all.reduce((sum, s) => sum + s.stars, 0) / all.length)),
  };
}

/** Echoes offered at a passage: distinct champions, weighted by rarity, at the company's standing. */
export function drawEchoes(input: {
  rng: Rng;
  run: Expedition;
  roster: Roster;
  world: UnwrittenWorld;
  count: number;
  extraStars: number;
}): EchoSave[] {
  const { rng, run, roster, world } = input;
  const { level, stars } = companyStanding(run, roster);
  const present = new Set(run.company.map((member) => championOf(member, roster, world)?.id));
  const offered: EchoSave[] = [];
  for (let i = 0; i < input.count; i += 1) {
    const candidates = world.echoPool.filter(
      (def) => def.rarity in ECHO_WEIGHTS && !present.has(def.id) && !offered.some((e) => e.defId === def.id),
    );
    if (!candidates.length) break;
    const def = rng.weighted(
      candidates.map((item) => ({ item, weight: ECHO_WEIGHTS[item.rarity as keyof typeof ECHO_WEIGHTS] })),
    );
    const bounds = RARITY_STARS[def.rarity];
    offered.push({
      defId: def.id,
      level,
      stars: Math.max(bounds.base, Math.min(bounds.max, stars + input.extraStars)),
    });
  }
  return offered;
}
