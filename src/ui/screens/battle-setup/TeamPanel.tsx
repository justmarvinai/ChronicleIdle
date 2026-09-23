import type { Roster } from '@engine/champions/instance';
import { content } from '@content/registry';
import { t, translate } from '@i18n/index';
import { championAvatar } from '@ui/champions/art';
import { AbilityIcon } from '@ui/components/AbilityIcon/AbilityIcon';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { SEAT_GAP, SEAT_HEIGHT, seatWidth } from './setup-layout';
import { TeamSeat } from './TeamSeat';
import styles from './TeamPanel.module.css';

const PRESET_COUNT = 3;
/** A preset's faces, in stage pixels: enough to know the team without reading it. */
const PRESET_FACE = { 3: 32, 4: 27 } as const;

export interface TeamPanelProps {
  team: readonly string[];
  partySize: number;
  roster: Roster;
  powerOf: (instanceId: string) => number;
  presets: readonly (readonly string[])[];
  onRemove: (index: number) => void;
  onLead: (index: number) => void;
  onLoadPreset: (index: number) => void;
  onSavePreset: (index: number) => void;
}

/**
 * The player's side of the face-off (docs/tech/UI_DESIGN.md §5.8): the team's power, its seats,
 * what the leader's aura does, and the three presets — each a row of faces to load with a press,
 * and a quill to write the team into it.
 */
export function TeamPanel({
  team,
  partySize,
  roster,
  powerOf,
  presets,
  onRemove,
  onLead,
  onLoadPreset,
  onSavePreset,
}: TeamPanelProps) {
  const seat = seatWidth(partySize);
  const face = partySize >= 4 ? PRESET_FACE[4] : PRESET_FACE[3];
  const teamPower = team.reduce((sum, id) => sum + powerOf(id), 0);
  const leader = team[0] ? roster[team[0]] : undefined;
  const aura = leader ? content.championById(leader.defId)?.aura : undefined;

  return (
    <section className={styles.panel} aria-label={t('battleSetup.team')} data-testid="setup-team">
      <header className={styles.head}>
        <h2 className={`display ${styles.title}`}>{t('battleSetup.team')}</h2>
        <span className={styles.power}>
          <Glyph glyph="glyph.crossed_swords" size={22} color="var(--gold-2)" />
          <span className={styles.powerLabel}>{t('battleSetup.teamPower')}</span>
          <span className={`num ${styles.powerValue}`} data-testid="team-power">
            {teamPower.toLocaleString('en-US')}
          </span>
        </span>
      </header>

      <div className={styles.seats} style={{ gap: SEAT_GAP }}>
        {Array.from({ length: partySize }, (_, i) => {
          const id = team[i];
          const instance = id ? roster[id] : undefined;
          return (
            <TeamSeat
              key={id ?? `empty-${i}`}
              index={i}
              width={seat}
              height={SEAT_HEIGHT}
              def={instance ? content.championById(instance.defId) : undefined}
              instance={instance}
              power={id ? powerOf(id) : 0}
              onRemove={() => onRemove(i)}
              onLead={() => onLead(i)}
            />
          );
        })}
      </div>

      <div className={styles.aura} data-testid="setup-aura">
        {aura ? (
          <>
            <AbilityIcon icon={aura.icon} label={translate(aura.name)} size={52} passive />
            <span className={styles.auraText}>
              <span className={`display ${styles.auraName}`}>
                {t('battleSetup.leaderAura', { name: translate(aura.name) })}
              </span>
              <span className={styles.auraLine}>{translate(aura.description)}</span>
            </span>
          </>
        ) : (
          <span className={styles.noAura}>{t('battleSetup.noAura')}</span>
        )}
      </div>

      <div className={styles.presets}>
        <span className={`display ${styles.presetsLabel}`}>{t('battleSetup.presets')}</span>
        <div className={styles.presetRow}>
          {Array.from({ length: PRESET_COUNT }, (_, index) => {
            const members = (presets[index] ?? []).flatMap((id) => {
              const instance = roster[id];
              const def = instance ? content.championById(instance.defId) : undefined;
              return def ? [{ id, def }] : [];
            });
            return (
              <div key={index} className={styles.preset}>
                <button
                  type="button"
                  className={styles.presetLoad}
                  disabled={members.length === 0}
                  onClick={() => onLoadPreset(index)}
                  aria-label={t('battleSetup.presetLoadFrom', { index: index + 1 })}
                  data-testid={`preset-load-${index}`}
                >
                  <span className={`num ${styles.presetIndex}`}>{index + 1}</span>
                  {members.length ? (
                    <span className={styles.faces}>
                      {members.map(({ id, def }) => (
                        <span
                          key={id}
                          className={styles.face}
                          style={{
                            width: face,
                            height: face,
                            backgroundImage: `url("${championAvatar(def, 128).url}")`,
                          }}
                        />
                      ))}
                    </span>
                  ) : (
                    <span className={styles.presetEmpty}>{t('battleSetup.presetEmpty')}</span>
                  )}
                </button>
                <button
                  type="button"
                  className={styles.presetSave}
                  disabled={team.length === 0}
                  onClick={() => onSavePreset(index)}
                  title={t('battleSetup.presetSaveTo', { index: index + 1 })}
                  aria-label={t('battleSetup.presetSaveTo', { index: index + 1 })}
                  data-testid={`preset-save-${index}`}
                >
                  <Glyph glyph="glyph.magic_feather" size={20} color="var(--gold-2)" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
