# DB Natural Task Capture Spec

## Scope

- Experimental branch: `codex/db-natural-capture`
- Bead: `tesela-8c9v.4.12`
- Logseq DB only; no Markdown task or property syntax
- Command palette entry plus configurable non-editing shortcut
- Capture inserts a sibling after the selected or Vim-owned cursor block
- Deterministic local parser; no network or model dependency

## Grammar

- Required: non-empty task title
- Scheduled date: `today`, `tod`, `tomorrow`, or `tom`
- Deadline date: `due today`, `due tod`, `due tomorrow`, or `due tom`
- Time: `at H`, `at H:MM`, with optional `am` or `pm`
- Priority: `p1` → Urgent, `p2` → High, `p3` → Medium, `p4` → Low
- Bare `at 8` means 08:00 local time and is shown in the preview before create
- Unrecognized text remains part of the title

## DB Mutation

- Insert plain title text; never emit `TODO`, `SCHEDULED`, or `property::`
- Set `:logseq.property/status` to `Todo`
- Set optional `:logseq.property/priority` to the parsed DB choice title
- Set optional `:logseq.property/scheduled` to local epoch milliseconds
- Set optional `:logseq.property/deadline` to local epoch milliseconds
- Remove the newly inserted block if a property write fails

## Interaction

- Open `Vimblocks: Capture DB task` or its shortcut
- Preserve selected/Vim-owned block UUID before opening the plugin input
- Live preview shows title, Status, Priority, Scheduled, and destination
- Enter creates; Esc cancels without mutation
- Success returns to Logseq with no capture overlay left open

## Verify

- `pnpm check && pnpm test && pnpm package`
- Install into `/Users/tfinklea/.logseq/plugins/vimblocks`
- Live-test only `tesela-keyboard-audit-2026-07-23` in Logseq 2.0.1
- Confirm DB task UI/properties, parser example, cancel path, command palette,
  plugin dashboard, reload lifecycle, and renderer/plugin errors
- Rollback: restore the pre-test stable-plugin backup and reload Logseq
