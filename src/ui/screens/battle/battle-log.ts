/**
 * Turns battle events into log lines for the Info panel (docs/tech/UI_DESIGN.md §5.9).
 *
 * A line is not a sentence but a sentence's *parts*: the template key it is written from and a
 * value per slot, each saying what it is — a unit, a number, a status. The panel draws a unit in
 * its rarity's or its element's colour, a number in its own weight and a status as its own icon,
 * and the English stays one translatable string.
 */
import { STATUS_BY_ID } from '@content/statuses/index';
import type { ChampionId, StatusId } from '@content/champions/types';
import { content } from '@content/registry';
import type { BattleEvent, BattleView, UnitView } from '@engine/battle/index';
import { t, translate } from '@i18n/index';
import { ELEMENT_COLOR, RARITY_COLOR } from '@ui/styles/display-maps';
import type { I18nKey } from '@i18n/index';

/** What a line is about: it picks the row's icon and its accent. */
export type LogKind =
  | 'turn'
  | 'cast'
  | 'hit'
  | 'crit'
  | 'heal'
  | 'shield'
  | 'buff'
  | 'debuff'
  | 'refused'
  | 'dot'
  | 'death'
  | 'revive'
  | 'boss'
  | 'system';

/** What a number in a line means, which is what gives it its colour. */
export type LogTone = 'damage' | 'heal' | 'shield';

/** One slot's value, tagged with how it should be drawn. */
export type LogValue =
  | { kind: 'unit'; id: string; name: string; side: 'ally' | 'enemy'; colour: string; boss: boolean }
  | { kind: 'amount'; value: number; tone: LogTone }
  | { kind: 'status'; id: StatusId; name: string; status: 'buff' | 'debuff' }
  | { kind: 'text'; text: string };

export interface LogLine {
  key: number;
  kind: LogKind;
  /** The i18n key the line is written from; the panel splits it into parts. */
  template: I18nKey;
  values: Record<string, LogValue>;
}

/** Ally names take their champion's rarity; an enemy takes its element, a boss the ember. */
const ALLY_FALLBACK = 'var(--text-1)';
const ENEMY_FALLBACK = '#e6b3b3';
const BOSS_COLOUR = 'var(--ember-3)';

function unitColour(unit: UnitView | undefined): string {
  if (!unit) return ALLY_FALLBACK;
  if (unit.isBoss) return BOSS_COLOUR;
  if (unit.side === 'ally') {
    const def = content.championById(unit.defId as ChampionId);
    return def ? RARITY_COLOR[def.rarity] : ALLY_FALLBACK;
  }
  const def = content.enemyById(unit.defId);
  return def ? ELEMENT_COLOR[def.element] : ENEMY_FALLBACK;
}

export function describeEvents(events: readonly BattleEvent[], view: BattleView | null): LogLine[] {
  const unitOf = (id: string): UnitView | undefined => view?.units.find((u) => u.id === id);
  const unit = (id: string): LogValue => {
    const found = unitOf(id);
    return {
      kind: 'unit',
      id,
      name: found ? translate(found.name) : id,
      // Ids are `a0…` for the party and `w<wave>e<slot>` for what stands against it.
      side: found?.side ?? (id.startsWith('a') ? 'ally' : 'enemy'),
      colour: unitColour(found),
      boss: found?.isBoss ?? false,
    };
  };
  const amount = (value: number, tone: LogTone): LogValue => ({
    kind: 'amount',
    value,
    tone,
  });
  const status = (id: string): LogValue => {
    const meta = STATUS_BY_ID[id as keyof typeof STATUS_BY_ID];
    return meta
      ? { kind: 'status', id: meta.id, name: translate(meta.name), status: meta.kind }
      : { kind: 'text', text: id };
  };
  const text = (value: string | number): LogValue => ({ kind: 'text', text: String(value) });

  const lines: LogLine[] = [];
  events.forEach((e, index) => {
    const push = (kind: LogKind, template: I18nKey, values: Record<string, LogValue>): void =>
      void lines.push({ key: index, kind, template, values });
    switch (e.type) {
      case 'turn.started':
        push('turn', 'battle.log.turn', { name: unit(e.unitId) });
        break;
      case 'turn.skipped':
        push('refused', 'battle.log.skipped', { name: unit(e.unitId), reason: status(e.reason) });
        break;
      case 'ability.cast':
        if (e.counter) push('cast', 'battle.log.counter', { name: unit(e.unitId) });
        else
          push('cast', 'battle.log.cast', {
            name: unit(e.unitId),
            ability: text(translate(`${e.abilityId}.name`)),
          });
        break;
      case 'hit':
        if (e.absorbed > 0)
          push('shield', 'battle.log.absorbed', {
            target: unit(e.targetId),
            amount: amount(e.absorbed, 'shield'),
          });
        if (e.damage > 0 || e.absorbed === 0)
          push(e.crit ? 'crit' : 'hit', e.crit ? 'battle.log.crit' : 'battle.log.hit', {
            source: unit(e.sourceId),
            target: unit(e.targetId),
            damage: amount(e.damage, 'damage'),
          });
        break;
      case 'heal':
        if (e.reason === 'ability')
          push('heal', 'battle.log.heal', {
            source: unit(e.sourceId),
            target: unit(e.targetId),
            amount: amount(e.amount, 'heal'),
          });
        else
          push('heal', 'battle.log.regen', {
            target: unit(e.targetId),
            amount: amount(e.amount, 'heal'),
          });
        break;
      case 'status.applied': {
        const meta = STATUS_BY_ID[e.status as keyof typeof STATUS_BY_ID];
        push(meta?.kind === 'buff' ? 'buff' : 'debuff', 'battle.log.status', {
          target: unit(e.targetId),
          status: status(e.status),
          turns: text(e.turns),
        });
        break;
      }
      case 'status.failed':
        push('refused', 'battle.log.statusFailed', {
          target: unit(e.targetId),
          status: status(e.status),
          reason: text(t(`battle.log.reason.${e.reason}` as I18nKey)),
        });
        break;
      case 'status.removed':
        if (e.reason !== 'consumed')
          push('refused', 'battle.log.statusRemoved', {
            target: unit(e.targetId),
            status: status(e.status),
          });
        break;
      case 'dot.tick':
        push('dot', 'battle.log.dot', {
          target: unit(e.unitId),
          amount: amount(e.amount, 'damage'),
          status: status(e.status),
        });
        break;
      case 'unit.died':
        push('death', 'battle.log.died', { name: unit(e.unitId) });
        break;
      case 'unit.revived':
        push('revive', 'battle.log.revived', { name: unit(e.unitId) });
        break;
      case 'tm.changed':
        if (Math.abs(e.delta) >= 0.05)
          push(e.delta > 0 ? 'buff' : 'debuff', 'battle.log.tm', {
            target: unit(e.targetId),
            delta: text(`${e.delta > 0 ? '+' : ''}${Math.round(e.delta * 100)}%`),
          });
        break;
      case 'extra_turn':
        push('buff', 'battle.log.extraTurn', { name: unit(e.unitId) });
        break;
      case 'wave.started':
        push('system', 'battle.log.wave', { wave: text(e.wave), count: text(e.waveCount) });
        break;
      case 'wave.cleared':
        push('system', 'battle.log.waveCleared', { wave: text(e.wave) });
        break;
      case 'enraged':
        push('boss', 'battle.log.enraged', { name: unit(e.unitId) });
        break;
      case 'phase.changed':
        push('boss', 'battle.log.phase', { name: unit(e.unitId), phase: text(e.phase) });
        break;
      case 'passive.broken':
        push('buff', 'battle.log.passiveBroken', {
          name: unit(e.unitId),
          passive: text(translate(`${e.passiveId}.name`)),
        });
        break;
      case 'battle.ended':
        push('system', 'battle.log.ended', {
          outcome: text(t(`battleResult.${e.outcome.kind}` as I18nKey)),
        });
        break;
      default:
        break;
    }
  });
  return lines;
}

/** The whole line as plain text — what a screen reader is given, and what tests read. */
export function lineText(line: LogLine): string {
  const params: Record<string, string> = {};
  for (const [slot, value] of Object.entries(line.values)) {
    params[slot] =
      value.kind === 'unit'
        ? value.name
        : value.kind === 'amount'
          ? value.value.toLocaleString('en-US')
          : value.kind === 'status'
            ? value.name
            : value.text;
  }
  return t(line.template, params);
}
