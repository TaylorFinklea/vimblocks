# Roadmap

## Vision

Deliver Vim-style Logseq DB editing as one reliable, easy-to-install plugin.

## Now

- [x] Consolidate Vimblocks and its PDF companion into one loadable package.
- [x] Repair deterministic normal-mode activation, owned-cursor motion, and
  rendered journal-stream navigation. `tesela-8c9v.4.10`; Logseq 2.0.1 live
  smoke on `tesela-keyboard-audit-2026-07-23`: Esc, second Esc, h/j/k/l,
  x, diw, July 24↔23, command palette, reload, one enabled 0.4.1 card, zero
  renderer/plugin errors. Verify: `pnpm check && pnpm test && pnpm package`.
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
