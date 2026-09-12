import { ELEMENTS, RARITIES, ROLES, type Element, type Rarity, type Role } from '@content/champions/types';
import { playSfx } from '@audio/index';
import { ROSTER_SORTS, type RosterSort, type RosterView } from '@engine/champions/query';
import { t, type I18nKey } from '@i18n/index';
import { Dropdown } from '@ui/components/Dropdown/Dropdown';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { ELEMENT_COLOR, ELEMENT_GLYPH, RARITY_COLOR, ROLE_GLYPH } from '@ui/styles/display-maps';
import { kitBorder } from '@ui/styles/kit';
import { elementLabel, rarityLabel, roleLabel } from './roster-view';
import styles from './FilterBar.module.css';

export interface FilterBarProps {
  view: RosterView;
  onChange: (patch: Partial<RosterView>) => void;
  shown: number;
  total: number;
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/** Sort dropdown, direction, and one-tap filter chips for rarity, element, role, lock and favourite. */
export function FilterBar({ view, onChange, shown, total }: FilterBarProps) {
  const { filters } = view;
  const setFilters = (patch: Partial<RosterView['filters']>): void =>
    onChange({ filters: { ...filters, ...patch } });
  const active =
    filters.rarities.length +
    filters.elements.length +
    filters.roles.length +
    (filters.locked !== null ? 1 : 0) +
    (filters.favourite !== null ? 1 : 0);
  return (
    <div className={styles.bar} data-testid="roster-filters">
      <div className={styles.row}>
        <Dropdown<RosterSort>
          label={t('champions.sort')}
          width={200}
          value={view.sort}
          options={ROSTER_SORTS.map((sort) => ({
            value: sort,
            label: t(`champions.sort.${sort}` as I18nKey),
          }))}
          onChange={(sort) => onChange({ sort })}
        />
        <button
          type="button"
          className={styles.direction}
          style={kitBorder('ui.dark_ember.frame_sm_thin', 0.3)}
          aria-label={t('champions.sort.direction')}
          aria-pressed={view.descending}
          data-testid="roster-sort-direction"
          onMouseEnter={() => playSfx('ui.hover')}
          onClick={() => (playSfx('ui.tab'), onChange({ descending: !view.descending }))}
        >
          <span className={`num ${styles.arrow}`}>{view.descending ? '▼' : '▲'}</span>
        </button>
        <span className={`num ${styles.count}`} data-testid="roster-count">
          {t('champions.count', { shown, total })}
        </span>
      </div>
      <div className={styles.row}>
        <span className={styles.group} role="group" aria-label={t('champions.filter.element')}>
          {ELEMENTS.map((element: Element) => {
            const on = filters.elements.includes(element);
            return (
              <button
                key={element}
                type="button"
                className={[styles.chip, on ? styles.on : ''].join(' ')}
                style={{ ['--chip' as string]: ELEMENT_COLOR[element] }}
                aria-pressed={on}
                aria-label={elementLabel(element)}
                title={elementLabel(element)}
                data-testid={`filter-element-${element}`}
                onMouseEnter={() => playSfx('ui.hover')}
                onClick={() => (
                  playSfx('ui.tab'),
                  setFilters({ elements: toggle(filters.elements, element) })
                )}
              >
                <Glyph
                  glyph={ELEMENT_GLYPH[element]}
                  size={20}
                  color={on ? 'var(--text-1)' : 'var(--text-3)'}
                />
              </button>
            );
          })}
        </span>
        <span className={styles.group} role="group" aria-label={t('champions.filter.role')}>
          {ROLES.map((role: Role) => {
            const on = filters.roles.includes(role);
            return (
              <button
                key={role}
                type="button"
                className={[styles.chip, on ? styles.on : ''].join(' ')}
                style={{ ['--chip' as string]: 'var(--gold-2)' }}
                aria-pressed={on}
                aria-label={roleLabel(role)}
                title={roleLabel(role)}
                data-testid={`filter-role-${role}`}
                onMouseEnter={() => playSfx('ui.hover')}
                onClick={() => (playSfx('ui.tab'), setFilters({ roles: toggle(filters.roles, role) }))}
              >
                <Glyph glyph={ROLE_GLYPH[role]} size={20} color={on ? 'var(--text-1)' : 'var(--text-3)'} />
              </button>
            );
          })}
        </span>
      </div>
      <div className={styles.row}>
        <span className={styles.group} role="group" aria-label={t('champions.filter.rarity')}>
          {RARITIES.map((rarity: Rarity) => {
            const on = filters.rarities.includes(rarity);
            return (
              <button
                key={rarity}
                type="button"
                className={[styles.chip, styles.rarity, on ? styles.on : ''].join(' ')}
                style={{ ['--chip' as string]: RARITY_COLOR[rarity] }}
                aria-pressed={on}
                aria-label={rarityLabel(rarity)}
                title={rarityLabel(rarity)}
                data-testid={`filter-rarity-${rarity}`}
                onMouseEnter={() => playSfx('ui.hover')}
                onClick={() => (
                  playSfx('ui.tab'),
                  setFilters({ rarities: toggle(filters.rarities, rarity) })
                )}
              >
                <span className={styles.dot} />
              </button>
            );
          })}
        </span>
        <button
          type="button"
          className={[styles.chip, styles.text, filters.locked === true ? styles.on : ''].join(' ')}
          style={{ ['--chip' as string]: 'var(--gold-2)' }}
          aria-pressed={filters.locked === true}
          data-testid="filter-locked"
          onMouseEnter={() => playSfx('ui.hover')}
          onClick={() => (playSfx('ui.tab'), setFilters({ locked: filters.locked === true ? null : true }))}
        >
          <Glyph glyph="glyph.broken_shackle" size={18} color="currentColor" />
        </button>
        <button
          type="button"
          className={[styles.chip, styles.text, filters.favourite === true ? styles.on : ''].join(' ')}
          style={{ ['--chip' as string]: '#ff6b8a' }}
          aria-pressed={filters.favourite === true}
          data-testid="filter-favourite"
          onMouseEnter={() => playSfx('ui.hover')}
          onClick={() => (
            playSfx('ui.tab'),
            setFilters({ favourite: filters.favourite === true ? null : true })
          )}
        >
          <Glyph glyph="glyph.health_potion" size={18} color="currentColor" />
        </button>
        {active > 0 ? (
          <button
            type="button"
            className={styles.clear}
            data-testid="filter-clear"
            onMouseEnter={() => playSfx('ui.hover')}
            onClick={() => (
              playSfx('ui.cancel'),
              setFilters({ rarities: [], elements: [], roles: [], locked: null, favourite: null })
            )}
          >
            {t('champions.filter.clear')}
          </button>
        ) : null}
      </div>
    </div>
  );
}
