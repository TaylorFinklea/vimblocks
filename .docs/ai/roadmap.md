# Roadmap

## Vision

Deliver Vim-style Logseq DB editing as one reliable, easy-to-install plugin.

## Now

- [ ] Deliver Vimblocks 0.5.0 daily Vim parity with counts, composable
  operators, repeat/history, insert transitions, rendered-view search,
  character navigation, `v`/`V`, and persistent Vim-first/Logseq-first
  profiles. `tesela-8c9v.4.16`; spec:
  `.docs/ai/phases/vim-daily-parity-spec.md`; plan:
  `.docs/ai/phases/vim-daily-parity-plan.md`. Run isolated phases without human
  re-planning, then one comparative disposable-graph product test.
  Verify: `pnpm check && pnpm test && pnpm package` plus the spec's complete
  Logseq 2.0.1 live matrix.
- [x] Consolidate Vimblocks and its PDF companion into one loadable package.
- [x] Repair deterministic normal-mode activation, owned-cursor motion, and
  rendered journal-stream navigation. `tesela-8c9v.4.10`; Logseq 2.0.1 live
  smoke on `tesela-keyboard-audit-2026-07-23`: Esc, second Esc, h/j/k/l,
  x, diw, July 24↔23, command palette, reload, one enabled 0.4.1 card, zero
  renderer/plugin errors. Verify: `pnpm check && pnpm test && pnpm package`.
- [x] Add owned-cursor `w`, viewport-based Ctrl-U/Ctrl-D, and a validated
  cursor-color setting. `tesela-8c9v.4.11`; Logseq 2.0.1 live smoke on the
  disposable graph: `w`, second-Esc `w`, h/j/k/l, July 24↔23, Ctrl-D/Ctrl-U,
  x, diw, custom cyan and restored yellow cursor, normal palette Esc, one
  enabled 0.4.1 card, zero renderer/plugin errors. Verify:
  `pnpm check && pnpm test && pnpm package`.
- [x] Prototype DB-native natural-language task capture on isolated branch
  `codex/db-natural-capture`. `tesela-8c9v.4.12`; parse
  `do this thing tom at 8 p1`, preview the result, and create a Logseq DB
  Todo/Urgent task scheduled tomorrow at 08:00 without Markdown task syntax.
  Verify: `pnpm check && pnpm test && pnpm package` plus disposable-graph UI.
- [?] Verify the file-backed PDF correction in physical Logseq 2.0.1 on
  `tesela-keyboard-audit-2026-07-23`; Computer Use `get_app_state` timed out
  twice on 2026-07-24. Verify: select the encoded `file://` PDF block, run
  `Open selected PDF inline`, confirm page 1 renders with no console error.

## Next

- [ ] Submit Vimblocks to the official Logseq Marketplace.

## Later

- [ ] Complete the five-day Logseq keyboard pilot.

## Constraints

- Preserve the `logseq-plugin-vim-shortcuts` plugin ID.
- Keep unpacked installations in permanent directories.
