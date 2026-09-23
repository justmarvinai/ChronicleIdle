import type { CSSProperties } from 'react';
import { playSfx } from '@audio/index';
import type { Element } from '@content/champions/types';
import type { EncounterDef } from '@content/encounters/types';
import { content } from '@content/registry';
import { t } from '@i18n/index';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { elementLabel } from '@ui/screens/champions/roster-view';
import { ELEMENT_COLOR, ELEMENT_GLYPH } from '@ui/styles/display-maps';
import { EnemyCard } from './EnemyCard';
import { SEAT_GAP, SEAT_HEIGHT, seatWidth } from './setup-layout';
import { scoutWave, wavePower } from './setup-view';
import styles from './EnemyPanel.module.css';

export interface EnemyPanelProps {
  encounter: EncounterDef;
  wave: number;
  onWave: (wave: number) => void;
  /** Hide the wave's power where it would mislead: a boss gate is a race, not a contest of sums. */
  showPower: boolean;
}

/**
 * The enemy's side of the face-off (docs/tech/UI_DESIGN.md §5.8): the waves as chips across the
 * head, the chosen wave's enemies as cards facing the team, the scout's report on them — which
 * elements they fear and which they hunt, and whether a healer stands among them — and what the
 * wave weighs.
 */
export function EnemyPanel({ encounter, wave, onWave, showPower }: EnemyPanelProps) {
  const spawns = encounter.waves[wave]?.enemies ?? [];
  const width = seatWidth(spawns.length);
  return (
    <section className={styles.panel} aria-label={t('battleSetup.enemies')} data-testid="setup-enemies">
      <header className={styles.head}>
        <h2 className={`display ${styles.title}`}>{t('battleSetup.enemies')}</h2>
        <div className={styles.waves} role="tablist" aria-label={t('battleSetup.waves')}>
          {encounter.waves.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === wave}
              className={[styles.wave, i === wave ? styles.on : ''].join(' ')}
              onMouseEnter={() => playSfx('ui.hover')}
              onClick={() => {
                if (i === wave) return;
                playSfx('ui.tab');
                onWave(i);
              }}
              data-testid={`wave-tab-${i + 1}`}
            >
              {t('battleSetup.wave', { index: i + 1 })}
            </button>
          ))}
        </div>
      </header>

      <ul className={styles.lineup} style={{ gap: SEAT_GAP }} data-testid="wave-enemies">
        {spawns.map((spawn, i) => {
          const def = content.enemyById(spawn.enemyId);
          return def ? (
            <EnemyCard
              key={`${wave}-${spawn.enemyId}-${i}`}
              def={def}
              encounter={encounter}
              statMult={spawn.statMult ?? 1}
              width={width}
              height={SEAT_HEIGHT}
            />
          ) : null;
        })}
      </ul>

      <Scout encounter={encounter} wave={wave} />

      <footer className={styles.foot}>
        <span className={styles.count}>
          <Glyph glyph="glyph.flaming_skull" size={20} color="var(--ember-3)" />
          {t('battleSetup.enemyCount', { count: spawns.length })}
        </span>
        {showPower ? (
          <span className={styles.power}>
            <span className={styles.powerLabel}>{t('battleSetup.wavePower')}</span>
            <span className={`num ${styles.powerValue}`} data-testid="wave-power">
              {wavePower(encounter, wave).toLocaleString('en-US')}
            </span>
          </span>
        ) : null}
      </footer>
    </section>
  );
}

/** The scout's report on the wave on show: the element match-ups, and a healer to strike first. */
function Scout({ encounter, wave }: { encounter: EncounterDef; wave: number }) {
  const report = scoutWave(encounter, wave);
  const even = report.strong.length === 0 && report.weak.length === 0;
  return (
    <div className={styles.scout} data-testid="setup-scout">
      <span className={styles.scoutIcon} aria-hidden="true">
        <Glyph glyph="glyph.owl" size={34} color="var(--text-2)" />
      </span>
      <span className={styles.scoutText}>
        <span className={`display ${styles.scoutTitle}`}>{t('battleSetup.scout')}</span>
        {even ? (
          <span className={styles.scoutLine}>{t('battleSetup.scout.even')}</span>
        ) : (
          <span className={styles.scoutLine}>
            {report.strong.length ? (
              <span className={styles.edge} data-testid="scout-strong">
                {t('battleSetup.scout.strong')}
                {report.strong.map((element) => (
                  <ElementChip key={element} element={element} />
                ))}
              </span>
            ) : null}
            {report.weak.length ? (
              <span className={styles.edge} data-testid="scout-weak">
                {t('battleSetup.scout.weak')}
                {report.weak.map((element) => (
                  <ElementChip key={element} element={element} />
                ))}
              </span>
            ) : null}
          </span>
        )}
        {report.healer ? (
          <span className={styles.healer} data-testid="scout-healer">
            <Glyph glyph="glyph.health_potion" size={16} color="var(--ok)" />
            {t('battleSetup.scout.healer')}
          </span>
        ) : null}
      </span>
    </div>
  );
}

function ElementChip({ element }: { element: Element }) {
  return (
    <span className={styles.element} style={{ '--element': ELEMENT_COLOR[element] } as CSSProperties}>
      <Glyph glyph={ELEMENT_GLYPH[element]} size={15} color="var(--text-1)" />
      {elementLabel(element)}
    </span>
  );
}
