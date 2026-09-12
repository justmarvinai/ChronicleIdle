import { Component, type ErrorInfo, type ReactNode } from 'react';
import { t } from '@i18n/index';
import { chronicleFileName, encodeChronicleFile } from '@state/chronicle-file';
import { services, servicesReady } from '@state/services';
import { useGameStore } from '@state/store';
import { downloadTextFile } from '@platform/files';
import { Button } from '@ui/components/Button/Button';
import { Panel } from '@ui/components/Frame/Panel';
import { Glyph } from '@ui/components/Glyph/Glyph';
import styles from './ErrorBoundary.module.css';

interface State {
  error: Error | null;
}

/** Never a white screen (CLAUDE.md §5.7): an in-universe panel with recovery actions. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ui] screen crashed', error, info.componentStack);
  }

  private returnHome = (): void => {
    const { save, actions } = useGameStore.getState();
    actions.resetStack(save ? { name: 'hub' } : { name: 'title' });
    this.setState({ error: null });
  };

  private exportSave = async (): Promise<void> => {
    const save = useGameStore.getState().save;
    if (!save) return;
    const now = Date.now();
    const version = servicesReady() ? services().appVersion : 'unknown';
    downloadTextFile(chronicleFileName(save, now), await encodeChronicleFile(save, version, now));
  };

  override render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <div className={styles.root} role="alert" data-testid="error-panel">
        <Panel kind="ember-wide" className={styles.panel}>
          <Glyph glyph="glyph.burning_scroll" size={64} color="var(--ember-3)" />
          <h1 className={`display ${styles.title}`}>{t('app.error.title')}</h1>
          <p className={styles.body}>{t('app.error.body')}</p>
          <p className={`num ${styles.code}`}>{t('app.error.code', { message: this.state.error.message })}</p>
          <div className={styles.actions}>
            <Button variant="primary" onClick={this.returnHome}>
              {t('app.error.return')}
            </Button>
            <Button
              variant="secondary"
              onClick={() => void this.exportSave()}
              disabled={!useGameStore.getState().save}
            >
              {t('app.error.export')}
            </Button>
            <Button variant="ghost" onClick={() => window.location.reload()}>
              {t('app.error.reload')}
            </Button>
          </div>
        </Panel>
      </div>
    );
  }
}
