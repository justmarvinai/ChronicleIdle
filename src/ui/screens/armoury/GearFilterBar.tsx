import { GEAR_SLOTS, RARITIES, type GearSlot, type Rarity } from '@content/champions/types';
import { GEAR_MAX_STARS } from '@content/balance/gear';
import { content } from '@content/registry';
import { playSfx } from '@audio/index';
import { GEAR_SORTS, type GearSort, type GearView } from '@engine/gear/query';
import { t, translate, type I18nKey } from '@i18n/index';
import { Dropdown } from '@ui/components/Dropdown/Dropdown';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { RARITY_COLOR, SLOT_GLYPH } from '@ui/styles/display-maps';
import { kitBorder } from '@ui/styles/kit';
import { slotLabel } from '@ui/gear/gear-view';
import styles from './GearFilterBar.module.css';

export interface GearFilterBarProps {
  view: GearView;
  onChange: (patch: Partial<GearView>) => void;
  shown: number;
  total: number;
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/**
 * Sort, direction, and the filters GEAR.md §7 asks for: slot, rarity, set, stars, locked.
 *
 * There is no worn/spare toggle: since worn pieces left the racks (the owner's first batch) it
 * could only ever have emptied them.
 */
export function GearFilterBar({ view, onChange, shown, total }: GearFilterBarProps) {
  const { filters } = view;
  const setFilters = (patch: Partial<GearView['filters']>): void =>
    onChange({ filters: { ...filters, ...patch } });
  const active =
    filters.slots.length +
    filters.rarities.length +
    filters.sets.length +
    (filters.minStars > 0 ? 1 : 0) +
    (filters.locked !== null ? 1 : 0);
  return (
    <div className={styles.bar} data-testid="gear-filters">
      <div className={styles.row}>
        <Dropdown<GearSort>
          label={t('armoury.sort')}
          width={172}
          value={view.sort}
          options={GEAR_SORTS.map((sort) => ({
            value: sort,
            label: t(`armoury.sort.${sort}` as I18nKey),
          }))}
          onChange={(sort) => onChange({ sort })}
        />
        <button
          type="button"
          className={styles.direction}
          style={kitBorder('ui.dark_ember.frame_sm_thin', 0.3)}
          aria-label={t('champions.sort.direction')}
          aria-pressed={view.descending}
          data-testid="gear-sort-direction"
          onMouseEnter={() => playSfx('ui.hover')}
          onClick={() => (playSfx('ui.tab'), onChange({ descending: !view.descending }))}
        >
          <span className={`num ${styles.arrow}`}>{view.descending ? '▼' : '▲'}</span>
        </button>
        <Dropdown<string>
          label={t('armoury.filter.set')}
          width={200}
          value={filters.sets[0] ?? ''}
          options={[
            { value: '', label: t('armoury.filter.any') },
            ...content.gearSets.map((set) => ({ value: set.id, label: translate(set.name) })),
          ]}
          onChange={(setId) => setFilters({ sets: setId ? [setId] : [] })}
        />
        <Dropdown<number>
          label={t('armoury.filter.stars')}
          width={150}
          value={filters.minStars}
          options={[
            { value: 0, label: t('armoury.filter.any') },
            ...Array.from({ length: GEAR_MAX_STARS }, (_, i) => ({
              value: i + 1,
              label: t('armoury.filter.stars.min', { stars: i + 1 }),
            })),
          ]}
          onChange={(minStars) => setFilters({ minStars })}
        />
        <span className={`num ${styles.count}`} data-testid="gear-count">
          {t('armoury.count', { shown, total })}
        </span>
      </div>
      <div className={styles.row}>
        <span className={styles.group} role="group" aria-label={t('armoury.filter.slot')}>
          {GEAR_SLOTS.map((slot: GearSlot) => {
            const on = filters.slots.includes(slot);
            return (
              <button
                key={slot}
                type="button"
                className={[styles.chip, on ? styles.on : ''].join(' ')}
                style={{ ['--chip' as string]: 'var(--gold-2)' }}
                aria-pressed={on}
                aria-label={slotLabel(slot)}
                title={slotLabel(slot)}
                data-testid={`gear-filter-slot-${slot}`}
                onMouseEnter={() => playSfx('ui.hover')}
                onClick={() => (playSfx('ui.tab'), setFilters({ slots: toggle(filters.slots, slot) }))}
              >
                <Glyph glyph={SLOT_GLYPH[slot]} size={20} color={on ? 'var(--text-1)' : 'var(--text-3)'} />
              </button>
            );
          })}
        </span>
        <span className={styles.group} role="group" aria-label={t('armoury.filter.rarity')}>
          {RARITIES.map((rarity: Rarity) => {
            const on = filters.rarities.includes(rarity);
            return (
              <button
                key={rarity}
                type="button"
                className={[styles.chip, styles.rarity, on ? styles.on : ''].join(' ')}
                style={{ ['--chip' as string]: RARITY_COLOR[rarity] }}
                aria-pressed={on}
                aria-label={t(`rarity.${rarity}` as I18nKey)}
                title={t(`rarity.${rarity}` as I18nKey)}
                data-testid={`gear-filter-rarity-${rarity}`}
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
          aria-label={t('armoury.filter.locked.yes')}
          data-testid="gear-filter-locked"
          onMouseEnter={() => playSfx('ui.hover')}
          onClick={() => (playSfx('ui.tab'), setFilters({ locked: filters.locked === true ? null : true }))}
        >
          <Glyph glyph="glyph.broken_shackle" size={18} color="currentColor" />
        </button>
        {active > 0 ? (
          <button
            type="button"
            className={styles.clear}
            data-testid="gear-filter-clear"
            onMouseEnter={() => playSfx('ui.hover')}
            onClick={() => (
              playSfx('ui.cancel'),
              setFilters({
                slots: [],
                rarities: [],
                sets: [],
                minStars: 0,
                mainStats: [],
                locked: null,
              })
            )}
          >
            {t('armoury.filter.reset')}
          </button>
        ) : null}
      </div>
    </div>
  );
}
