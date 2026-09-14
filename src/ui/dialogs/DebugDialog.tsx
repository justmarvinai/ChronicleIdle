import { useState } from 'react';
import type { Difficulty } from '@content/balance/battle';
import { CHAMPION_IDS, type ChampionId } from '@content/champions/types';
import { content } from '@content/registry';
import { t, translate } from '@i18n/index';
import { selectActions } from '@state/selectors';
import { useGameStore } from '@state/store';
import { Button } from '@ui/components/Button/Button';
import { Dialog } from '@ui/components/Dialog/Dialog';
import { Dropdown } from '@ui/components/Dropdown/Dropdown';
import styles from './dialogs.module.css';

const GENERATE_COUNT = 200;

/** Chronicle Debug (development builds only, Ctrl+Shift+D): grants for testing screens. */
export default function DebugDialog({ onClose }: { onClose: () => void }) {
  const actions = useGameStore(selectActions);
  const [champion, setChampion] = useState<ChampionId>('champ.anuria');
  const [seed, setSeed] = useState('perf');
  const name = (id: ChampionId): string => {
    const def = content.championById(id);
    return def ? translate(def.name) : id;
  };
  return (
    <Dialog title={t('debug.title')} onClose={onClose} width={720} testId="dialog-debug">
      <p className={styles.hint}>{t('debug.body')}</p>
      <div className={styles.row}>
        <span className={styles.rowLabel}>{t('debug.champion')}</span>
        <span style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Dropdown<ChampionId>
            width={320}
            value={champion}
            options={CHAMPION_IDS.map((id) => ({ value: id, label: name(id) }))}
            onChange={setChampion}
          />
          <Button
            size="sm"
            variant="primary"
            data-testid="debug-grant"
            onClick={() => {
              const result = actions.grantChampion(champion, 'summon', 'debug');
              if (result.ok) actions.toast('info', 'debug.granted', { name: name(champion) });
            }}
          >
            {t('debug.grant')}
          </Button>
        </span>
      </div>
      <div className={styles.row}>
        <span className={styles.rowLabel}>{t('debug.generate', { count: GENERATE_COUNT })}</span>
        <span style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <input
            className={styles.input}
            style={{ width: 160, height: 44, fontSize: 18 }}
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            aria-label="seed"
            data-testid="debug-seed"
          />
          <Button
            size="sm"
            variant="secondary"
            data-testid="debug-generate"
            onClick={() => {
              const result = actions.generateDebugRoster(GENERATE_COUNT, seed);
              if (result.ok) actions.toast('info', 'debug.generated', { count: GENERATE_COUNT });
            }}
          >
            {t('debug.generate', { count: GENERATE_COUNT })}
          </Button>
        </span>
      </div>
      <div className={styles.row}>
        <span className={styles.rowLabel}>{t('debug.campaign')}</span>
        <span style={{ display: 'flex', gap: 10 }}>
          {(['intro', 'normal', 'hard'] as Difficulty[]).map((difficulty) => (
            <Button
              key={difficulty}
              size="sm"
              variant="secondary"
              data-testid={`debug-clear-${difficulty}`}
              onClick={() => {
                actions.debugClearCampaign(difficulty);
                actions.toast('info', 'debug.cleared', {
                  difficulty: t(`campaign.difficulty.${difficulty}`),
                });
              }}
            >
              {t('debug.clearDifficulty', { difficulty: t(`campaign.difficulty.${difficulty}`) })}
            </Button>
          ))}
        </span>
      </div>
      <div className={styles.row}>
        <span className={styles.rowLabel}>{t('debug.playerLevel')}</span>
        <span style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {[5, 20, 30].map((level) => (
            <Button
              key={level}
              size="sm"
              variant="secondary"
              data-testid={`debug-level-${level}`}
              onClick={() => {
                actions.debugSetPlayerLevel(level);
                actions.toast('info', 'debug.levelSet', { level });
              }}
            >
              {t('common.level', { level })}
            </Button>
          ))}
          <Button
            size="sm"
            variant="secondary"
            data-testid="debug-player-xp"
            onClick={() => actions.grantPlayerXp(5_000, 'debug')}
          >
            {t('debug.playerXp')}
          </Button>
        </span>
      </div>
      <div className={styles.row}>
        <span className={styles.rowLabel}>Wallet</span>
        <span style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => actions.grantCurrency([{ currency: 'gold', amount: 10_000 }], 'debug')}
          >
            {t('debug.gold')}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => actions.grantCurrency([{ currency: 'gems', amount: 500 }], 'debug')}
          >
            {t('debug.gems')}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => actions.addEnergy(100, 'debug')}>
            {t('debug.energy')}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            data-testid="debug-tavern-stock"
            onClick={() =>
              actions.grantCurrency(
                [
                  { currency: 'brew_justice', amount: 10 },
                  { currency: 'brew_valor', amount: 10 },
                  { currency: 'brew_faith', amount: 10 },
                  { currency: 'brew_eclipse', amount: 10 },
                  { currency: 'brew_universal', amount: 10 },
                  { currency: 'tome_rare', amount: 5 },
                  { currency: 'tome_epic', amount: 5 },
                  { currency: 'tome_legendary', amount: 5 },
                  { currency: 'tome_mythic', amount: 5 },
                ],
                'debug',
              )
            }
          >
            {t('debug.tavernStock')}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            data-testid="debug-gear-drop"
            onClick={() => {
              for (let i = 0; i < 12; i += 1) actions.debugGrantGear(6 + (i % 6));
            }}
          >
            {t('debug.gearDrop')}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            data-testid="debug-forge-stock"
            onClick={() =>
              actions.grantCurrency(
                [
                  { currency: 'mat_scrap_iron', amount: 200 },
                  { currency: 'mat_ember_alloy', amount: 150 },
                  { currency: 'mat_starsteel', amount: 100 },
                  { currency: 'mat_arcane_dust', amount: 200 },
                  { currency: 'mat_refining_core', amount: 40 },
                  { currency: 'mat_glyph_sigil', amount: 10 },
                ],
                'debug',
              )
            }
          >
            {t('debug.forgeStock')}
          </Button>
        </span>
      </div>
    </Dialog>
  );
}
