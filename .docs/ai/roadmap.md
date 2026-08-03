# Roadmap

## Vision

Deliver Vim-style Logseq DB editing as one reliable, easy-to-install plugin.

## Now

- [ ] Publish Vimblocks **1.0.0** to GitHub, then submit a Logseq Marketplace
  listing. Plan: `.docs/ai/phases/v1-final-release-spec.md`.
  Current: `v1.0.0-rc.2` is published; human capture/mode UI verification
  passed. Local final metadata and immutable workflow action pins are prepared.
  Exact final package install/diff and focused R5/R3/S6 Run 5 passed. The soak
  passed across 4 business days and 3 devices at the confirmed conservative
  floor of 3 sessions, 90 active minutes, and 6 reloads.
  Original action image is in README; four local/origin release tags are
  aligned. Remaining before final: Capture autofocus policy, final draft
  release verification, and Marketplace PR.
  Verify: `pnpm check && pnpm test && pnpm package`, then the live smoke.
  Caveat: Marketplace approval is not ours to control — Logseq reviews
  `effect: true` plugins more strictly with no guarantee — so the GitHub
  release must stand alone.
- [ ] Fix DB task Capture autofocus before Marketplace submission: opening
  Capture currently requires a mouse click in the input box before typing.
  Rebuild/reinstall the exact artifact; verify the shortcut opens with the
  input focused and accepts typing without mouse interaction, then rerun the
  affected load/focus smoke checks.
- [x] Deliver daily Vim parity with counts, composable operators,
  repeat/history, insert transitions, rendered-view search, character
  navigation, `v`/`V`, and persistent Vim-first/Logseq-first profiles.
  `tesela-8c9v.4.16`; merged to `main` as the 1.0.0 candidate. Shipped as
  1.0.0 rather than 0.5.0; the separate freeze-then-rebuild step was dropped.
- [x] Fix the defects found by independent architecture review before v1: two
  data-loss classes (stale-cursor off-screen mutation, un-rolled-back linewise
  inserts), the host-bridge trust boundary, orphaned key capture, throw-fragile
  teardown, DOM-mutating highlights, and an always-on capture set.
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
- [x] Verify the corrected DB asset-UUID PDF call from the exact packaged
  artifact in physical Logseq 2.0.1. Run 4 used an older installed bundle;
  install `release/vimblocks/`, require `diff -rq` clean, then run the existing
  `S6 PDF` probe with no renderer-console error.

## Next

- [ ] Post-v1: non-QWERTY keyboard layouts. `public/key-token.js` tokenizes by
  physical `event.code`, so an AZERTY user pressing "A" emits token `q` —
  wrong commands fire and wrong keys get swallowed. Shipping v1 with this as a
  documented README limitation; a real fix is a feature, not a patch.
- [ ] Post-v1: `operators.ts` performs sequential removals and records native
  history only after success, so a mid-sequence failure leaves partial mutation
  ungrouped for undo. Not silent — the deletions are visible and Logseq's
  per-step undo still covers them — so it did not block v1.
- [ ] Post-v1: replace the host-bridge postMessage plane with a direct object
  reference. `effect: true` already makes both frames same-origin, so this also
  deletes the `optimisticNormalMode`/`optimisticCaptureAll` mirroring that
  exists only to paper over async messaging.

## Later

- [ ] Measure the per-keypress full-DOM scan in `host-bridge.js` on a 1000+
  block page; optimize only if it shows.
- [ ] Give the body MutationObserver a timeout so an unfired one does not watch
  for the whole session.

## Constraints

- Ship under the `vimblocks` plugin ID; keep the installed directory named
  exactly `vimblocks`, because Logseq derives plugin and settings identity from
  the directory name. See `decisions.md` 2026-07-27, which supersedes the
  earlier constraint to preserve `logseq-plugin-vim-shortcuts`.
- Keep unpacked installations in permanent directories.
