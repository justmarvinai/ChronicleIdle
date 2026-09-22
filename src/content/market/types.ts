/**
 * The Market's shelves (docs/design/MARKET.md).
 *
 * A **gem entry** is authored here, because the Gem Market never rotates: what it sells and what
 * it charges are content, and the shelf a player sees today is the shelf they saw last month.
 *
 * A **gold slot** is not authored at all — it is rolled from `balance/market.ts`'s pool by the hour
 * and the chronicle's seed (`@engine/market`), the way a dungeon stage is derived from its number.
 * There is no gold-market content file for the same reason there is no dungeon-stage one.
 */
import type { Grant } from '@content/grants';

export interface GemShelfEntry {
  /** `shelf.<snake_case>`. */
  id: string;
  /** i18n keys. */
  name: string;
  description: string;
  /** Gems. The Gem Market takes nothing else. */
  price: number;
  /**
   * A bundle is bought **once per chronicle** and then shown taken (the owner's answer). That is
   * what lets it carry real value over buying its parts; single items stay infinite, as specified.
   */
  once?: true;
  /**
   * What it pays. A single item is one row of `count: 1`; a bundle is several, and its price is
   * meant to sit well under the sum of its parts bought separately.
   */
  contents: readonly Grant[];
  /** Reading order on the shelf, cheapest tier first. */
  order: number;
  version: number;
}
