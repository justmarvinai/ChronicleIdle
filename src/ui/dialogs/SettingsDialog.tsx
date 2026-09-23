import { useId, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { GlyphKey } from '@assets/manifest.generated';
import { playSfx } from '@audio/index';
import { t, type I18nKey } from '@i18n/index';
import { selectActions, selectMaxBattleSpeed, selectSettings } from '@state/selectors';
import { useGameStore } from '@state/store';
import { services } from '@state/services';
import { chronicleFileName, encodeChronicleFile } from '@state/chronicle-file';
import { downloadTextFile } from '@platform/files';
import { Button } from '@ui/components/Button/Button';
import { Dialog } from '@ui/components/Dialog/Dialog';
import { Dropdown } from '@ui/components/Dropdown/Dropdown';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { ScrollArea } from '@ui/components/ScrollArea/ScrollArea';
import { Slider } from '@ui/components/Slider/Slider';
import { Toggle } from '@ui/components/Toggle/Toggle';
import { useFullscreenOffer } from '@ui/hooks/useFullscreen';
import { importChronicle } from '@ui/flows/importChronicle';
import { DEFAULT_SETTINGS } from '@engine/schema/save';
import styles from './SettingsDialog.module.css';

/** ×3 and ×4 are earned in the campaign (CAMPAIGN.md §1). */
const SPEEDS = [1, 2, 3, 4] as const;
/** How tall the section scrolls, in stage pixels. */
const PANE_HEIGHT = 560;

type Section = 'audio' | 'display' | 'battle' | 'save' | 'about';

const SECTIONS: readonly { key: Section; label: I18nKey; hint: I18nKey; glyph: GlyphKey }[] = [
  { key: 'audio', label: 'settings.audio', hint: 'settings.audio.hint', glyph: 'glyph.peace_dove' },
  { key: 'display', label: 'settings.display', hint: 'settings.display.hint', glyph: 'glyph.evil_eye' },
  { key: 'battle', label: 'settings.battle', hint: 'settings.battle.hint', glyph: 'glyph.crossed_swords' },
  { key: 'save', label: 'settings.save', hint: 'settings.save.hint', glyph: 'glyph.spell_book' },
  { key: 'about', label: 'settings.about', hint: 'settings.about.hint', glyph: 'glyph.magic_feather' },
];

/**
 * Settings (docs/tech/UI_DESIGN.md §5.17). The sections sit as a rail on the left, each with its
 * glyph and what it holds, and the section chosen fills the right: each setting a card with its
 * name, a line saying what it does, and its control. Every change applies at once and is saved
 * with the chronicle; before one exists, the controls are shown but still.
 */
export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const actions = useGameStore(selectActions);
  const saved = useGameStore(selectSettings);
  const maxSpeed = useGameStore(selectMaxBattleSpeed);
  const fullscreen = useGameStore((s) => s.ui.fullscreen);
  const hasSave = saved !== null;
  const settings = saved ?? DEFAULT_SETTINGS;
  const [section, setSection] = useState<Section>('audio');
  const { toggle, supported } = useFullscreenOffer();
  const base = useId();
  const current = SECTIONS.find((entry) => entry.key === section) ?? SECTIONS[0];
  const open = SECTIONS.filter((entry) => entry.key !== 'save' || hasSave);

  const update = (patch: Partial<typeof settings>): void => {
    if (hasSave) actions.updateSettings(patch);
  };
  const choose = (next: Section): void => {
    if (next === section) return;
    playSfx('ui.tab');
    setSection(next);
  };
  // The rail is a vertical tab list: the arrows walk it, Home and End jump to its ends.
  const onRailKey = (event: KeyboardEvent<HTMLButtonElement>): void => {
    const index = open.findIndex((entry) => entry.key === section);
    const step =
      event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : event.key === 'Home' ? -index : 0;
    const target =
      event.key === 'End'
        ? open[open.length - 1]
        : step !== 0
          ? open[(index + step + open.length) % open.length]
          : null;
    if (!target) return;
    event.preventDefault();
    choose(target.key);
    document.getElementById(`${base}-tab-${target.key}`)?.focus();
  };

  const onExport = async (): Promise<void> => {
    const save = useGameStore.getState().save;
    if (!save) return;
    const now = Date.now();
    downloadTextFile(
      chronicleFileName(save, now),
      await encodeChronicleFile(save, services().appVersion, now),
    );
    actions.toast('info', 'save.exported');
  };

  return (
    <Dialog title={t('settings.title')} onClose={onClose} width={1060} testId="dialog-settings">
      <div className={styles.layout}>
        <nav
          className={styles.rail}
          role="tablist"
          aria-orientation="vertical"
          aria-label={t('settings.title')}
        >
          {SECTIONS.map((entry) => {
            const selected = entry.key === section;
            const disabled = entry.key === 'save' && !hasSave;
            return (
              <button
                key={entry.key}
                type="button"
                role="tab"
                id={`${base}-tab-${entry.key}`}
                aria-selected={selected}
                aria-controls={`${base}-panel`}
                aria-label={t(entry.label)}
                aria-describedby={`${base}-hint-${entry.key}`}
                tabIndex={selected ? 0 : -1}
                disabled={disabled}
                className={[styles.tab, selected ? styles.tabOn : ''].join(' ')}
                onMouseEnter={() => !disabled && !selected && playSfx('ui.hover')}
                onClick={() => choose(entry.key)}
                onKeyDown={onRailKey}
                data-testid={`settings-tab-${entry.key}`}
              >
                <span className={styles.tabGlyph} aria-hidden="true">
                  <Glyph glyph={entry.glyph} size={26} color={selected ? 'var(--gold-3)' : 'var(--text-2)'} />
                </span>
                <span className={styles.tabText}>
                  <span className={`display ${styles.tabLabel}`}>{t(entry.label)}</span>
                  <span className={styles.tabHint} id={`${base}-hint-${entry.key}`}>
                    {t(entry.hint)}
                  </span>
                </span>
              </button>
            );
          })}
          <p className={`num ${styles.version}`}>{t('app.version', { version: services().appVersion })}</p>
        </nav>

        <section
          className={styles.pane}
          role="tabpanel"
          id={`${base}-panel`}
          aria-labelledby={`${base}-tab-${section}`}
          data-testid={`settings-pane-${section}`}
        >
          <header className={styles.paneHead}>
            <span className={styles.paneGlyph} aria-hidden="true">
              <Glyph glyph={current?.glyph ?? 'glyph.peace_dove'} size={34} color="var(--gold-3)" />
            </span>
            <span>
              <h3 className={`display ${styles.paneTitle}`}>{current ? t(current.label) : null}</h3>
              <p className={styles.paneHint}>{current ? t(current.hint) : null}</p>
            </span>
          </header>
          <ScrollArea height={PANE_HEIGHT} className={styles.scroll}>
            {!hasSave && section !== 'about' ? (
              <p className={styles.notice}>{t('common.comingLater')}</p>
            ) : null}

            {section === 'audio' ? (
              <Group title={t('settings.group.volume')}>
                <SettingRow label={t('settings.master')} hint={t('settings.master.hint')}>
                  <Slider
                    label={t('settings.master')}
                    hideLabel
                    value={settings.masterVolume}
                    onChange={(v) => update({ masterVolume: v })}
                    disabled={!hasSave}
                  />
                </SettingRow>
                <SettingRow label={t('settings.music')} hint={t('settings.music.hint')}>
                  <Slider
                    label={t('settings.music')}
                    hideLabel
                    value={settings.musicVolume}
                    onChange={(v) => update({ musicVolume: v })}
                    disabled={!hasSave}
                  />
                </SettingRow>
                <SettingRow label={t('settings.ambience')} hint={t('settings.ambience.hint')}>
                  <Slider
                    label={t('settings.ambience')}
                    hideLabel
                    value={settings.ambienceVolume}
                    onChange={(v) => update({ ambienceVolume: v })}
                    disabled={!hasSave}
                  />
                </SettingRow>
                <SettingRow label={t('settings.sfx')} hint={t('settings.sfx.hint')}>
                  <Slider
                    label={t('settings.sfx')}
                    hideLabel
                    value={settings.sfxVolume}
                    onChange={(v) => update({ sfxVolume: v })}
                    disabled={!hasSave}
                  />
                </SettingRow>
                <SettingRow label={t('settings.mute')} hint={t('settings.mute.hint')} compact>
                  <Toggle
                    label={t('settings.mute')}
                    hideLabel
                    checked={settings.muted}
                    onChange={(v) => update({ muted: v })}
                    disabled={!hasSave}
                  />
                </SettingRow>
              </Group>
            ) : null}

            {section === 'display' ? (
              <>
                <Group title={t('settings.group.screen')}>
                  <SettingRow label={t('settings.fullscreen')} hint={t('settings.fullscreen.hint')} compact>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => void toggle()}
                      disabled={!supported}
                      data-testid="settings-fullscreen"
                    >
                      {fullscreen ? t('title.exitFullscreen') : t('title.fullscreen')}
                    </Button>
                  </SettingRow>
                  <SettingRow
                    label={t('settings.launchFullscreen')}
                    hint={t('settings.launchFullscreen.hint')}
                    compact
                  >
                    <Toggle
                      label={t('settings.launchFullscreen')}
                      hideLabel
                      checked={settings.launchFullscreen}
                      onChange={(v) => update({ launchFullscreen: v })}
                      disabled={!hasSave}
                    />
                  </SettingRow>
                </Group>
                <Group title={t('settings.group.comfort')}>
                  <SettingRow
                    label={t('settings.reducedMotion')}
                    hint={t('settings.reducedMotion.hint')}
                    compact
                  >
                    <Toggle
                      label={t('settings.reducedMotion')}
                      hideLabel
                      checked={settings.reducedMotion}
                      onChange={(v) => update({ reducedMotion: v })}
                      disabled={!hasSave}
                    />
                  </SettingRow>
                  <SettingRow label={t('settings.language')} hint={t('settings.language.hint')} compact>
                    <Dropdown
                      options={[{ value: 'en', label: t('settings.language.en') }]}
                      value="en"
                      onChange={() => undefined}
                      width={200}
                    />
                  </SettingRow>
                </Group>
              </>
            ) : null}

            {section === 'battle' ? (
              <Group title={t('settings.group.fights')}>
                <SettingRow label={t('settings.battleSpeed')} hint={t('settings.battleSpeed.hint')} compact>
                  <div className={styles.speeds} role="radiogroup" aria-label={t('settings.battleSpeed')}>
                    {SPEEDS.map((speed) => {
                      const locked = speed > maxSpeed;
                      const on = !locked && speed === Math.min(settings.battleSpeed, maxSpeed);
                      return (
                        <button
                          key={speed}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          aria-disabled={locked || !hasSave}
                          title={locked ? t('settings.battleSpeed.locked') : undefined}
                          className={[
                            styles.speed,
                            on ? styles.speedOn : '',
                            locked ? styles.speedLocked : '',
                          ].join(' ')}
                          onClick={() => {
                            if (!hasSave) return;
                            if (locked) {
                              playSfx('ui.error');
                              actions.toast('info', 'settings.battleSpeedLocked', { speed });
                              return;
                            }
                            playSfx('ui.tab');
                            update({ battleSpeed: speed });
                          }}
                          data-testid={`settings-speed-${speed}`}
                        >
                          <span className="num">×{speed}</span>
                          {locked ? (
                            <Glyph glyph="glyph.broken_shackle" size={13} color="var(--text-3)" />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </SettingRow>
                <SettingRow label={t('settings.autoBattle')} hint={t('settings.autoBattle.hint')} compact>
                  <Toggle
                    label={t('settings.autoBattle')}
                    hideLabel
                    checked={settings.autoBattle}
                    onChange={(v) => update({ autoBattle: v })}
                    disabled={!hasSave}
                  />
                </SettingRow>
              </Group>
            ) : null}

            {section === 'save' ? (
              <>
                <Group title={t('settings.group.keep')}>
                  <SettingRow label={t('settings.export')} hint={t('settings.export.hint')} compact>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => void onExport()}
                      data-testid="export-save"
                    >
                      {t('settings.export')}
                    </Button>
                  </SettingRow>
                  <SettingRow label={t('settings.import')} hint={t('settings.import.hint')} compact>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => void importChronicle()}
                      data-testid="import-save"
                    >
                      {t('settings.import')}
                    </Button>
                  </SettingRow>
                </Group>
                <Group title={t('settings.group.danger')} danger>
                  <SettingRow label={t('settings.reset')} hint={t('settings.reset.hint')} compact danger>
                    <Button
                      variant="danger"
                      size="sm"
                      sound="ui.error"
                      onClick={() => actions.openDialog({ name: 'reset-confirm' })}
                      data-testid="reset-save"
                    >
                      {t('settings.reset')}
                    </Button>
                  </SettingRow>
                </Group>
              </>
            ) : null}

            {section === 'about' ? (
              <Group title={t('settings.group.game')}>
                <SettingRow label={t('changelog.title')} hint={t('settings.changelog.hint')} compact>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => actions.openDialog({ name: 'changelog' })}
                    data-testid="open-changelog"
                  >
                    {t('changelog.open')}
                  </Button>
                </SettingRow>
                <SettingRow label={t('settings.credits')} hint={t('settings.credits.hint')} compact>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => actions.openDialog({ name: 'credits' })}
                    data-testid="open-credits"
                  >
                    {t('settings.credits')}
                  </Button>
                </SettingRow>
                {import.meta.env.DEV ? (
                  <SettingRow
                    label={t('devkit.title')}
                    hint={t('app.version', { version: services().appVersion })}
                    compact
                  >
                    <Button variant="ghost" size="sm" onClick={() => actions.push({ name: 'devkit' })}>
                      {t('devkit.title')}
                    </Button>
                  </SettingRow>
                ) : null}
              </Group>
            ) : null}
          </ScrollArea>
        </section>
      </div>
    </Dialog>
  );
}

/** A titled run of setting cards; the danger group burns red. */
function Group({ title, danger, children }: { title: string; danger?: boolean; children: ReactNode }) {
  return (
    <section className={[styles.group, danger ? styles.groupDanger : ''].join(' ')}>
      <h4 className={`display ${styles.groupTitle}`}>{title}</h4>
      <div className={styles.cards}>{children}</div>
    </section>
  );
}

/**
 * One setting as a card: its name and what it does on the left, its control on the right. A
 * slider takes the card's wide right half; a switch, a button or a picker sits at its end.
 */
function SettingRow({
  label,
  hint,
  compact,
  danger,
  children,
}: {
  label: string;
  hint: string;
  compact?: boolean;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={[styles.card, compact ? styles.compact : '', danger ? styles.cardDanger : ''].join(' ')}>
      <span className={styles.cardText}>
        <span className={`display ${styles.cardLabel}`}>{label}</span>
        <span className={styles.cardHint}>{hint}</span>
      </span>
      <span className={styles.cardControl}>{children}</span>
    </div>
  );
}
