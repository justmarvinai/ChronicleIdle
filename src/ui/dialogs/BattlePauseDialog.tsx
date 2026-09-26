import { useState } from 'react';
import { useStore } from 'zustand';
import { battleController } from '@state/battle/index';
import { t, translate } from '@i18n/index';
import { selectActions } from '@state/selectors';
import { useGameStore } from '@state/store';
import { unwrittenFightInFlight } from '@state/unwritten-session';
import { Button } from '@ui/components/Button/Button';
import { Dialog } from '@ui/components/Dialog/Dialog';
import { Glyph } from '@ui/components/Glyph/Glyph';
import styles from './BattlePauseDialog.module.css';

/**
 * Pause menu (docs/tech/UI_DESIGN.md §5.9). The fight in one strip — where it is, the wave, the
 * turns spent, the speed and who is choosing — then **Resume** large, with *Settings* and *Retreat*
 * under it. Retreat asks once, on a red card that says what it costs.
 */
export function BattlePauseDialog({ onClose }: { onClose: () => void }) {
  const actions = useGameStore(selectActions);
  const session = useStore(battleController.store);
  const [confirming, setConfirming] = useState(false);
  const resume = (): void => {
    battleController.setPaused(false);
    onClose();
  };
  const view = session.view;
  return (
    <Dialog title={t('pause.title')} onClose={resume} width={640} testId="dialog-battle-pause">
      <div className={styles.menu}>
        {session.encounter && view ? (
          <section className={styles.fight} data-testid="pause-fight">
            <span className={`display ${styles.where}`}>{translate(session.encounter.name)}</span>
            <ul className={styles.facts}>
              <li>
                <Glyph glyph="glyph.skull_wreath" size={15} color="var(--gold-2)" />
                {t('battle.wave', { wave: view.wave, count: view.waveCount })}
              </li>
              <li>
                <Glyph glyph="glyph.hourglass" size={15} color="var(--gold-2)" />
                {t('battle.turnsUsed', { turns: view.allyTurns, limit: view.turnLimit })}
              </li>
              <li>
                <Glyph glyph="glyph.rockets" size={15} color="var(--gold-2)" />
                {t('battle.speed', { speed: session.speed })}
              </li>
              <li>
                <Glyph glyph="glyph.arcane_symbol" size={15} color="var(--gold-2)" />
                {session.control === 'auto' ? t('battle.auto') : t('battle.manual')}
              </li>
            </ul>
          </section>
        ) : null}

        <Button
          variant="primary"
          size="lg"
          className={styles.resume}
          icon={<Glyph glyph="glyph.sword_clash" size={26} color="var(--gold-3)" />}
          onClick={resume}
          data-testid="pause-resume"
        >
          {t('pause.resume')}
        </Button>

        {confirming ? (
          <section className={styles.confirm} data-testid="pause-retreat-card">
            <p className={styles.confirmText}>
              <Glyph glyph="glyph.nature_shield" size={22} color="#ff9d88" />
              {unwrittenFightInFlight() ? t('pause.retreatConfirm.unwritten') : t('pause.retreatConfirm')}
            </p>
            <div className={styles.row}>
              <Button variant="secondary" size="md" onClick={() => setConfirming(false)}>
                {t('pause.stay')}
              </Button>
              <Button
                variant="danger"
                size="md"
                onClick={() => (battleController.retreat(), onClose())}
                data-testid="pause-retreat-confirm"
              >
                {t('pause.retreatYes')}
              </Button>
            </div>
          </section>
        ) : (
          <div className={styles.row}>
            <Button
              variant="secondary"
              size="md"
              onClick={() => actions.openDialog({ name: 'settings' })}
              data-testid="pause-settings"
            >
              {t('pause.settings')}
            </Button>
            <Button
              variant="secondary"
              size="md"
              sound="ui.cancel"
              onClick={() => setConfirming(true)}
              data-testid="pause-retreat"
            >
              {t('pause.retreat')}
            </Button>
          </div>
        )}
        <p className={styles.hint}>{t('pause.hint')}</p>
      </div>
    </Dialog>
  );
}
