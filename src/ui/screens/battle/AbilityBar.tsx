import { content } from '@content/registry';
import type { ChampionId } from '@content/champions/types';
import { abilityNumbers, passiveNumbers } from '@engine/champions/describe';
import type { DecisionRequest, UnitView } from '@engine/battle/index';
import { t, translate } from '@i18n/index';
import { championAvatar } from '@ui/champions/art';
import { AbilityIcon } from '@ui/components/AbilityIcon/AbilityIcon';
import { Tooltip } from '@ui/components/Tooltip/Tooltip';
import styles from './BattleScreen.module.css';

export interface AbilityBarProps {
  unit: UnitView | null;
  request: DecisionRequest | null;
  selectedAbilityId: string | null;
  onSelect: (abilityId: string) => void;
  /**
   * The Skill Tome steps the acting champion carries, per ability id: the tooltips quote the numbers
   * the fight uses, and an upgraded ability hits harder than its base line reads.
   */
  skillUpgrades?: Readonly<Record<string, number>> | undefined;
  /** Auto is choosing the moves, so the bar says so instead of waiting on the player. */
  auto?: boolean;
}

/**
 * Bottom-right ability bar (UI_DESIGN.md §5.9): who acts and what the press will cast over the
 * portrait and the A1–A4 icons with their cooldowns, then the passive.
 */
export function AbilityBar({
  unit,
  request,
  selectedAbilityId,
  onSelect,
  skillUpgrades = {},
  auto = false,
}: AbilityBarProps) {
  if (!unit) return null;
  const def = unit.side === 'ally' ? content.championById(unit.defId as ChampionId) : undefined;
  const enemyDef = unit.side === 'enemy' ? content.enemyById(unit.defId) : undefined;
  const abilities = def?.abilities ?? enemyDef?.abilities ?? [];
  const art = def ? championAvatar(def, 128) : null;
  const selected = request ? abilities.find((ability) => ability.id === selectedAbilityId) : undefined;
  return (
    <div className={styles.abilityBar} data-testid="ability-bar">
      <div className={styles.abilityHead}>
        <span className={`display ${styles.abilityWho}`}>{translate(unit.name)}</span>
        {selected ? (
          <span className={styles.abilityNext} data-testid="ability-next">
            <span className={styles.abilityNextKey}>{t('battle.confirmKey')}</span>
            <span className="display">{translate(selected.name)}</span>
          </span>
        ) : (
          <span className={styles.abilityWait}>
            {request ? t('battle.pickAbility') : auto ? t('battle.autoChoosing') : t('battle.waiting')}
          </span>
        )}
      </div>
      <div className={styles.abilityBody}>
        {art ? (
          <div className={styles.portrait} style={{ backgroundImage: `url("${art.url}")` }}>
            {art.tint ? (
              <div
                className={styles.portraitTint}
                style={{
                  backgroundColor: art.tint,
                  WebkitMaskImage: `url("${art.url}")`,
                  maskImage: `url("${art.url}")`,
                }}
              />
            ) : null}
          </div>
        ) : null}
        <div className={styles.abilityRow}>
          {abilities.map((ability) => {
            const choice = request?.abilities.find((a) => a.abilityId === ability.id);
            const view = unit.abilities.find((a) => a.id === ability.id);
            const cooldown = view?.cooldown ?? 0;
            const ready = request ? !!choice?.ready : false;
            const numbers = abilityNumbers(ability, skillUpgrades[ability.id] ?? 0);
            const hotkey = ability.slot.replace('a', '');
            return (
              <Tooltip
                key={ability.id}
                content={
                  <div className={styles.tip}>
                    <strong className="display">{translate(ability.name)}</strong>
                    <p>{translate(ability.description, { ...numbers })}</p>
                    {numbers.cooldown > 0 ? (
                      <span className={`num ${styles.tipMeta}`}>
                        {t('champions.abilities.cooldown', { turns: numbers.cooldown })}
                      </span>
                    ) : null}
                  </div>
                }
              >
                <span
                  className={[
                    styles.abilitySlot,
                    selectedAbilityId === ability.id ? styles.abilitySelected : '',
                  ].join(' ')}
                  data-testid={`ability-${ability.slot}`}
                  data-ready={ready ? 'true' : 'false'}
                >
                  <AbilityIcon
                    icon={ability.icon}
                    label={translate(ability.name)}
                    size={96}
                    cooldown={cooldown}
                    disabled={!ready}
                    selected={selectedAbilityId === ability.id}
                    badge={hotkey}
                    onClick={() => onSelect(ability.id)}
                  />
                </span>
              </Tooltip>
            );
          })}
          {def?.passive ? (
            <Tooltip
              content={
                <div className={styles.tip}>
                  <strong className="display">{translate(def.passive.name)}</strong>
                  <p>{translate(def.passive.description, { ...passiveNumbers(def.passive.effects) })}</p>
                </div>
              }
            >
              <span className={styles.abilitySlot} data-testid="ability-passive">
                <AbilityIcon
                  icon={def.passive.icon}
                  label={translate(def.passive.name)}
                  size={72}
                  passive
                  badge="P"
                />
              </span>
            </Tooltip>
          ) : null}
        </div>
      </div>
    </div>
  );
}
