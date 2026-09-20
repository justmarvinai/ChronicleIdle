import { t } from '@i18n/index';
import { Dialog } from '@ui/components/Dialog/Dialog';
import { ChangelogView } from '@ui/changelog/ChangelogView';

/** The Chronicle of Changes from inside a chronicle: the title screen's frame, in a window. */
export function ChangelogDialog({ onClose }: { onClose: () => void }) {
  return (
    <Dialog title={t('changelog.title')} onClose={onClose} width={900} testId="dialog-changelog">
      <ChangelogView height={520} testId="dialog-changelog-view" />
    </Dialog>
  );
}
