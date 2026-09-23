import type { ReactElement } from 'react';
import type { ChampionDef } from '@content/champions/types';
import { abilityNumbers, passiveNumbers } from '@engine/champions/describe';
import type { ChampionInstance } from '@engine/champions/instance';
import { t, translate } from '@i18n/index';
import { AbilityIcon } from '@ui/components/AbilityIcon/AbilityIcon';
import { Tooltip } from '@ui/components/Tooltip/Tooltip';
import styles from './KitStrip.module.css';

/** An icon's side on the strip, in stage pixels. */
const ICON = 64;
/** The tooltip is a paragraph of rules text; wider than the default, so it is not a column. */
const TIP_WIDTH = 380;

interface KitEntryProps {
  /** The chip under the icon and at the head of its tooltip: A1–A4, Passive, Aura. */
  tag: string;
  name: string;
  /** Cooldown for an active ability; nothing for a passive or an aura. */
  meta: string | null;
  body: string;
  testId: string;
  children: ReactElement<{ 'aria-describedby'?: string | undefined }>;
}

function KitEntry({ tag, name, meta, body, testId, children }: KitEntryProps) {
  return (
    <div className={styles.entry} data-testid={testId}>
      <Tooltip
        maxWidth={TIP_WIDTH}
        content={
          <div className={styles.tip}>
            <div className={styles.tipHead}>
              <span className={`num ${styles.tipTag}`}>{tag}</span>
              <span className={`display ${styles.tipName}`}>{name}</span>
            </div>
            {meta ? <span className={`num ${styles.tipMeta}`}>{meta}</span> : null}
            <p className={styles.tipBody}>{body}</p>
            <span className={styles.tipMore}>{t('champions.kit.more')}</span>
          </div>
        }
      >
        {children}
      </Tooltip>
      <span className={`num ${styles.tag}`} aria-hidden="true">
        {tag}
      </span>
    </div>
  );
}

export interface KitStripProps {
  def: ChampionDef;
  instance: ChampionInstance;
  /** Opens the Abilities tab, where every ability is read in full. */
  onOpen: () => void;
  className?: string | undefined;
}

/**
 * The champion's kit at a glance under the portrait (docs/tech/UI_DESIGN.md §5.3): A1–A4, then the
 * passive and the aura past a rule. Each says what it does on hover — with its live numbers, the
 * upgrades taken counted — and a press opens the Abilities tab for the whole of it.
 */
export function KitStrip({ def, instance, onOpen, className }: KitStripProps) {
  return (
    <div
      className={[styles.strip, className ?? ''].join(' ')}
      role="group"
      aria-label={t('champions.tab.abilities')}
      data-testid="hero-kit"
    >
      {def.abilities.map((ability) => {
        const numbers = abilityNumbers(ability, instance.skillUpgrades[ability.id] ?? 0);
        const name = translate(ability.name);
        return (
          <KitEntry
            key={ability.id}
            tag={ability.slot.toUpperCase()}
            name={name}
            meta={
              numbers.cooldown > 0
                ? t('champions.abilities.cooldown', { turns: numbers.cooldown })
                : t('champions.abilities.noCooldown')
            }
            body={translate(ability.description, { ...numbers })}
            testId={`hero-kit-${ability.slot}`}
          >
            <span className={styles.socket}>
              <AbilityIcon icon={ability.icon} label={name} size={ICON} inspect onClick={onOpen} />
            </span>
          </KitEntry>
        );
      })}
      {def.passive || def.aura ? <span className={styles.rule} aria-hidden="true" /> : null}
      {def.passive ? (
        <KitEntry
          tag={t('champions.abilities.passive')}
          name={translate(def.passive.name)}
          meta={null}
          body={translate(def.passive.description, { ...passiveNumbers(def.passive.effects) })}
          testId="hero-kit-passive"
        >
          <span className={styles.socket}>
            <AbilityIcon
              icon={def.passive.icon}
              label={translate(def.passive.name)}
              size={ICON}
              passive
              inspect
              onClick={onOpen}
            />
          </span>
        </KitEntry>
      ) : null}
      {def.aura ? (
        <KitEntry
          tag={t('champions.abilities.aura')}
          name={translate(def.aura.name)}
          meta={null}
          body={translate(def.aura.description, { ...passiveNumbers(def.aura.effects) })}
          testId="hero-kit-aura"
        >
          <span className={styles.socket}>
            <AbilityIcon
              icon={def.aura.icon}
              label={translate(def.aura.name)}
              size={ICON}
              passive
              inspect
              onClick={onOpen}
            />
          </span>
        </KitEntry>
      ) : null}
    </div>
  );
}
