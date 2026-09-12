import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

function Explodes(): never {
  throw new Error('the page tore');
}

describe('ErrorBoundary', () => {
  it('replaces a crashed screen with the in-universe recovery panel (CLAUDE.md §5.7)', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <ErrorBoundary>
        <Explodes />
      </ErrorBoundary>,
    );
    const panel = screen.getByTestId('error-panel');
    expect(panel).toBeInTheDocument();
    expect(panel).toHaveTextContent('the page tore');
    expect(screen.getByRole('button', { name: /return to emberhold/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /export/i })).toBeDisabled();
    consoleError.mockRestore();
  });

  it('renders children untouched when nothing throws', () => {
    render(
      <ErrorBoundary>
        <p>all is well</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText('all is well')).toBeInTheDocument();
    expect(screen.queryByTestId('error-panel')).toBeNull();
  });
});
