import { useState } from 'react';
import { t } from '@i18n/index';
import { selectActions, selectMaxBattleSpeed, selectSettings } from '@state/selectors';
import { useGameStore } from '@state/store';
import { services } from '@state/services';
import { chronicleFileName, encodeChronicleFile } from '@state/chronicle-file';
import { downloadTextFile } from '@platform/files';
import { Button } from '@ui/components/Button/Button';
import { Dialog } from '@ui/components/Dialog/Dialog';
import { Dropdown } from '@ui/components/Dropdown/Dropdown';
import { ScrollArea } from '@ui/components/ScrollArea/ScrollArea';
import { Slider } from '@ui/components/Slider/Slider';
import { Tabs } from '@ui/components/Tab/Tabs';
import { Toggle } from '@ui/components/Toggle/Toggle';
import { useFullscreenOffer } from '@ui/hooks/useFullscreen';
import { importChronicle } from '@ui/flows/importChronicle';
import { DEFAULT_SETTINGS } from '@engine/schema/save';
import styles from './dialogs.module.css';

/** ×3 and ×4 are earned in the campaign (CAMPAIGN.md §1). */
const SPEEDS = [1, 2, 3, 4] as const;

type Tab = 'audio' | 'display' | 'battle' | 'save' | 'about';

export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const actions = useGameStore(selectActions);
  const saved = useGameStore(selectSettings);
  const maxSpeed = useGameStore(selectMaxBattleSpeed);
  const fullscreen = useGameStore((s) => s.ui.fullscreen);
  const hasSave = saved !== null;
  const settings = saved ?? DEFAULT_SETTINGS;
  const [tab, setTab] = useState<Tab>('audio');
  const { toggle, supported } = useFullscreenOffer();

  const update = (patch: Partial<typeof settings>): void => {
    if (hasSave) actions.updateSettings(patch);
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
    <Dialog title={t('settings.title')} onClose={onClose} width={860} testId="dialog-settings">
      <div className={styles.tabsRow}>
        <Tabs<Tab>
          items={[
            { key: 'audio', label: t('settings.audio') },
            { key: 'display', label: t('settings.display') },
            { key: 'battle', label: t('settings.battle') },
            { key: 'save', label: t('settings.save'), disabled: !hasSave },
            { key: 'about', label: t('settings.about') },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>
      <ScrollArea height={460}>
        {tab === 'audio' ? (
          <div>
            <Slider
              label={t('settings.master')}
              value={settings.masterVolume}
              onChange={(v) => update({ masterVolume: v })}
              disabled={!hasSave}
            />
            <Slider
              label={t('settings.music')}
              value={settings.musicVolume}
              onChange={(v) => update({ musicVolume: v })}
              disabled={!hasSave}
            />
            <Slider
              label={t('settings.ambience')}
              value={settings.ambienceVolume}
              onChange={(v) => update({ ambienceVolume: v })}
              disabled={!hasSave}
            />
            <Slider
              label={t('settings.sfx')}
              value={settings.sfxVolume}
              onChange={(v) => update({ sfxVolume: v })}
              disabled={!hasSave}
            />
            <Toggle
              label={t('settings.mute')}
              checked={settings.muted}
              onChange={(v) => update({ muted: v })}
              disabled={!hasSave}
            />
            {!hasSave ? <p className={styles.hint}>{t('common.comingLater')}</p> : null}
          </div>
        ) : null}
        {tab === 'display' ? (
          <div>
            <div className={styles.row}>
              <span className={styles.rowLabel}>{t('settings.fullscreen')}</span>
              <Button variant="secondary" size="sm" onClick={() => void toggle()} disabled={!supported}>
                {fullscreen ? t('title.exitFullscreen') : t('title.fullscreen')}
              </Button>
            </div>
            <Toggle
              label={t('settings.launchFullscreen')}
              checked={settings.launchFullscreen}
              onChange={(v) => update({ launchFullscreen: v })}
              disabled={!hasSave}
            />
            <Toggle
              label={t('settings.reducedMotion')}
              checked={settings.reducedMotion}
              onChange={(v) => update({ reducedMotion: v })}
              disabled={!hasSave}
            />
            <div className={styles.row}>
              <span className={styles.rowLabel}>{t('settings.language')}</span>
              <Dropdown
                options={[{ value: 'en', label: t('settings.language.en') }]}
                value="en"
                onChange={() => undefined}
                width={220}
              />
            </div>
          </div>
        ) : null}
        {tab === 'battle' ? (
          <div>
            <div className={styles.row}>
              <span className={styles.rowLabel}>{t('settings.battleSpeed')}</span>
              <Dropdown
                options={SPEEDS.map((value) => ({
                  value,
                  label: value <= maxSpeed ? `×${value}` : `×${value} 🔒`,
                }))}
                value={Math.min(settings.battleSpeed, maxSpeed)}
                onChange={(v) =>
                  v <= maxSpeed
                    ? update({ battleSpeed: v as 1 | 2 | 3 | 4 })
                    : actions.toast('info', 'settings.battleSpeedLocked', { speed: v })
                }
                width={160}
                disabled={!hasSave}
              />
            </div>
            <Toggle
              label={t('settings.autoBattle')}
              checked={settings.autoBattle}
              onChange={(v) => update({ autoBattle: v })}
              disabled={!hasSave}
            />
          </div>
        ) : null}
        {tab === 'save' ? (
          <div>
            <div className={styles.row}>
              <span className={styles.rowLabel}>{t('settings.export')}</span>
              <Button variant="secondary" size="sm" onClick={() => void onExport()} data-testid="export-save">
                {t('settings.export')}
              </Button>
            </div>
            <div className={styles.row}>
              <span className={styles.rowLabel}>{t('settings.import')}</span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void importChronicle()}
                data-testid="import-save"
              >
                {t('settings.import')}
              </Button>
            </div>
            <div className={styles.row}>
              <span className={styles.rowLabel}>{t('settings.reset')}</span>
              <Button
                variant="danger"
                size="sm"
                sound="ui.error"
                onClick={() => actions.openDialog({ name: 'reset-confirm' })}
                data-testid="reset-save"
              >
                {t('settings.reset')}
              </Button>
            </div>
          </div>
        ) : null}
        {tab === 'about' ? (
          <div>
            <p className={styles.body}>{t('app.version', { version: services().appVersion })}</p>
            <div className={styles.row}>
              <span className={styles.rowLabel}>{t('changelog.title')}</span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => actions.openDialog({ name: 'changelog' })}
                data-testid="open-changelog"
              >
                {t('changelog.open')}
              </Button>
            </div>
            <div className={styles.row}>
              <span className={styles.rowLabel}>{t('settings.credits')}</span>
              <Button variant="secondary" size="sm" onClick={() => actions.openDialog({ name: 'credits' })}>
                {t('settings.credits')}
              </Button>
            </div>
            {import.meta.env.DEV ? (
              <div className={styles.row}>
                <span className={styles.rowLabel}>{t('devkit.title')}</span>
                <Button variant="ghost" size="sm" onClick={() => actions.push({ name: 'devkit' })}>
                  {t('devkit.title')}
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </ScrollArea>
    </Dialog>
  );
}
