import { useMemo, useState } from 'react';
import { ELEMENTS, RARITIES, ROLES, STAT_IDS } from '@content/champions/types';
import type { AbilityDef, ChampionDef, Element, Rarity, Role, StatId } from '@content/champions/types';
import { abilityNumbers, passiveNumbers } from '@engine/champions/describe';
import { baseStars, maxStars } from '@engine/champions/stats';
import { t, translate, type I18nKey } from '@i18n/index';
import { championAvatar } from '@ui/champions/art';
import { AbilityIcon } from '@ui/components/AbilityIcon/AbilityIcon';
import { ChampionCard } from '@ui/components/ChampionCard/ChampionCard';
import { Divider } from '@ui/components/Divider/Divider';
import { Dropdown } from '@ui/components/Dropdown/Dropdown';
import { Panel } from '@ui/components/Frame/Panel';
import { ScrollArea } from '@ui/components/ScrollArea/ScrollArea';
import { StarRow } from '@ui/components/StarRow/StarRow';
import { Toggle } from '@ui/components/Toggle/Toggle';
import { elementLabel, rarityLabel, roleLabel } from '@ui/screens/champions/roster-view';
import { ELEMENT_COLOR, RARITY_COLOR } from '@ui/styles/display-maps';
import {
  championSections,
  filterChampions,
  NO_FILTERS,
  type IndexChampion,
  type IndexFilters,
} from './index-view';
import styles from './IndexScreen.module.css';

const CARD = 128;

/** Every champion in the game, found or not, with the one selected opened beside the grid. */
export function ChampionsTab({ entries }: { entries: readonly IndexChampion[] }) {
  const [filters, setFilters] = useState<IndexFilters>(NO_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const shown = useMemo(() => filterChampions(entries, filters), [entries, filters]);
  const sections = useMemo(() => championSections(shown), [shown]);
  const selected = shown.find((e) => e.def.id === selectedId) ?? shown[0] ?? null;

  return (
    <div className={styles.split}>
      <section className={styles.listSide}>
        <div className={styles.filters} data-testid="index-filters">
          <Dropdown<Rarity | 'all'>
            label={t('champions.filter.rarity')}
            value={filters.rarity ?? 'all'}
            onChange={(v) => setFilters((f) => ({ ...f, rarity: v === 'all' ? null : v }))}
            options={[
              { value: 'all', label: t('index.filter.any') },
              ...RARITIES.map((rarity) => ({ value: rarity, label: rarityLabel(rarity) })),
            ]}
          />
          <Dropdown<Element | 'all'>
            label={t('champions.filter.element')}
            value={filters.element ?? 'all'}
            onChange={(v) => setFilters((f) => ({ ...f, element: v === 'all' ? null : v }))}
            options={[
              { value: 'all', label: t('index.filter.any') },
              ...ELEMENTS.map((element) => ({ value: element, label: elementLabel(element) })),
            ]}
          />
          <Dropdown<Role | 'all'>
            label={t('champions.filter.role')}
            value={filters.role ?? 'all'}
            onChange={(v) => setFilters((f) => ({ ...f, role: v === 'all' ? null : v }))}
            options={[
              { value: 'all', label: t('index.filter.any') },
              ...ROLES.map((role) => ({ value: role, label: roleLabel(role) })),
            ]}
          />
          <Toggle
            label={t('index.filter.foundOnly')}
            checked={filters.foundOnly}
            onChange={(foundOnly) => setFilters((f) => ({ ...f, foundOnly }))}
          />
        </div>

        <ScrollArea height="100%" className={styles.gridScroll ?? ''}>
          {sections.length === 0 ? (
            <p className={styles.hint} data-testid="index-empty">
              {t('index.empty')}
            </p>
          ) : null}
          {sections.map((section) => (
            <section key={section.element} className={styles.elementSection}>
              <h3
                className={`display ${styles.elementHead}`}
                style={{ color: ELEMENT_COLOR[section.element] }}
                data-testid={`index-element-${section.element}`}
              >
                {elementLabel(section.element)}
              </h3>
              {section.groups.map((group) => (
                <div key={group.role} className={styles.roleGroup}>
                  <h4 className={styles.roleHead} data-testid={`index-role-${section.element}-${group.role}`}>
                    {roleLabel(group.role)}
                  </h4>
                  <div className={styles.cardRow}>
                    {group.entries.map((entry) => (
                      <ChampionCard
                        key={entry.def.id}
                        name={translate(entry.def.name)}
                        rarity={entry.def.rarity}
                        element={entry.def.element}
                        role={entry.def.role}
                        stars={baseStars(entry.def.rarity)}
                        level={1}
                        avatar={entry.def.art.avatar}
                        size={CARD}
                        compact
                        dimmed={!entry.found}
                        tint={entry.def.art.tint}
                        placeholder={entry.def.art.placeholder}
                        placeholderLabel={t('champions.placeholder')}
                        badge={entry.copies > 1 ? `×${entry.copies}` : null}
                        selected={selected?.def.id === entry.def.id}
                        onClick={() => setSelectedId(entry.def.id)}
                        testId={`index-card-${entry.def.id}`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </section>
          ))}
        </ScrollArea>
      </section>

      {selected ? <ChampionPage entry={selected} /> : null}
    </div>
  );
}

/** The right-hand page: who they are, what they can do, and where they come from. */
function ChampionPage({ entry }: { entry: IndexChampion }) {
  const { def, copies, found } = entry;
  const art = championAvatar(def, 512);
  return (
    <Panel
      kind="stone"
      padding={20}
      className={styles.page}
      contentClassName={styles.pageBody}
      data-testid="index-page"
    >
      <ScrollArea height="100%">
        <header className={styles.pageHead}>
          <div
            className={styles.portrait}
            style={{ backgroundImage: `url("${art.url}")`, borderColor: RARITY_COLOR[def.rarity] }}
          >
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
          <div className={styles.pageTitle}>
            <h2 className="display" style={{ color: RARITY_COLOR[def.rarity] }}>
              {translate(def.name)}
            </h2>
            <StarRow stars={baseStars(def.rarity)} max={maxStars(def.rarity)} size={20} tone="rarity" />
            <p className={styles.pageMeta}>
              {rarityLabel(def.rarity)} ·{' '}
              <span style={{ color: ELEMENT_COLOR[def.element] }}>{elementLabel(def.element)}</span> ·{' '}
              {roleLabel(def.role)}
            </p>
            <p className={styles.found} data-testid="index-page-found">
              {found ? t('index.page.found', { count: copies }) : t('index.page.unfound')}
            </p>
          </div>
        </header>

        <Divider kind="deco" index={2} width="100%" />

        <h3 className={`display ${styles.section}`}>{t('index.page.stats')}</h3>
        <p className={styles.hint}>{t('index.page.statsHint')}</p>
        <dl className={styles.stats}>
          {STAT_IDS.map((stat) => (
            <div key={stat} className={styles.stat}>
              <dt>{t(`champions.stat.${stat}` as I18nKey)}</dt>
              <dd className="num">{statValue(def, stat)}</dd>
            </div>
          ))}
        </dl>

        <h3 className={`display ${styles.section}`}>{t('champions.tab.abilities')}</h3>
        {def.abilities.map((ability) => (
          <Ability key={ability.id} ability={ability} />
        ))}
        {def.passive ? (
          <div className={styles.ability}>
            <AbilityIcon icon={def.passive.icon} label={translate(def.passive.name)} size={56} passive />
            <div>
              <div className={styles.abilityHead}>
                <span className={`display ${styles.abilityName}`}>{translate(def.passive.name)}</span>
                <span className={styles.tag}>{t('champions.abilities.passive')}</span>
              </div>
              <p className={styles.abilityText}>
                {translate(def.passive.description, { ...passiveNumbers(def.passive.effects) })}
              </p>
            </div>
          </div>
        ) : null}
        {def.aura ? (
          <div className={styles.ability}>
            <AbilityIcon icon={def.aura.icon} label={translate(def.aura.name)} size={56} passive />
            <div>
              <div className={styles.abilityHead}>
                <span className={`display ${styles.abilityName}`}>{translate(def.aura.name)}</span>
                <span className={styles.tag}>{t('champions.abilities.aura')}</span>
              </div>
              <p className={styles.abilityText}>{translate(def.aura.description)}</p>
            </div>
          </div>
        ) : null}

        <h3 className={`display ${styles.section}`}>{t('champions.tab.lore')}</h3>
        <p className={styles.lore}>{translate(def.lore)}</p>
        <p className={styles.obtain}>
          {t('champions.obtain')}:{' '}
          {def.obtain.map((source) => t(`champions.obtain.${source}` as I18nKey)).join(', ')}
        </p>
      </ScrollArea>
    </Panel>
  );
}

function Ability({ ability }: { ability: AbilityDef }) {
  const numbers = abilityNumbers(ability, 0);
  return (
    <div className={styles.ability} data-testid={`index-ability-${ability.id}`}>
      <AbilityIcon icon={ability.icon} label={translate(ability.name)} size={56} />
      <div>
        <div className={styles.abilityHead}>
          <span className={`num ${styles.slotTag}`}>{ability.slot.toUpperCase()}</span>
          <span className={`display ${styles.abilityName}`}>{translate(ability.name)}</span>
          <span className={`num ${styles.tag}`}>
            {numbers.cooldown > 0
              ? t('champions.abilities.cooldown', { turns: numbers.cooldown })
              : t('champions.abilities.noCooldown')}
          </span>
        </div>
        <p className={styles.abilityText}>{translate(ability.description, { ...numbers })}</p>
      </div>
    </div>
  );
}

/** Authored stats are 6★ level 60 (CHAMPIONS.md §2); percentages print with their sign. */
function statValue(def: ChampionDef, stat: StatId): string {
  const value = def.stats[stat];
  return stat === 'critRate' || stat === 'critDmg' || stat === 'res' || stat === 'acc'
    ? `${value} %`
    : value.toLocaleString('en-US');
}
