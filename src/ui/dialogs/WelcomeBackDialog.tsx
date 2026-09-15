import { content } from '@content/registry';
import { formatDuration } from '@engine/time/clock';
import { t, translate, type I18nKey } from '@i18n/index';
import { useGameStore } from '@state/store';
import { Button } from '@ui/components/Button/Button';
import { Dialog } from '@ui/components/Dialog/Dialog';
import styles from './dialogs.module.css';

export function WelcomeBackDialog({ onClose }: { onClose: () => void }) {
  const report = useGameStore((s) => s.lastOffline);
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
