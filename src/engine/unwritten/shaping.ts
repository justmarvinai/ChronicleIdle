/**
 * What a fight carries (docs/design/UNWRITTEN.md §4.2, §7, §8): the company's inscriptions,
 * illuminations, relics and blots turned into the passives each fielded champion brings in, and
 * the wounds each enters with. Echoes (§4.3) become battle-ready instances here, with their
 * resolve standing in for the gear they have not got.
 */
import { ECHO_RESOLVE, ILLUMINATION_AT } from '@content/balance/unwritten';
import type { PassiveDef } from '@content/champions/types';
import { INKS, type Bearer, type FightKind, type InkId } from '@content/unwritten/types';
import { createInstance, type ChampionInstance, type Roster } from '@engine/champions/instance';
import type { BattleShaping } from '@engine/battle/create';
import type { CompanyMember, Expedition } from '@engine/schema/unwritten-save';
import { championOf } from './company';
import { inkCounts } from './offers';
import { passivesOf } from './passives';
import type { Rules } from './rules';
import type { UnwrittenWorld } from './world';

/** The tier each ink has illuminated to (0, 1 or 2), given the rules' `illumination_sooner`. */
export function illuminationTiers(
  run: Pick<Expedition, 'inscriptions'>,
  rules: Rules,
  world: UnwrittenWorld,
): Record<InkId, number> {
  const counts = inkCounts(run.inscriptions, (id) => world.content.inscriptions.find((def) => def.id === id));
  const [first, second] = ILLUMINATION_AT.map((at) => Math.max(1, at - rules.illumination_sooner));
  return Object.fromEntries(
    INKS.map((ink) => [ink, counts[ink] >= (second ?? 6) ? 2 : counts[ink] >= (first ?? 3) ? 1 : 0]),
  ) as Record<InkId, number>;
}

const ECHO_RESOLVE_SOURCE = {
  id: 'unwritten.echo_resolve',
  name: 'unwritten.echo.resolve.name',
  text: 'unwritten.echo.resolve.text',
  icon: 'spell.hero_spellblade',
} as const;

/** An Echo's resolve: a share more HP, ATK and DEF, standing in for gear. */
function resolvePassives(): PassiveDef[] {
  return passivesOf(ECHO_RESOLVE_SOURCE, [
    {
      trigger: 'static',
      effects: [
        { kind: 'stat_mod', stat: 'hp', percent: ECHO_RESOLVE },
        { kind: 'stat_mod', stat: 'atk', percent: ECHO_RESOLVE },
        { kind: 'stat_mod', stat: 'def', percent: ECHO_RESOLVE },
      ],
    },
  ]);
}

function bears(bearer: Bearer, leader: boolean, element: string | undefined): boolean {
  if (bearer === 'each') return true;
  if (bearer === 'leader') return leader;
  return element === bearer.element;
}

export interface ShapingInput {
  run: Expedition;
  rules: Rules;
  world: UnwrittenWorld;
  roster: Roster;
  /** The members sent in, in line-up order: the first leads. */
  fielded: readonly CompanyMember[];
  fight: FightKind;
}

/** Each fielded champion's passives and entry share (the enemy side is the encounter's, §6). */
export function companyShaping(
  input: ShapingInput,
): Required<Pick<BattleShaping, 'allyPassives' | 'allyHp'>> {
  const { run, rules, world, roster, fielded, fight } = input;
  const { content } = world;
  const tiers = illuminationTiers(run, rules, world);
  const shared: PassiveDef[] = [];
  for (const ink of INKS) {
    const tier = tiers[ink];
    const def = content.illuminations[ink];
    if (!tier) continue;
    shared.push(
      ...passivesOf(
        {
          id: `illumination.${ink}.${tier}`,
          name: `unwritten.ink.${ink}.name`,
          text: def.text[tier - 1] ?? '',
          icon: def.icon,
        },
        def.tiers[tier - 1]?.grant.passives,
      ),
    );
  }
  for (const id of run.relics) {
    const relic = content.relics.find((r) => r.id === id);
    if (relic && (!relic.grant.only || relic.grant.only.includes(fight)))
      shared.push(...passivesOf(relic, relic.grant.passives));
  }
  for (const id of run.blots) {
    const blot = content.blots.find((b) => b.id === id);
    if (blot) shared.push(...passivesOf(blot, blot.grant.passives));
  }

  const allyPassives: Record<string, PassiveDef[]> = {};
  const allyHp: Record<string, number> = {};
  fielded.forEach((member, slot) => {
    const element = championOf(member, roster, world)?.element;
    const own: PassiveDef[] = [];
    for (const held of run.inscriptions) {
      const def = content.inscriptions.find((i) => i.id === held.id);
      if (!def || !bears(def.bearer, slot === 0, element)) continue;
      own.push(
        ...passivesOf({ ...def, id: `${def.id}.${held.level}` }, def.levels[held.level - 1]?.grant.passives),
      );
    }
    allyPassives[member.id] = [...own, ...shared, ...(member.echo ? resolvePassives() : [])];
    allyHp[member.id] = member.hp;
  });
  return { allyPassives, allyHp };
}

/** The Echoes of the company as instances the battle can field, by their company id. */
export function echoRoster(run: Pick<Expedition, 'company'>, world: UnwrittenWorld): Roster {
  const roster: Roster = {};
  for (const member of run.company) {
    if (!member.echo) continue;
    const def = world.championById(member.echo.defId);
    if (!def) continue;
    const instance: ChampionInstance = {
      ...createInstance(def, { instanceId: member.id, now: 0, source: 'summon' }),
      level: member.echo.level,
      stars: member.echo.stars,
    };
    roster[member.id] = instance;
  }
  return roster;
}
