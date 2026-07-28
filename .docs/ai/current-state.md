# Current State

## Branch

`main` at `de7f501`; ahead of `origin/main`; nothing pushed.
Rollback refs kept: `codex/vim-daily-parity`, `codex/db-natural-capture`.

## Plan

Publishing v1.0.0 (GitHub + Marketplace). Plan:
`~/.claude/plans/here-is-a-handoff-soft-truffle.md`.

- [x] A1 merge parity wave to `main`; retire worktree
- [x] C0.1 stale-cursor off-screen deletion (data loss)
- [x] C0.7 linewise batch rollback (data loss)
- [x] C0.2 host-bridge trust boundary; C0.3 liveness + panic chord
- [x] C0.4 teardown survives failing disposer; C0.5 no DOM-mutating highlights;
      C0.6 capture set gated on normal mode
- [x] A2–A6 id `vimblocks`, version 1.0.0, slim manifest, stable archive root
- [x] C1–C4 disposal/guard audits, relay + exact-once tests; found and fixed
      `s q` (Search Cleanup had no dispatch route at all)
- [x] B1–B7 README rewritten, README_CN + screencast deleted, CHANGELOG,
      attribution, About dialog, CI on push/PR, draft-release gate
- [ ] B8 original icon (Taylor is designing it) — blocks the Marketplace PR
- [ ] C5 written live smoke of R1–R8 against the packaged artifact, then soak
- [ ] D1–D3 Marketplace manifest + submission after the GitHub release

Verify: `pnpm check && pnpm test && pnpm package` (148 tests, tsc clean).

## Blockers

- C5 needs live Logseq; every C0 fix is node/VM-verified only.
- `icon.png` is still byte-identical to upstream's; Taylor is designing a
  replacement. Blocks the Marketplace PR, not the GitHub release.
- Installed plugin at `~/.logseq/plugins/vimblocks` is older than `main` and
  still carries both data-loss bugs.

## Open questions

- Panic chord defaulted to Ctrl+Alt+Shift+V without confirmation.
