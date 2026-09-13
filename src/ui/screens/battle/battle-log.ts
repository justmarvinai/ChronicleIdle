/** Turns battle events into readable log lines (Info panel, result screen). */
import { STATUS_BY_ID } from '@content/statuses/index';
import type { BattleEvent, BattleView } from '@engine/battle/index';
import { t, translate } from '@i18n/index';
import type { I18nKey } from '@i18n/index';

export interface LogLine {
  key: number;
  text: string;
  tone: 'neutral' | 'ally' | 'enemy' | 'good' | 'bad' | 'system';
}

export function describeEvents(events: readonly BattleEvent[], view: BattleView | null): LogLine[] {
  const nameOf = (id: string): string => {
    const unit = view?.units.find((u) => u.id === id);
    return unit ? translate(unit.name) : id;
  };
  const sideOf = (id: string): 'ally' | 'enemy' => (id.startsWith('a') ? 'ally' : 'enemy');
  const abilityName = (abilityId: string): string => translate(`${abilityId}.name`);
  const statusName = (id: string): string => {
    const meta = STATUS_BY_ID[id as keyof typeof STATUS_BY_ID];
    return meta ? translate(meta.name) : id;
  };
  const lines: LogLine[] = [];
  events.forEach((e, index) => {
    const push = (text: string, tone: LogLine['tone']): void => void lines.push({ key: index, text, tone });
    switch (e.type) {
      case 'turn.started':
        push(t('battle.log.turn', { name: nameOf(e.unitId) }), sideOf(e.unitId));
        break;
      case 'turn.skipped':
        push(t('battle.log.skipped', { name: nameOf(e.unitId), reason: statusName(e.reason) }), 'bad');
        break;
      case 'ability.cast':
        push(
          e.counter
            ? t('battle.log.counter', { name: nameOf(e.unitId) })
            : t('battle.log.cast', { name: nameOf(e.unitId), ability: abilityName(e.abilityId) }),
          sideOf(e.unitId),
        );
        break;
      case 'hit':
        if (e.absorbed > 0)
          push(t('battle.log.absorbed', { target: nameOf(e.targetId), amount: e.absorbed }), 'neutral');
        if (e.damage > 0 || e.absorbed === 0)
          push(
            t(e.crit ? 'battle.log.crit' : 'battle.log.hit', {
              source: nameOf(e.sourceId),
              target: nameOf(e.targetId),
              damage: e.damage,
            }),
            sideOf(e.sourceId),
          );
        break;
      case 'heal':
        push(
          e.reason === 'ability'
            ? t('battle.log.heal', {
                source: nameOf(e.sourceId),
                target: nameOf(e.targetId),
                amount: e.amount,
              })
            : t('battle.log.regen', { target: nameOf(e.targetId), amount: e.amount }),
          'good',
        );
        break;
      case 'status.applied':
        push(
          t('battle.log.status', {
            target: nameOf(e.targetId),
            status: statusName(e.status),
            turns: e.turns,
          }),
          'neutral',
        );
        break;
      case 'status.failed':
        push(
          t('battle.log.statusFailed', {
            target: nameOf(e.targetId),
            status: statusName(e.status),
            reason: t(`battle.log.reason.${e.reason}` as I18nKey),
          }),
          'neutral',
        );
        break;
      case 'status.removed':
        if (e.reason !== 'consumed')
          push(
            t('battle.log.statusRemoved', { target: nameOf(e.targetId), status: statusName(e.status) }),
            'neutral',
          );
        break;
      case 'dot.tick':
        push(
          t('battle.log.dot', { target: nameOf(e.unitId), amount: e.amount, status: statusName(e.status) }),
          'bad',
        );
        break;
      case 'unit.died':
        push(t('battle.log.died', { name: nameOf(e.unitId) }), 'bad');
        break;
      case 'unit.revived':
        push(t('battle.log.revived', { name: nameOf(e.unitId) }), 'good');
        break;
      case 'tm.changed':
        if (Math.abs(e.delta) >= 0.05)
          push(
            t('battle.log.tm', {
              target: nameOf(e.targetId),
              delta: `${e.delta > 0 ? '+' : ''}${Math.round(e.delta * 100)}%`,
            }),
            'neutral',
          );
        break;
      case 'extra_turn':
        push(t('battle.log.extraTurn', { name: nameOf(e.unitId) }), 'good');
        break;
      case 'wave.started':
        push(t('battle.log.wave', { wave: e.wave, count: e.waveCount }), 'system');
        break;
      case 'wave.cleared':
        push(t('battle.log.waveCleared', { wave: e.wave }), 'system');
        break;
      case 'enraged':
        push(t('battle.log.enraged', { name: nameOf(e.unitId) }), 'bad');
        break;
      case 'battle.ended':
        push(t('battle.log.ended', { outcome: t(`battleResult.${e.outcome.kind}` as I18nKey) }), 'system');
        break;
      default:
        break;
    }
  });
  return lines;
}
