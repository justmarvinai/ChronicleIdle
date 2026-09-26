/**
 * The Mine's words that more than one of its panels says (docs/tech/UI_DESIGN.md §5.29): a
 * stratum's name, and a Sigil rate written the way the table writes it.
 */
import { t, type I18nKey } from '@i18n/index';

/** A stratum's name — `mine.stratum.<n>`, one per row of `balance/mine.ts`. */
export function stratumName(level: number): string {
  return t(`mine.stratum.${level}` as I18nKey);
}

/** Glyph Sigils a day as the table writes them: no float noise, never a ".30". */
export function sigilRate(amount: number): string {
  return String(Math.round(amount * 100) / 100);
}
