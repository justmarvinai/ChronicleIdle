import { content } from '@content/registry';
import { formatDuration } from '@engine/time/clock';
import { t, translate, type I18nKey } from '@i18n/index';
import { mineView } from '@state/mine';
import { useGameStore } from '@state/store';
import { Button } from '@ui/components/Button/Button';
import { Dialog } from '@ui/components/Dialog/Dialog';
import { useNow } from '@ui/hooks/useNow';
import styles from './dialogs.module.css';

export function WelcomeBackDialog({ onClose }: { onClose: () => void }) {
  const report = useGameStore((s) => s.lastOffline);
  const save = useGameStore((s) => s.save);
  const now = useNow(60_000);
  // The Mine is derived rather than applied on load (MINE.md §6), so it is read here, not reported.
  const mine = save ? mineView(save, now) : null;
  if (!report) return null;
  return (
    <Dialog
      title={t('welcome.title')}
      onClose={onClose}
      width={640}
      testId="dialog-welcome-back"
      footer={
        <Button variant="primary" onClick={onClose}>
          {t('common.continue')}
        </Button>
      }
    >
      <p className={styles.body}>{t('welcome.body', { time: formatDuration(report.elapsedMs) })}</p>
      <div className={styles.row}>
        <span className={styles.rowLabel}>{t('welcome.energy')}</span>
        <span className={`num ${styles.rowValue}`}>+{report.energyGained}</span>
      </div>
      {mine?.unlocked && mine.store.gems > 0 ? (
        <div className={styles.row} data-testid="welcome-mine">
          <span className={styles.rowLabel}>{t(mine.store.full ? 'welcome.mine.full' : 'welcome.mine')}</span>
          <span className={`num ${styles.rowValue}`}>{mine.store.gems}</span>
        </div>
      ) : null}
      {report.questsRolled.length ? (
        <p className={styles.body} data-testid="welcome-quests">
          {t(report.questsRolled.includes('weekly') ? 'welcome.quests.weekly' : 'welcome.quests.daily')}
        </p>
      ) : null}
      {report.bossTributes.length ? (
        <div data-testid="welcome-tribute">
          <p className={styles.body}>{t('bosses.tribute')}</p>
          {report.bossTributes.map((tribute) => (
            <div key={`${tribute.bossId}:${tribute.tierId}:${tribute.pct}`} className={styles.row}>
              <span className={styles.rowLabel}>
                {translate('bosses.tribute.row', {
                  boss: t((content.bossById(tribute.bossId)?.name ?? '') as I18nKey),
                  tier: t((content.bossTier(tribute.bossId, tribute.tierId)?.name ?? '') as I18nKey),
                  pct: tribute.pct,
                })}
              </span>
              <span className={`num ${styles.rowValue}`}>
                {tribute.currencies.map((entry) => `+${entry.amount.toLocaleString('en-US')}`).join(' ')}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </Dialog>
  );
}
