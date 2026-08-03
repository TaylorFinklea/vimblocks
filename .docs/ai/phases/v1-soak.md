# Vimblocks 1.0.0-rc.2 Multi-Device Soak

## Artifact

- Tag: `v1.0.0-rc.2`
- Release URL:
  https://github.com/TaylorFinklea/vimblocks/releases/tag/v1.0.0-rc.2
- CI ZIP SHA-256:
  `5176361e93e373b3927b9c92a9b0f76be48074ee5b72367b35a7891b5ecc8b79`
- Runtime asset: `assets/index-D921PFYj.js`; CI extraction matches local
- Period: starts 2026-07-29
- Scope: three devices; scratch/disposable graphs only

Restart ledger:
- `v1.0.0-rc.1` soak cannot certify final 1.0.0 after the rc.2 capture
  component and parser-segmentation runtime change.

## Safety

- Do not test on irreplaceable notes.
- Each device must install the ZIP attached to the GitHub prerelease, not a
  source checkout or locally rebuilt package.
- A data-loss, text-corruption, focus-trap, key-theft, load, disposal, or
  double-dispatch failure stops the soak. Preserve the page and exact steps.

## Per-Device Install Evidence

| Device | Logseq version | ZIP digest verified | Vimblocks card/version | Icon | Load/console |
|---|---|---|---|---|---|
| Primary Mac | | | | | |
| Device 2 | | | | | |
| Device 3 | | | | | |

## Required Checks on Each Device

1. R5 load: exactly one enabled Vimblocks `1.0.0-rc.2` card, aqua icon, no
   Ready Error. Record any new renderer-console error.
2. R3 focus: in `R3 fresh target`, run Esc → `i` → type `a` → Esc three
   times. All three edits must remain on that block. Open Vimblocks settings;
   close once with title Close, once with Cancel, and once with unsaved-change
   Confirm. After each, a fresh block must immediately accept exact
   `focus recovered`. The mode indicator must read `NORMAL` after Esc, `INSERT`
   after `i`, and return to `NORMAL` after the next Esc without lag or overlap.
3. R6 key ownership: from an active Vim cursor, type exact
   `Open Vimblocks settings` in the command palette and exact `tomorrow` in a
   Scheduled/date-picker input. Also type a unique value in the property
   editor. No missing, reordered, or Vim-interpreted characters.
4. R8 dispatch: with siblings `one`, `two`, `abc`, use `dd` on `one` and `x`
   on `abc`. Expected: only `one` is removed; `abc` becomes `bc`.
5. R1 stale cursor: on Page A create `alpha`, `beta`, `gamma`; leave the Vim
   cursor on `beta`, navigate to Page B, press `dd`, return. Page A must still
   contain exactly the original three blocks in order.
6. R1b subtree: create parent → child → grandchild plus a root sibling. On the
   parent press `V`, `y`, move to the sibling, `p`. Expected root order:
   parent subtree, sibling, copied parent subtree; no flattening or extras.
7. S1/S2 release: separately use the panic chord and
   `Vimblocks: Disable key capture`; after each, normal-mode letters must reach
   Logseq as literal text. Reload Vimblocks to restore capture.
8. S4/S5/S6: switch the boundary profile and reload; run `s q`; create
   `test task tom at 8 p1`; open a selected DB-backed PDF inline. Record exact
   task properties and any PDF loader error.
9. Toggle Vimblocks off/on twice. After each cycle, repeat one `x` and one
   `dd` probe and confirm single dispatch.

## Session Ledger

Minimum before final 1.0.0: at least 3 sessions across 2 calendar days,
90 cumulative active minutes, and 6 total plugin reload/restart cycles.

| Date/time | Device | Minutes | Reloads | Checks run | Result / exact observation |
|---|---|---:|---:|---|---|
| | | | | | |

## Failures

For each failure record: device, Logseq version, exact starting blocks/text,
keystrokes, observed result, expected result, cursor/focus location, console
output, and whether reload recovered usability.

## Result

2026-07-31: Taylor confirmed no R1-R8 failures. Session, minute, reload, and
device totals were left blank, so the required bounded-soak evidence remains
pending; do not record `SOAK: pass` or publish final 1.0.0 until supplied.

2026-08-03 user attestation:
- Successful use across 4 business days and 3 devices, with several reloads.
- No soak-blocking failure reported.
- Known follow-up: DB task Capture opens without keyboard focus and requires a
  mouse click in the input box; accepted for Marketplace-release follow-up.
- User confirmed the conservative release-gate floor: 3 sessions, 90
  cumulative active minutes, and 6 plugin reload/restart cycles.

RC.2 SOAK: pass (3 sessions, 90 minutes, 6 reloads)

## RC.3 Restart — 2026-08-03

- Taylor chose to fix Capture autofocus before Marketplace submission and
  repeat the bounded soak rather than defer the fix to 1.0.1.
- The autofocus fix changes `src/**`, so the successful rc.2 soak remains
  historical evidence but cannot certify rc.3 or final 1.0.0.
- Local rc.3 candidate: `release/vimblocks-1.0.0-rc.3.zip`; SHA-256
  `9e6ca57c862ccd51bbeaaea17ed74c125511dd4e4f90220f784d408ff1696da3`;
  runtime `assets/index-DvarLuei.js`.
- Exact expanded rc.3 tree installed byte-for-byte on the primary Mac. After
  the overlay became visible, its text field was already focused and accepted
  exact `focus probe` without a mouse click; the capture was canceled.
- Restarted minimum: 3 sessions across 2 calendar days, 90 cumulative active
  minutes, 6 reload/restart cycles, and all three devices using the exact
  published rc.3 ZIP.

SOAK: pending (RC.3 candidate not published; restarted budget not begun)
