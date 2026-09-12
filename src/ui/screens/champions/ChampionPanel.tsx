import {
  GEAR_SLOTS,
  STAT_IDS,
  type AbilityDef,
  type ChampionDef,
  type StatId,
} from '@content/champions/types';
import { unlockLevel } from '@engine/progression/unlocks';
import { abilityNumbers, passiveNumbers } from '@engine/champions/describe';
import type { ChampionInstance } from '@engine/champions/instance';
import type { RosterEntry } from '@engine/champions/query';
import { baseStats, levelCap } from '@engine/champions/stats';
import { canLevel, championXpToNext } from '@engine/champions/xp';
import { t, translate, type I18nKey } from '@i18n/index';
import type { ChampionTab } from '@state/ui-types';
import { AbilityIcon } from '@ui/components/AbilityIcon/AbilityIcon';
import { Bar } from '@ui/components/Bar/Bar';
import { Button } from '@ui/components/Button/Button';
import { Divider } from '@ui/components/Divider/Divider';
import { Panel } from '@ui/components/Frame/Panel';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { ScrollArea } from '@ui/components/ScrollArea/ScrollArea';
import { Slot } from '@ui/components/Slot/Slot';
import { Tabs } from '@ui/components/Tab/Tabs';
import { SLOT_GLYPH } from '@ui/styles/display-maps';
import styles from './ChampionPanel.module.css';

const TABS: readonly ChampionTab[] = ['info', 'abilities', 'lore', 'gear'];

export interface ChampionPanelProps {
  entry: RosterEntry;
  copies: number;
  tab: ChampionTab;
  onTab: (tab: ChampionTab) => void;
  onLock: (locked: boolean) => void;
  onFavourite: (favourite: boolean) => void;
  onTavern: () => void;
}

/** Right column: Info / Abilities / Lore / Gear tabs and the lock, favourite and Tavern actions. */
export function ChampionPanel({
  entry,
  copies,
  tab,
  onTab,
  onLock,
  onFavourite,
  onTavern,
}: ChampionPanelProps) {
  const { def, instance } = entry;
  return (
    <aside className={styles.panel} data-testid="champion-panel">
      <Tabs<ChampionTab>
        items={TABS.map((key) => ({
          key,
          label: t(`champions.tab.${key}` as I18nKey),
          testId: `tab-${key}`,
        }))}
        value={tab}
        onChange={onTab}
      />
      <Panel kind="stone" className={styles.body} padding={22}>
        <ScrollArea height={560}>
          {tab === 'info' ? <InfoTab entry={entry} /> : null}
          {tab === 'abilities' ? <AbilitiesTab def={def} instance={instance} /> : null}
          {tab === 'lore' ? <LoreTab def={def} instance={instance} copies={copies} /> : null}
          {tab === 'gear' ? <GearTab /> : null}
        </ScrollArea>
      </Panel>
      <div className={styles.actions}>
        <Button
          variant={instance.locked ? 'primary' : 'secondary'}
          size="sm"
          icon={<Glyph glyph="glyph.broken_shackle" size={20} color="currentColor" />}
          onClick={() => onLock(!instance.locked)}
          data-testid="champion-lock"
          aria-pressed={instance.locked}
        >
          {instance.locked ? t('champions.unlock') : t('champions.lock')}
        </Button>
        <Button
          variant={instance.favourite ? 'primary' : 'secondary'}
          size="sm"
          icon={<Glyph glyph="glyph.health_potion" size={20} color="currentColor" />}
          onClick={() => onFavourite(!instance.favourite)}
          data-testid="champion-favourite"
          aria-pressed={instance.favourite}
        >
          {instance.favourite ? t('champions.unfavourite') : t('champions.favourite')}
        </Button>
        <Button variant="secondary" size="sm" onClick={onTavern} data-testid="champion-tavern">
          {t('champions.tavern')}
        </Button>
      </div>
    </aside>
  );
}

function InfoTab({ entry }: { entry: RosterEntry }) {
  const { def, instance } = entry;
  const stats = baseStats(def.stats, instance.stars, instance.level);
  const cap = levelCap(instance.stars);
  const next = championXpToNext(instance.level);
  return (
    <div data-testid="panel-info">
      <div className={styles.powerRow}>
        <span className={`display ${styles.powerLabel}`}>{t('champions.power')}</span>
        <span className={`num ${styles.power}`} data-testid="champion-power">
          {entry.power.toLocaleString('en-US')}
        </span>
      </div>
      <div className={styles.xpRow}>
        <span className={styles.xpLabel}>
          {canLevel(instance.level, instance.stars)
            ? t('champions.xp', { xp: instance.xp, next })
            : t('champions.xpMax')}
        </span>
        <Bar
          value={canLevel(instance.level, instance.stars) ? instance.xp : 1}
          max={canLevel(instance.level, instance.stars) ? next : 1}
          kind="xp"
          height={18}
          width="100%"
          label={t('champions.level', { level: instance.level, cap })}
        />
      </div>
      <Divider kind="deco" index={2} width="100%" />
      <dl className={styles.stats} data-testid="champion-stats">
        {STAT_IDS.map((stat: StatId) => (
          <div key={stat} className={styles.statRow}>
            <dt className={styles.statLabel}>{t(`champions.stat.${stat}` as I18nKey)}</dt>
            <dd className={`num ${styles.statValue}`} data-testid={`stat-${stat}`}>
              {formatStat(stat, stats[stat])}
            </dd>
            <dd className={`num ${styles.statBonus}`} aria-hidden="true">
              +0
            </dd>
          </div>
        ))}
      </dl>
      <p className={styles.hint}>{t('champions.stat.gearHint')}</p>
    </div>
  );
}

function formatStat(stat: StatId, value: number): string {
  if (stat === 'critRate' || stat === 'critDmg') return `${value}%`;
  return value.toLocaleString('en-US');
}

function AbilitiesTab({ def, instance }: { def: ChampionDef; instance: ChampionInstance }) {
  return (
    <div className={styles.abilities} data-testid="panel-abilities">
      {def.abilities.map((ability) => (
        <AbilityRow key={ability.id} ability={ability} steps={instance.skillUpgrades[ability.id] ?? 0} />
      ))}
      {def.passive ? (
        <div className={styles.ability} data-testid={`ability-${def.passive.id}`}>
          <AbilityIcon icon={def.passive.icon} label={translate(def.passive.name)} size={64} passive />
          <div className={styles.abilityText}>
            <div className={styles.abilityHead}>
              <span className={`display ${styles.abilityName}`}>{translate(def.passive.name)}</span>
              <span className={styles.tag}>{t('champions.abilities.passive')}</span>
            </div>
            <p className={styles.abilityBody}>
              {translate(def.passive.description, { ...passiveNumbers(def.passive.effects) })}
            </p>
          </div>
        </div>
      ) : null}
      {def.aura ? (
        <div className={styles.ability} data-testid={`ability-${def.aura.id}`}>
          <AbilityIcon icon={def.aura.icon} label={translate(def.aura.name)} size={64} passive />
          <div className={styles.abilityText}>
            <div className={styles.abilityHead}>
              <span className={`display ${styles.abilityName}`}>{translate(def.aura.name)}</span>
              <span className={styles.tag}>{t('champions.abilities.aura')}</span>
            </div>
            <p className={styles.abilityBody}>
              {translate(def.aura.description, { ...passiveNumbers(def.aura.effects) })}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AbilityRow({ ability, steps }: { ability: AbilityDef; steps: number }) {
  const numbers = abilityNumbers(ability, steps);
  const total = ability.upgrades.length;
  return (
    <div className={styles.ability} data-testid={`ability-${ability.id}`}>
      <AbilityIcon
        icon={ability.icon}
        label={translate(ability.name)}
        size={64}
        hotkey={ability.slot.toUpperCase()}
      />
      <div className={styles.abilityText}>
        <div className={styles.abilityHead}>
          <span className={`display ${styles.abilityName}`}>{translate(ability.name)}</span>
          <span className={`num ${styles.cooldown}`}>
            {numbers.cooldown > 0
              ? t('champions.abilities.cooldown', { turns: numbers.cooldown })
              : t('champions.abilities.noCooldown')}
          </span>
        </div>
        <p className={styles.abilityBody} data-testid={`ability-text-${ability.slot}`}>
          {translate(ability.description, { ...numbers })}
        </p>
        <div
          className={styles.upgrades}
          aria-label={
            total
              ? t('champions.abilities.upgrades', { done: steps, total })
              : t('champions.abilities.noUpgrades')
          }
        >
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className={[styles.pip, i < steps ? styles.pipOn : ''].join(' ')} />
          ))}
          {total === 0 ? <span className={styles.hint}>{t('champions.abilities.noUpgrades')}</span> : null}
        </div>
      </div>
    </div>
  );
}

function LoreTab({
  def,
  instance,
  copies,
}: {
  def: ChampionDef;
  instance: ChampionInstance;
  copies: number;
}) {
  return (
    <div data-testid="panel-lore">
      <p className={styles.lore}>{translate(def.lore)}</p>
      <Divider kind="deco" index={4} width="100%" />
      <p className={styles.meta}>
        <span className={styles.metaLabel}>{t('champions.obtain')}</span>{' '}
        {def.obtain.map((source) => t(`champions.obtain.${source}` as I18nKey)).join(', ')}
      </p>
      <p className={styles.meta}>
        {t('champions.acquired', { date: new Date(instance.acquiredAt).toLocaleDateString() })}
      </p>
      <p className={styles.meta}>{t('champions.copies', { count: copies })}</p>
      {def.art.placeholder ? <p className={styles.hint}>{t('champions.placeholder.hint')}</p> : null}
    </div>
  );
}

function GearTab() {
  return (
    <div data-testid="panel-gear">
      <div className={styles.slots}>
        {GEAR_SLOTS.map((slot) => (
          <Slot
            key={slot}
            size="md"
            locked
            emptyGlyph={SLOT_GLYPH[slot]}
            label={t(`champions.gear.slot.${slot}` as I18nKey)}
          />
        ))}
      </div>
      <p className={styles.hint}>{t('champions.gear.locked', { level: unlockLevel('gear') })}</p>
    </div>
  );
}
