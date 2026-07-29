# Current State

## Branch
`main`; `v1.0.0-rc.1` published from `10c04ff`; final v1 unreleased.
Rollback refs: `codex/vim-daily-parity`,
`codex/db-natural-capture`.
## Plan
Publishing v1.0.0-rc.1 for two-day device soak; final plan:
`phases/v1-final-release-spec.md`.
- [x] Implementation, automated gates, remote CI, and Run 1–4 evidence
- [x] RC candidate: aqua icon + `Vimblocks` title + 151 tests/package
- [x] RC published; CI asset exact-match verified; SHA `0f982232…499d5`
- [ ] Manual multi-device soak: 3 devices, 2 days; `phases/v1-soak.md`
- [ ] Final artifact install/diff; Run 5 R5/R3/S6
- [ ] Action image/GIF + Marketplace manifest draft
- [ ] Final v1.0.0 draft → exact asset verify → publish → Marketplace PR
Verify: `CI=true pnpm check`, `CI=true pnpm test`, `CI=true pnpm package`.
## Blockers
- Computer Use timed out; RC live checks must be performed manually.
## Open questions: none
