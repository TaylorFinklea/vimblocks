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
- [ ] B1–B8 README rewrite, drop README_CN, CHANGELOG, attribution, icon, CI
- [ ] C1–C4 disposal/guard audits, relay + exact-once tests
- [ ] C5 written live smoke of R1–R8 against the packaged artifact, then soak
- [ ] D1–D3 Marketplace manifest + submission after the GitHub release

Verify: `pnpm check && pnpm test && pnpm package` (143 tests, tsc clean).

## Blockers

- C5 needs live Logseq; every C0 fix is node/VM-verified only.
- B8 needs an original icon before any Marketplace PR; the current one is
  byte-identical to upstream's, as is `screencast.gif`.
- Installed plugin at `~/.logseq/plugins/vimblocks` is older than `main` and
  still carries both data-loss bugs.

## Open questions

- Panic chord defaulted to Ctrl+Alt+Shift+V without confirmation.
