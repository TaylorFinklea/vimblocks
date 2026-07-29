# Current State

## Branch
`main`; `origin/main` @ `71d29be` passed CI; local plan may be ahead; v1
untagged/unreleased. Rollback refs: `codex/vim-daily-parity`,
`codex/db-natural-capture`.
## Plan
Publishing v1.0.0; plan: `phases/v1-final-release-spec.md`.
- [x] Implementation, automated gates, remote CI, and Run 1–4 evidence
- [ ] Final candidate: aqua icon + `Vimblocks` HTML title
- [ ] Install exact package; `diff -rq`; Run 5 R5/R3/S6
- [ ] Bounded soak: 3 sessions, 2 days, 90 minutes, 6 reloads
- [ ] Action image/GIF + Marketplace manifest draft
- [ ] Draft release → CI asset verify → publish → Marketplace PR
Verify: `pnpm check && pnpm test && pnpm package` (151 tests, tsc clean).
## Blockers
- Installed `index-DBbYuxDA.js` differs from package `index-DFkx69Z8.js`.
- Selected aqua icon remains in `ai-scratch`; Taylor must place `icon.png`.
## Open questions: none
