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
}

/** Bottom-right ability bar (UI_DESIGN.md §5.9): portrait, A1–A4 with cooldowns, passive tag. */
export function AbilityBar({ unit, request, selectedAbilityId, onSelect }: AbilityBarProps) {
  if (!unit) return null;
  const def = unit.side === 'ally' ? content.championById(unit.defId as ChampionId) : undefined;
  const enemyDef = unit.side === 'enemy' ? content.enemyById(unit.defId) : undefined;
  const abilities = def?.abilities ?? enemyDef?.abilities ?? [];
  const art = def ? championAvatar(def, 128) : null;
  const upgrades = 0;
  return (
    <div className={styles.abilityBar} data-testid="ability-bar">
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
          const numbers = abilityNumbers(ability, upgrades);
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
                  hotkey={hotkey}
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
              <AbilityIcon icon={def.passive.icon} label={translate(def.passive.name)} size={72} passive />
            </span>
          </Tooltip>
        ) : null}
      </div>
    </div>
  );
}
