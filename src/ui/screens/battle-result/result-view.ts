/**
 * What the result screen reads off a finished fight (docs/tech/UI_DESIGN.md §5.10), kept out of the
 * components so the verdicts it prints — who carried the fight, why it was lost — are testable.
 */
import type { GlyphKey } from '@assets/manifest.generated';
import type { EncounterDef } from '@content/encounters/types';
import { content } from '@content/registry';
import type { BattleOutcome, UnitReport } from '@engine/battle/index';
import type { I18nKey } from '@i18n/index';

/**
 * How much faster the enemy has to have been, in turns taken per ally turn, before the defeat says
 * the team was out-sped. Presentation only: it chooses a line of advice, not an outcome.
 */
const OUTSPED_RATIO = 1.4;

/** The ally who dealt the most damage, or null when no one dealt any. */
export function mvpOf(allies: readonly UnitReport[]): string | null {
  let best: UnitReport | null = null;
  for (const unit of allies)
    if (unit.damageDealt > 0 && (!best || unit.damageDealt > best.damageDealt)) best = unit;
  return best?.unitId ?? null;
}

/** Each ally's damage against the top dealer's, 0–1, for the bars on their cards. */
export function damageShares(allies: readonly UnitReport[]): Map<string, number> {
  const top = Math.max(0, ...allies.map((unit) => unit.damageDealt));
  return new Map(allies.map((unit) => [unit.unitId, top > 0 ? unit.damageDealt / top : 0]));
}

/** Where a piece of advice can send the player to act on it. */
export type AdviceGo = 'tavern' | 'champions' | null;

/** One line of advice after a lost fight: what went wrong, a glyph for it, and where to fix it. */
export interface Advice {
  key: I18nKey;
  glyph: GlyphKey;
  go: AdviceGo;
}

export interface AdviceInput {
  outcome: BattleOutcome;
  encounter: EncounterDef;
  /** The fielded champions' levels, as the chronicle holds them now. */
  levels: readonly number[];
  /** A boss race: its advice is its own (BOSSES.md §2). */
  boss: { percent: number } | null;
}

/**
 * Why a fight went the way it did, as advice the player can act on. A boss race is judged as a race;
 * a lost stand by who out-sped whom, a mender left standing, the turn limit, and a party below the
 * encounter's level — each only when it is true. A retreat and a victory get none.
 */
export function adviceFor({ outcome, encounter, levels, boss }: AdviceInput): Advice[] {
  const advice: Advice[] = [];
  if (boss) {
    // The turn limit is a normal ending, and the way through a wall that shrugs off crowd control
    // is damage over time and curses.
    if (outcome.kind === 'timeout')
      advice.push({ key: 'bosses.hint.race', glyph: 'glyph.hourglass', go: null });
    if (boss.percent < 100) {
      advice.push({ key: 'bosses.sheet.tip.dots', glyph: 'glyph.magic_flame', go: null });
      advice.push({ key: 'bosses.sheet.tip.debuffs', glyph: 'glyph.cursed_eye', go: null });
    }
    return advice;
  }
  if (outcome.kind === 'victory' || outcome.kind === 'retreat') return advice;
  const enemyTurns = outcome.turns - outcome.allyTurns;
  if (enemyTurns > outcome.allyTurns * OUTSPED_RATIO)
    advice.push({ key: 'battleResult.hint.outsped', glyph: 'glyph.rockets', go: 'champions' });
  const healers = encounter.waves.some((wave) =>
    wave.enemies.some((spawn) => content.enemyById(spawn.enemyId)?.archetype === 'mender'),
  );
  if (healers && outcome.wavesCleared < outcome.waveCount)
    advice.push({ key: 'battleResult.hint.healer', glyph: 'glyph.health_potion', go: null });
  if (outcome.kind === 'timeout')
    advice.push({ key: 'battleResult.hint.turns', glyph: 'glyph.hourglass', go: 'champions' });
  // Only when it is true: a party at the encounter's level does not need to hear this.
  if (levels.some((level) => level > 0 && level < encounter.enemyLevel))
    advice.push({ key: 'battleResult.hint.level', glyph: 'glyph.fist_punch', go: 'tavern' });
  return advice;
}
