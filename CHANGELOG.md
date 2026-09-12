# Changelog

All notable changes to ChronicleIdle are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow `CLAUDE.md` §9.3
(`0.0.<phase>` during development, `0.1.0` = Early Access 0.1).

## [Unreleased]

### Added
- Planning phase: engineering constitution (`CLAUDE.md`, `AGENTS.md`), phased `ROADMAP.md`,
  `USER_QUESTIONS.md`, design bible (`docs/design/*`: game design, champions with the full
  EA-0.1 roster, battle rules and formulas, campaign, gear, economy, summoning, bosses, quests
  and the 120-mission Chronicler's Path, tutorial script), technical docs (`docs/tech/*`:
  architecture, UI specification, content authoring, assets inventory, deployment for Ubuntu VPS
  and Vercel, decision records), repository hygiene files.

### Changed
- Planning updated with the owner's answers to all 24 questions (`USER_QUESTIONS.md` §2): party
  size 3 in campaign / 4 in boss fights; daily reset 00:00 local and weekly reset Monday 00:00
  local; skill upgrades via Skill Tomes only; generous energy model (+1/min, cap 60 + 10 per level,
  unlimited reward overflow, ≈ 3,000 early-game provisions); installable PWA + fullscreen-first game
  window; direct pushes to `main`; in-house SFX/VFX generation allowed; ADR-014 accepted and
  ADR-015…020 recorded.
- `docs/tech/ASSETS.md` and `docs/tech/CREDITS.md` now inventory the newly added ambience sets,
  SFX packs and the two VFX packs; the sound map and VFX library in `docs/tech/UI_DESIGN.md` map
  game events to the real files.

### Notes
- No game code exists yet. Phase 0 (Foundation & Game Shell) starts after the owner reviews the
  plan and answers (or defers) the questions in `USER_QUESTIONS.md`.
