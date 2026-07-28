# Current State

## Branch
`main`; ahead of `origin/main`; nothing pushed.
Rollback refs: `codex/vim-daily-parity`, `codex/db-natural-capture`.
## Plan
Publishing v1.0.0; plan: `~/.claude/plans/here-is-a-handoff-soft-truffle.md`.
- [x] A1–A6, B1–B7, C0.1–C0.7, C1–C4 complete
- [ ] B8 original icon — Taylor; blocks Marketplace PR
- [x] C5 run 2: R3/R6/S6 failed; R2 human-verified pass
- [x] R3/R6/S6 regression tests + fixes; candidate rebuilt
- [?] C5 full rerun awaiting human verification against updated artifact
- [ ] D1–D3 Marketplace manifest + submission after GitHub release
Verify: `pnpm check && pnpm test && pnpm package` (150 tests, tsc clean).
## Blockers
- C5 full live rerun required: host bridge changed; installed copy is old.
- Original icon pending; blocks Marketplace PR, not GitHub release.
## Open questions
- None.
