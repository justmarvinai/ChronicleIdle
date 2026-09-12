import { SaveError } from '@engine/errors';
import { decodeChronicleFile, type DecodedChronicle } from '@state/chronicle-file';
import { applyOfflineElapsed } from '@state/offline';
import { services, servicesReady } from '@state/services';
import { entryRoute } from '@state/selectors';
import { useGameStore } from '@state/store';
import { pickTextFile } from '@platform/files';

/** Opens the file picker, decodes the chronicle and asks for confirmation. */
export async function importChronicle(): Promise<void> {
  const { actions } = useGameStore.getState();
  const picked = await pickTextFile('.chronicle,application/json,text/plain');
  if (!picked) return;
  try {
    const decoded = await decodeChronicleFile(picked.text);
    actions.openDialog({ name: 'import-confirm', decoded, fileName: picked.name });
  } catch (error) {
    if (error instanceof SaveError) {
      if (error.message === 'checksum') actions.toast('error', 'save.import.error.checksum');
      else if (error.code === 'save_version_unsupported')
        actions.toast('error', 'save.import.error.version', {
          version: String(error.details?.['version'] ?? '?'),
        });
      else if (error.message === 'format') actions.toast('error', 'save.import.error.format');
      else actions.toast('error', 'save.import.error.schema', { detail: error.message });
    } else {
      actions.toast('error', 'save.import.error.format');
    }
  }
}

/** Replaces the current chronicle with the decoded one (after backing the current one up). */
export async function applyImportedChronicle(decoded: DecodedChronicle): Promise<void> {
  const { actions, save } = useGameStore.getState();
  if (save && servicesReady()) await services().persistence.backup('pre-import');
  const { save: next, report } = applyOfflineElapsed(decoded.save, Date.now());
  actions.loadSave(next, report);
  actions.resetStack(entryRoute(useGameStore.getState()));
  actions.toast('info', 'save.imported');
  if (servicesReady()) await services().persistence.flush();
}
