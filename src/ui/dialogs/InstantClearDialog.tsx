import { useState } from 'react';
import { playSfx } from '@audio/index';
import { content } from '@content/registry';
import { stageEncounterId } from '@engine/campaign/encounter';
import { t, translate } from '@i18n/index';
import { stageRefOf } from '@state/campaign';
import { instantView, type InstantClearSummary } from '@state/instant';
import { selectActions, selectRoster, selectSave } from '@state/selectors';
import { useGameStore } from '@state/store';
import { Button } from '@ui/components/Button/Button';
import { Dialog } from '@ui/components/Dialog/Dialog';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { prefersReducedMotion } from '@ui/hooks/reducedMotion';
import { SpoilsPanel } from '@ui/screens/battle-result/SpoilsPanel';
import { InstantLedger } from './InstantLedger';
import { InstantTeam } from './InstantTeam';
import styles from './InstantClearDialog.module.css';

export interface InstantClearDialogProps {
  /** What the press on the battle setup cleared and paid. */
  summary: InstantClearSummary;
  /** The team that took the XP, and the count asked for — what *Again* clears with. */
  team: readonly string[];
  requested: number;
  onClose: () => void;
}

/**
 * What an instant clear wrote into the chronicle (docs/design/CAMPAIGN.md §10, docs/tech/
 * UI_DESIGN.md §5.30): the stand and the runs counted up a page at a time on the left, the team
 * that took the XP under it, and everything the batch paid on the right — the same tiles and drops
 * a fought run's result shows. *Again* clears the stand once more with the same team and count, for
 * as long as the energy lasts; the chronicle levels it paid are celebrated once the dialog closes.
 */
export default function InstantClearDialog({
  summary: first,
  team,
  requested,
  onClose,
}: InstantClearDialogProps) {
  const actions = useGameStore(selectActions);
  const save = useGameStore(selectSave);
  const roster = useGameStore(selectRoster);
  const [summary, setSummary] = useState(first);
  // Each batch replays the page: the tally counts again and the tiles land again.
  const [batch, setBatch] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const reduced = prefersReducedMotion();
  const ref = stageRefOf(summary.pointer);
  if (!save || !ref) return null;
  const encounter = content.encounterById(stageEncounterId(ref.stage.id, ref.difficulty));
  const next = instantView(save, summary.pointer, requested);
  const levelsGained = summary.levelUp.levels.length;

  const again = (): void => {
    const result = actions.instantClear({ pointer: summary.pointer, runs: requested, party: team });
    if (!result.ok) {
      setError(
        result.error.code === 'insufficient_energy'
          ? t('instant.noEnergy', { cost: next.cost })
          : result.error.message,
      );
      playSfx('ui.error');
      return;
    }
    setError(null);
    playSfx('reward.large');
    setSummary(result.value);
    setBatch((count) => count + 1);
  };

  return (
    <Dialog
      title={t('instant.title')}
      onClose={onClose}
      width={1320}
      testId="dialog-instant-clear"
      footer={
        <div className={styles.footer}>
          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}
          <Button
            variant="secondary"
            size="lg"
            disabled={next.block !== null}
            onClick={again}
            icon={<Glyph glyph="glyph.magic_feather" size={24} color="var(--gold-3)" />}
            data-testid="instant-again"
          >
            {next.block === null
              ? `${t('instant.again', { count: next.affordable })} · ${t('battleSetup.cost', {
                  cost: next.cost * next.affordable,
                })}`
              : t('instant.againNoEnergy')}
          </Button>
          <Button variant="primary" size="lg" onClick={onClose} data-testid="instant-done">
            {t('instant.done')}
          </Button>
        </div>
      }
    >
      <div className={styles.layout} key={batch}>
        <div className={styles.left}>
          <InstantLedger
            stand={t('instant.stand', {
              settlement: summary.pointer.settlement,
              stage: summary.pointer.stage,
              difficulty: t(`campaign.difficulty.${summary.pointer.difficulty}`),
            })}
            name={encounter ? translate(encounter.name) : translate(ref.settlement.name)}
            runs={summary.runs}
            requested={requested}
            energySpent={summary.energySpent}
            reduced={reduced}
          />
          <InstantTeam
            team={team}
            roster={roster}
            xp={summary.championXp}
            levelUps={summary.levelUps}
            reduced={reduced}
          />
        </div>
        <div className={styles.right}>
          <SpoilsPanel
            rewards={summary.rewards}
            firstClear={false}
            chestThresholds={[]}
            owedChoice={false}
            dropped={summary.gear}
            gearLost={summary.gearLost}
            chronicleLevel={levelsGained > 0 ? save.profile.level : null}
          />
        </div>
      </div>
    </Dialog>
  );
}
