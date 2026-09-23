import { CURRENCY_BY_ID } from '@content/currencies/index';
import type { ChampionDef } from '@content/champions/types';
import { abilityNumbers } from '@engine/champions/describe';
import type { ChampionInstance } from '@engine/champions/instance';
import { skillStatuses } from '@engine/progression/tavern-skills';
import { t, translate, type I18nKey } from '@i18n/index';
import { AbilityIcon } from '@ui/components/AbilityIcon/AbilityIcon';
import { TintedIcon } from '@ui/components/AssetImage/TintedIcon';
import { Button } from '@ui/components/Button/Button';
import { Tooltip } from '@ui/components/Tooltip/Tooltip';
import { upgradeLabel } from './tavern-view';
import styles from './TavernPanel.module.css';

export interface SkillsTrackProps {
  def: ChampionDef;
  instance: ChampionInstance;
  tomesHeld: number;
  onUpgradeSkill: (abilityId: string) => void;
}

/**
 * The Upgrade Skills track (docs/tech/UI_DESIGN.md §5.5): the tome this champion reads and how many
 * are held, then each ability with what it does now, the steps taken, what the next one adds and
 * the press that spends one tome on it — so a tome is never spent blind. A long text is clamped in
 * the row and whole on the icon's tooltip.
 */
export function SkillsTrack({ def, instance, tomesHeld, onUpgradeSkill }: SkillsTrackProps) {
  const statuses = skillStatuses(def, instance);
  const tome = statuses[0]?.tome ?? null;
  const tomeDef = tome ? CURRENCY_BY_ID[tome] : null;
  return (
    <div className={styles.track} data-testid="tavern-skills">
      <p className={styles.hint}>{t('tavern.tab.skills.hint')}</p>
      {tomeDef && tome ? (
        <div className={styles.tome}>
          <TintedIcon asset={tomeDef.icon} tint={tomeDef.tint} size={44} />
          <span className={`num ${styles.tomeLine}`} data-testid="tavern-tomes">
            {t('tavern.skills.tome', { tome: translate(tomeDef.name), count: tomesHeld })}
          </span>
        </div>
      ) : (
        <p className={styles.warn}>
          {t('tavern.skills.none', { rarity: t(`rarity.${def.rarity}` as I18nKey) })}
        </p>
      )}
      <div className={styles.skills}>
        {statuses.map((status) => {
          const ability = def.abilities.find((a) => a.id === status.abilityId);
          if (!ability) return null;
          const name = translate(ability.name);
          const numbers = abilityNumbers(ability, status.steps);
          return (
            <div key={status.abilityId} className={styles.skill} data-testid={`skill-${status.abilityId}`}>
              <Tooltip
                content={
                  <span className={styles.skillTip}>
                    <strong className="display">{name}</strong>
                    <span>{translate(ability.description, { ...numbers })}</span>
                  </span>
                }
                maxWidth={380}
              >
                <span className={styles.skillIcon}>
                  <AbilityIcon icon={ability.icon} label={name} size={56} />
                </span>
              </Tooltip>
              <span className={styles.skillText}>
                <strong className="display">
                  <span className={styles.slot}>{ability.slot.toUpperCase()}</span> {name}
                </strong>
                <span className={styles.skillBody}>{translate(ability.description, { ...numbers })}</span>
                <span className={styles.skillStep}>
                  <span className={styles.dots} aria-hidden="true">
                    {Array.from({ length: status.max }, (_, i) => (
                      <span key={i} className={i < status.steps ? styles.dotOn : styles.dot} />
                    ))}
                  </span>
                  <em>
                    {status.next
                      ? t('tavern.skills.next', { effect: upgradeLabel(status.next) })
                      : t('tavern.skills.maxed')}
                  </em>
                  <Button
                    size="sm"
                    variant="primary"
                    className={styles.skillPress}
                    disabled={!status.next || !status.tome || tomesHeld < 1}
                    onClick={() => onUpgradeSkill(status.abilityId)}
                    data-testid={`skill-upgrade-${status.abilityId}`}
                    icon={
                      tomeDef ? <TintedIcon asset={tomeDef.icon} tint={tomeDef.tint} size={20} /> : undefined
                    }
                  >
                    {t('tavern.upgrade')}
                  </Button>
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
