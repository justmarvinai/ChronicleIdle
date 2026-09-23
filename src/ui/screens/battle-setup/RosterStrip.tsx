import { useCallback, useMemo, useState } from 'react';
import { playSfx } from '@audio/index';
import { ELEMENTS, ROLES, type Element, type Role } from '@content/champions/types';
import { DEFAULT_ROSTER_VIEW, sortAndFilter, type RosterEntry } from '@engine/champions/query';
import { t } from '@i18n/index';
import { ChampionCard } from '@ui/components/ChampionCard/ChampionCard';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { VirtualGrid } from '@ui/components/VirtualGrid/VirtualGrid';
import { elementLabel, roleLabel } from '@ui/screens/champions/roster-view';
import { ELEMENT_COLOR, ELEMENT_GLYPH, ROLE_GLYPH } from '@ui/styles/display-maps';
import styles from './RosterStrip.module.css';

/** The strip's cards, in stage pixels: two full rows fit the strip's height. */
const CARD = 96;
const CARD_HEIGHT = Math.round(CARD * 1.28);
const GAP = 10;
const COLUMNS = 13;
const GRID_HEIGHT = 2 * CARD_HEIGHT + GAP + 4;

export interface RosterStripProps {
  entries: readonly RosterEntry[];
  team: readonly string[];
  onPick: (instanceId: string) => void;
}

function toggle<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/**
 * Every champion the chronicle holds, strongest first (docs/tech/UI_DESIGN.md §5.8), narrowed by
 * element and role with one press each. A seated champion is dimmed and carries the number of
 * their seat, so the strip and the seats above it always agree about who is where.
 */
export function RosterStrip({ entries, team, onPick }: RosterStripProps) {
  const [elements, setElements] = useState<Element[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const shown = useMemo(
    () =>
      sortAndFilter(entries, {
        ...DEFAULT_ROSTER_VIEW,
        sort: 'power',
        descending: true,
        filters: { ...DEFAULT_ROSTER_VIEW.filters, elements, roles },
      }),
    [entries, elements, roles],
  );
  const pick = useCallback((id: string) => onPick(id), [onPick]);

  return (
    <section className={styles.strip} aria-label={t('battleSetup.roster')} data-testid="setup-roster">
      <header className={styles.head}>
        <h2 className={`display ${styles.title}`}>{t('battleSetup.roster')}</h2>
        <span className={`num ${styles.count}`}>
          {t('champions.count', { shown: shown.length, total: entries.length })}
        </span>
        <span className={styles.hint}>{t('battleSetup.slotsHint')}</span>
        <span className={styles.filters}>
          <span className={styles.group} role="group" aria-label={t('champions.filter.element')}>
            {ELEMENTS.map((element) => {
              const on = elements.includes(element);
              return (
                <button
                  key={element}
                  type="button"
                  className={[styles.chip, on ? styles.on : ''].join(' ')}
                  style={{ ['--chip' as string]: ELEMENT_COLOR[element] }}
                  aria-pressed={on}
                  aria-label={elementLabel(element)}
                  title={elementLabel(element)}
                  onClick={() => (playSfx('ui.tab'), setElements((list) => toggle(list, element)))}
                  data-testid={`setup-filter-${element}`}
                >
                  <Glyph
                    glyph={ELEMENT_GLYPH[element]}
                    size={18}
                    color={on ? 'var(--text-1)' : 'var(--text-3)'}
                  />
                </button>
              );
            })}
          </span>
          <span className={styles.group} role="group" aria-label={t('champions.filter.role')}>
            {ROLES.map((role) => {
              const on = roles.includes(role);
              return (
                <button
                  key={role}
                  type="button"
                  className={[styles.chip, on ? styles.on : ''].join(' ')}
                  style={{ ['--chip' as string]: 'var(--gold-2)' }}
                  aria-pressed={on}
                  aria-label={roleLabel(role)}
                  title={roleLabel(role)}
                  onClick={() => (playSfx('ui.tab'), setRoles((list) => toggle(list, role)))}
                  data-testid={`setup-filter-${role}`}
                >
                  <Glyph glyph={ROLE_GLYPH[role]} size={18} color={on ? 'var(--text-1)' : 'var(--text-3)'} />
                </button>
              );
            })}
          </span>
        </span>
      </header>

      <VirtualGrid
        items={shown}
        columns={COLUMNS}
        cellWidth={CARD}
        cellHeight={CARD_HEIGHT}
        gap={GAP}
        height={GRID_HEIGHT}
        keyOf={(entry) => entry.instance.instanceId}
        emptyLabel={t('champions.empty')}
        renderItem={(entry) => {
          const id = entry.instance.instanceId;
          const seat = team.indexOf(id);
          return (
            <span className={styles.cell}>
              <ChampionCard
                name={entry.name}
                rarity={entry.def.rarity}
                element={entry.def.element}
                role={entry.def.role}
                stars={entry.instance.stars}
                level={entry.instance.level}
                avatar={entry.def.art.avatar}
                tint={entry.def.art.tint}
                placeholder={entry.def.art.placeholder}
                placeholderLabel={t('champions.placeholder')}
                size={CARD}
                selected={seat >= 0}
                dimmed={seat >= 0}
                onClick={() => pick(id)}
                testId={`pick-${id}`}
              />
              {seat >= 0 ? (
                <span
                  className={`num ${styles.seat} ${seat === 0 ? styles.leadSeat : ''}`}
                  aria-hidden="true"
                >
                  {seat + 1}
                </span>
              ) : null}
            </span>
          );
        }}
      />
    </section>
  );
}
