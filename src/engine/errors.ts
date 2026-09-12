/** Typed errors thrown by the engine (CLAUDE.md §5.7). UI layers render `code` and `message`. */
export type GameErrorCode =
  | 'content_invalid'
  | 'save_invalid'
  | 'save_version_unsupported'
  | 'insufficient_currency'
  | 'insufficient_energy'
  | 'locked'
  | 'invalid_argument'
  | 'battle_invalid_state';

export class GameError extends Error {
  constructor(
    readonly code: GameErrorCode,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'GameError';
  }
}

export class ContentError extends GameError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('content_invalid', message, details);
    this.name = 'ContentError';
  }
}

export class SaveError extends GameError {
  constructor(
    code: 'save_invalid' | 'save_version_unsupported',
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(code, message, details);
    this.name = 'SaveError';
  }
}

/** Result type for reducers that can fail for user-facing reasons without throwing. */
export type Result<T> = { ok: true; value: T } | { ok: false; error: GameError };

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const fail = <T = never>(
  code: GameErrorCode,
  message: string,
  details?: Record<string, unknown>,
): Result<T> => ({
  ok: false,
  error: new GameError(code, message, details),
});
