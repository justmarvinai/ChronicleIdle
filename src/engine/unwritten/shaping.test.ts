import { describe, expect, it } from 'vitest';
import { ECHO_RESOLVE, ILLUMINATION_AT } from '@content/balance/unwritten';
import type { InkId } from '@content/unwritten/types';
import type { Expedition } from '@engine/schema/unwritten-save';
import { UNWRITTEN_WORLD } from '@state/unwritten/world';
import { begin, setup } from './expedition.test-support';
import { combineRules, expeditionRules } from './rules';
import { companyShaping, echoRoster, illuminationTiers } from './shaping';

const world = UNWRITTEN_WORLD;

/** `count` single-ink inscriptions of this ink, in the order the content lists them. */
function inkOf(ink: InkId, count: number): Expedition['inscriptions'] {
  return world.content.inscriptions
    .filter((def) => def.inks.length === 1 && def.inks[0] === ink)
    .slice(0, count)
    .map((def) => ({ id: def.id, level: 1 as const }));
}

function shapingOf(
  run: Expedition,
  fight: 'skirmish' | 'elite' | 'warden' = 'skirmish',
  roster = setup().roster,
) {
  return companyShaping({
    run,
    rules: expeditionRules({ scriptorium: [] }, run, world),
    world,
    roster,
    fielded: run.company,
    fight,
  });
}

const ids = (passives: readonly { id: string }[] | undefined) => (passives ?? []).map((p) => p.id);

describe('illumination (UNWRITTEN.md §7.4)', () => {
  it('lights an ink at three and again at six, a blend counting for both', () => {
    const run = begin(setup().ctx);
    const rules = expeditionRules({ scriptorium: [] }, run, world);
    run.inscriptions = inkOf('gold', (ILLUMINATION_AT[0] ?? 3) - 1);
    expect(illuminationTiers(run, rules, world).gold).toBe(0);
    run.inscriptions = inkOf('gold', ILLUMINATION_AT[0] ?? 3);
    expect(illuminationTiers(run, rules, world).gold).toBe(1);
    run.inscriptions = inkOf('gold', ILLUMINATION_AT[1] ?? 6);
    expect(illuminationTiers(run, rules, world).gold).toBe(2);
    const blend = world.content.inscriptions.find((def) => def.inks.length > 1);
    if (!blend) throw new Error('no blends');
    run.inscriptions = [{ id: blend.id, level: 1 }];
    const tiers = illuminationTiers(run, combineRules([{ rule: 'illumination_sooner', value: 2 }]), world);
    // Written sooner by two: one inscription lights both of the blend's inks.
    for (const ink of blend.inks) expect(tiers[ink]).toBe(1);
  });

  it('shares an illumination’s passives with every champion sent in', () => {
    const run = begin(setup().ctx);
    run.inscriptions = inkOf('crimson', ILLUMINATION_AT[0] ?? 3);
    const { allyPassives } = shapingOf(run);
    for (const member of run.company)
      expect(ids(allyPassives[member.id]).some((id) => id.startsWith('illumination.crimson.1'))).toBe(true);
  });
});

describe('what each champion carries in (UNWRITTEN.md §7, §8)', () => {
  it('gives an inscription to its bearers only: each, the leader, or one element', () => {
    const run = begin(setup().ctx);
    run.inscriptions = [
      { id: 'inscription.shieldbearers_rite', level: 2 },
      { id: 'inscription.kinship_of_azure', level: 1 },
    ];
    // Corvin leads and is of Justice; Wenna and Maelis are of Faith.
    const { allyPassives } = shapingOf(run);
    const has = (member: string, prefix: string) =>
      ids(allyPassives[member]).some((id) => id.startsWith(prefix));
    expect(has('c1', 'inscription.shieldbearers_rite.2')).toBe(true);
    expect(has('c2', 'inscription.shieldbearers_rite')).toBe(false);
    expect(has('c3', 'inscription.kinship_of_azure.1')).toBe(true);
    expect(has('c4', 'inscription.kinship_of_azure.1')).toBe(true);
    expect(has('c1', 'inscription.kinship_of_azure')).toBe(false);
  });

  it('writes the level held: the grant is the level’s own', () => {
    const run = begin(setup().ctx);
    const def = world.content.inscriptions.find((i) => i.id === 'inscription.kinship_of_azure');
    run.inscriptions = [{ id: 'inscription.kinship_of_azure', level: 3 }];
    const passive = shapingOf(run).allyPassives['c3']?.find((p) =>
      p.id.startsWith('inscription.kinship_of_azure'),
    );
    expect(passive?.effects).toEqual(def?.levels[2]?.grant.passives?.[0]?.effects);
  });

  it('carries a relic only into the fights it names, and a blot into every one', () => {
    const run = begin(setup().ctx);
    run.relics = ['relic.wardens_bane'];
    run.blots = ['blot.brittle_will'];
    const skirmish = shapingOf(run, 'skirmish').allyPassives['c1'];
    const warden = shapingOf(run, 'warden').allyPassives['c1'];
    expect(ids(skirmish).some((id) => id.startsWith('relic.wardens_bane'))).toBe(false);
    expect(ids(warden).some((id) => id.startsWith('relic.wardens_bane'))).toBe(true);
    const blot = world.content.blots.find((b) => b.id === 'blot.brittle_will');
    if (blot?.grant.passives?.length)
      expect(ids(skirmish).some((id) => id.startsWith('blot.brittle_will'))).toBe(true);
  });

  it('sends each champion in at the share of HP they kept', () => {
    const run = begin(setup().ctx);
    run.company = run.company.map((m, i) => ({ ...m, hp: [1, 0.5, 0.25, 0.1][i] ?? 1 }));
    expect(shapingOf(run).allyHp).toEqual({ c1: 1, c2: 0.5, c3: 0.25, c4: 0.1 });
  });
});

describe('Echoes (UNWRITTEN.md §4.3)', () => {
  it('fields an Echo at its level and stars, with resolve standing in for gear', () => {
    const run = begin(setup().ctx, ['c1']);
    run.company.push({ id: 'echo.1', echo: { defId: 'champ.anuria', level: 40, stars: 5 }, hp: 1 });
    const roster = echoRoster(run, world);
    expect(roster['echo.1']?.defId).toBe('champ.anuria');
    expect(roster['echo.1']?.level).toBe(40);
    expect(roster['echo.1']?.stars).toBe(5);
    expect(roster['c1']).toBeUndefined();
    const passives = shapingOf(run, 'skirmish', { ...setup().roster, ...roster }).allyPassives;
    const resolve = passives['echo.1']?.find((p) => p.id.startsWith('unwritten.echo_resolve'));
    expect(resolve?.effects).toContainEqual({ kind: 'stat_mod', stat: 'atk', percent: ECHO_RESOLVE });
    expect(ids(passives['c1']).some((id) => id.startsWith('unwritten.echo_resolve'))).toBe(false);
  });
});
