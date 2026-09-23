/**
 * Every release of ChronicleIdle, newest first — the order the Chronicle of Changes reads in.
 *
 * A new release goes at the **top** of this list and its strings in `src/i18n/en/changelog.ts`
 * under the same `release.<version>` prefix (CLAUDE.md §9.3: every shipped change writes a line
 * here, in the words a player would use). The validator checks the order and the keys.
 */
import type { ChangeKind, ReleaseDef } from './types';

/** One authored line: its kind, the slug its string is keyed by, and whether it leads. */
interface Line {
  kind: ChangeKind;
  slug: string;
  lead?: true;
}

/** Builds a release's ids from its version: `0.4.2` keys its strings under `release.0_4_2`. */
function release(version: string, date: string, lines: readonly Line[]): ReleaseDef {
  const prefix = `release.${version.replace(/\./g, '_')}`;
  return {
    id: prefix,
    name: `${prefix}.name`,
    release: version,
    date,
    changes: lines.map((line) => ({
      kind: line.kind,
      text: `${prefix}.${line.slug}`,
      highlight: line.lead ?? false,
    })),
    version: 1,
  };
}

export const RELEASES: readonly ReleaseDef[] = [
  release('0.9.6', '2026-09-23', [
    { kind: 'changed', slug: 'gold_market', lead: true },
    { kind: 'changed', slug: 'gem_market', lead: true },
    { kind: 'changed', slug: 'rare_finds' },
    { kind: 'changed', slug: 'stamps' },
  ]),
  release('0.9.5', '2026-09-23', [
    { kind: 'changed', slug: 'tavern', lead: true },
    { kind: 'changed', slug: 'forge', lead: true },
    { kind: 'changed', slug: 'tavern_helpers' },
    { kind: 'changed', slug: 'forge_benches' },
    { kind: 'changed', slug: 'hub' },
    { kind: 'changed', slug: 'idle_chest' },
    { kind: 'fixed', slug: 'chest_ring' },
  ]),
  release('0.9.4', '2026-09-23', [
    { kind: 'added', slug: 'gear_tooltips', lead: true },
    { kind: 'changed', slug: 'champions', lead: true },
    { kind: 'changed', slug: 'drops_marked' },
    { kind: 'changed', slug: 'icons_everywhere' },
    { kind: 'changed', slug: 'header' },
    { kind: 'fixed', slug: 'difficulty_list' },
    { kind: 'fixed', slug: 'tooltip_edge' },
  ]),
  release('0.9.3', '2026-09-23', [
    { kind: 'content', slug: 'paintings', lead: true },
    { kind: 'added', slug: 'emblems', lead: true },
    { kind: 'changed', slug: 'index_sets' },
    { kind: 'changed', slug: 'drops' },
  ]),
  release('0.9.2', '2026-09-22', [
    { kind: 'content', slug: 'varkos', lead: true },
    { kind: 'content', slug: 'bosses', lead: true },
    { kind: 'fixed', slug: 'facing' },
  ]),
  release('0.9.1', '2026-09-22', [
    { kind: 'changed', slug: 'bottom_bar', lead: true },
    { kind: 'changed', slug: 'boost_slots', lead: true },
    { kind: 'changed', slug: 'daily_rewards' },
    { kind: 'changed', slug: 'bag_moved' },
  ]),
  release('0.9.0', '2026-09-22', [
    { kind: 'added', slug: 'market', lead: true },
    { kind: 'added', slug: 'welcome', lead: true },
    { kind: 'added', slug: 'gold_stall' },
    { kind: 'added', slug: 'gem_shelf' },
    { kind: 'added', slug: 'bundles' },
    { kind: 'added', slug: 'bag' },
    { kind: 'added', slug: 'boosts' },
    { kind: 'added', slug: 'no_streak' },
  ]),
  release('0.8.0', '2026-09-22', [
    { kind: 'added', slug: 'dungeons', lead: true },
    { kind: 'added', slug: 'sets_per_keep', lead: true },
    { kind: 'added', slug: 'forty_rungs' },
    { kind: 'added', slug: 'what_falls' },
    { kind: 'added', slug: 'gilded_veil' },
    { kind: 'balance', slug: 'softer_campaign' },
    { kind: 'balance', slug: 'more_chronicle_xp' },
  ]),
  release('0.7.2', '2026-09-21', [
    { kind: 'balance', slug: 'campaign_xp', lead: true },
    { kind: 'balance', slug: 'brew_xp', lead: true },
    { kind: 'balance', slug: 'more_drops' },
    { kind: 'balance', slug: 'rarity_ladder' },
  ]),
  release('0.7.1', '2026-09-21', [
    { kind: 'changed', slug: 'names', lead: true },
    { kind: 'changed', slug: 'bosses_menu', lead: true },
    { kind: 'changed', slug: 'kit_names' },
    { kind: 'changed', slug: 'keys' },
    { kind: 'fixed', slug: 'nothing_lost' },
  ]),
  release('0.7.0', '2026-09-21', [
    { kind: 'added', slug: 'brewery', lead: true },
    { kind: 'added', slug: 'twenty_runs', lead: true },
    { kind: 'added', slug: 'five_stages' },
    { kind: 'added', slug: 'waning_cellar' },
    { kind: 'changed', slug: 'element_wheel' },
  ]),
  release('0.6.0', '2026-09-21', [
    { kind: 'added', slug: 'palace', lead: true },
    { kind: 'added', slug: 'points' },
    { kind: 'added', slug: 'purple_line' },
    { kind: 'added', slug: 'free_reset' },
    { kind: 'changed', slug: 'old_chronicles' },
  ]),
  release('0.5.1', '2026-09-20', [
    { kind: 'content', slug: 'four_champions', lead: true },
    { kind: 'content', slug: 'first_hours' },
  ]),
  release('0.5.0', '2026-09-20', [
    { kind: 'added', slug: 'chronicle_of_changes', lead: true },
    { kind: 'added', slug: 'settings_button' },
    { kind: 'changed', slug: 'title_layout' },
  ]),
  release('0.4.2', '2026-09-20', [
    { kind: 'changed', slug: 'battle_log', lead: true },
    { kind: 'changed', slug: 'log_names' },
    { kind: 'fixed', slug: 'log_colours' },
  ]),
  release('0.4.1', '2026-09-20', [
    { kind: 'fixed', slug: 'ability_icons', lead: true },
    { kind: 'changed', slug: 'ability_rows' },
  ]),
  release('0.4.0', '2026-09-20', [
    { kind: 'changed', slug: 'one_word_names', lead: true },
    { kind: 'changed', slug: 'target_then_ability' },
    { kind: 'changed', slug: 'index_sorted' },
    { kind: 'changed', slug: 'gear_rack' },
    { kind: 'fixed', slug: 'cooldown_on_icon' },
    { kind: 'fixed', slug: 'summon_buttons' },
  ]),
  release('0.3.0', '2026-09-20', [
    { kind: 'added', slug: 'index', lead: true },
    { kind: 'added', slug: 'mark_enemy', lead: true },
    { kind: 'added', slug: 'drag_scroll' },
    { kind: 'changed', slug: 'gear_from_level_1' },
    { kind: 'changed', slug: 'boss_cards' },
    { kind: 'fixed', slug: 'hotkey_clipped' },
  ]),
  release('0.2.0', '2026-09-18', [
    { kind: 'added', slug: 'tower', lead: true },
    { kind: 'added', slug: 'eternal_key' },
    { kind: 'added', slug: 'account_power' },
  ]),
  release('0.1.2', '2026-09-17', [
    { kind: 'fixed', slug: 'battle_log_frame', lead: true },
    { kind: 'fixed', slug: 'summon_gate' },
    { kind: 'fixed', slug: 'champion_facing' },
  ]),
  release('0.1.1', '2026-09-17', [
    { kind: 'changed', slug: 'path_at_level_1', lead: true },
    { kind: 'fixed', slug: 'gear_one_place' },
    { kind: 'changed', slug: 'armoury_by_set' },
  ]),
  release('0.1.0', '2026-09-16', [
    { kind: 'added', slug: 'early_access', lead: true },
    { kind: 'balance', slug: 'economy_measured' },
    { kind: 'fixed', slug: 'screen_errors' },
    { kind: 'changed', slug: 'copy_pass' },
  ]),
  release('0.0.14', '2026-09-16', [
    { kind: 'added', slug: 'tutorial', lead: true },
    { kind: 'added', slug: 'provisions' },
  ]),
  release('0.0.13', '2026-09-16', [
    { kind: 'added', slug: 'path', lead: true },
    { kind: 'content', slug: 'missions' },
    { kind: 'content', slug: 'eldric' },
  ]),
  release('0.0.12', '2026-09-16', [
    { kind: 'added', slug: 'quests', lead: true },
    { kind: 'added', slug: 'points_track' },
  ]),
  release('0.0.11', '2026-09-16', [
    { kind: 'added', slug: 'weekly_boss', lead: true },
    { kind: 'added', slug: 'phases' },
    { kind: 'balance', slug: 'titan_phases' },
  ]),
  release('0.0.10', '2026-09-15', [
    { kind: 'added', slug: 'daily_boss', lead: true },
    { kind: 'added', slug: 'boss_records' },
    { kind: 'added', slug: 'mechanics_sheet' },
  ]),
  release('0.0.9.1', '2026-09-15', [
    { kind: 'balance', slug: 'chest_priced', lead: true },
    { kind: 'fixed', slug: 'chest_materials' },
  ]),
  release('0.0.9', '2026-09-15', [
    { kind: 'added', slug: 'idle_chest', lead: true },
    { kind: 'added', slug: 'farm_tier' },
    { kind: 'fixed', slug: 'silent_summon' },
  ]),
  release('0.0.8', '2026-09-14', [
    { kind: 'added', slug: 'portal', lead: true },
    { kind: 'added', slug: 'pity' },
    { kind: 'added', slug: 'reveal' },
  ]),
  release('0.0.7', '2026-09-14', [
    { kind: 'added', slug: 'forge', lead: true },
    { kind: 'added', slug: 'refine' },
  ]),
  release('0.0.6', '2026-09-14', [
    { kind: 'added', slug: 'gear', lead: true },
    { kind: 'content', slug: 'gear_sets' },
  ]),
  release('0.0.5', '2026-09-14', [
    { kind: 'added', slug: 'tavern', lead: true },
    { kind: 'added', slug: 'ranks' },
  ]),
  release('0.0.4', '2026-09-14', [
    { kind: 'added', slug: 'chronicle_level', lead: true },
    { kind: 'added', slug: 'titles' },
  ]),
  release('0.0.3', '2026-09-13', [
    { kind: 'added', slug: 'campaign', lead: true },
    { kind: 'added', slug: 'stars' },
    { kind: 'added', slug: 'energy' },
  ]),
  release('0.0.2.1', '2026-09-13', [{ kind: 'changed', slug: 'ui_pass', lead: true }]),
  release('0.0.2', '2026-09-13', [
    { kind: 'added', slug: 'battles', lead: true },
    { kind: 'added', slug: 'speeds' },
    { kind: 'added', slug: 'statuses' },
  ]),
  release('0.0.1', '2026-09-12', [
    { kind: 'added', slug: 'champions', lead: true },
    { kind: 'content', slug: 'roster' },
  ]),
  release('0.0.0', '2026-09-12', [
    { kind: 'added', slug: 'emberhold', lead: true },
    { kind: 'added', slug: 'saves' },
  ]),
];

export const RELEASE_BY_ID: Readonly<Record<string, ReleaseDef>> = Object.fromEntries(
  RELEASES.map((r) => [r.id, r]),
);

/** The release the title screen and the panel open on: the newest one. */
export const LATEST_RELEASE: ReleaseDef | undefined = RELEASES[0];
