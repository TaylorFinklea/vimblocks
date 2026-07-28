# Vimblocks 1.0.0 release smoke

Written before execution. Each class has a concrete starting state and an
explicit pass condition, so a run is repeatable and a failure is unambiguous.

## Environment

- Application: `/Applications/Logseq.app` (2.0.1)
- Graph: **`tesela-keyboard-audit-2026-07-23` only.** Never `taylor`
  (production), never Tesela.
- Artifact under test: `release/vimblocks/` staged from
  `release/vimblocks-1.0.0.zip` — the packaged output, not a dev build.
- Install path: `~/.logseq/plugins/vimblocks`
- Backup: `~/.logseq/plugin-backups/vimblocks-pre-1.0.0-<stamp>`
- Rollback: `rm -rf ~/.logseq/plugins/vimblocks && ditto <backup> ~/.logseq/plugins/vimblocks`

## Preconditions

- P1 Logseq is on the disposable graph. **Abort if not.**
- P2 The installed plugin was backed up and the backup diffed clean.
- P3 Exactly one Vimblocks card, version 1.0.0, enabled.

## Bug bar

Any occurrence blocks the tag.

| | Class | Setup | Oracle |
|---|---|---|---|
| **R1** | Data loss | Page A has blocks `alpha`/`beta`/`gamma`. Put the cursor on `beta`, navigate to another page, press `dd`. | Page A unchanged. Nothing deleted off-screen. |
| **R1b** | Subtree integrity | A parent with one child and one grandchild, plus a sibling. `V` then `y`, move, `p`. | Hierarchy and sibling order reproduced exactly; no flattening or duplication. |
| **R2** | Text corruption | Enter a block, type `jkiv ciw daw C D ^ :/~`, Esc. | Text is exactly what was typed. No swallowed or reordered characters. |
| **R3** | Focus trap | Esc to normal, `i` to insert, Esc again, repeat 3×. Then Esc with nothing focused. | Always returns to a usable state. Never needs a restart to type. |
| **R4** | Disposal | Toggle the plugin off, then on, twice. | Keys still work after each cycle. No doubled command execution. No console errors. |
| **R5** | Load | Open the plugins dashboard. | Exactly one Vimblocks card at 1.0.0, enabled, no Ready Error. Renderer console clean on load. |
| **R6** | Key theft | With the command palette open, type letters. Repeat for global search, the task-status picker, the date picker, and a block's property editor. | Every surface receives its own keystrokes. Vimblocks swallows nothing. |
| **R7** | Trust boundary | Not reachable from the UI; covered by `tests/public-host-bridge.test.ts`. | Recorded as test-covered, not live-verified. |
| **R8** | Double dispatch | `dd` on a block with a known sibling count. `x` on a known character. | Exactly one block deleted, exactly one character removed. |

## Also verify

- **S1** Escape hatch: `Ctrl+Alt+Shift+V`, then confirm normal-mode keys reach
  Logseq as ordinary text. Reload to restore.
- **S2** Palette command `Vimblocks: Disable key capture` does the same.
- **S3** Settings survived the plugin-id change: cursor colour is still
  `#18cae6`, capture shortcut still `ctrl+shift+t`, profile still
  `logseq-first`. **This is the open question from the plan** — settings are
  keyed by install directory, so the id change should be invisible.
- **S4** Boundary profile switch persists across a plugin reload.
- **S5** `s q` (Search Cleanup) runs — it had no dispatch route before
  `7c91497`.
- **S6** DB task capture (`ctrl+shift+t`) and `Open selected PDF inline`.

## Run 1 — 2026-07-28, partial (blocked)

Environment prepared successfully; interactive portion blocked on Computer Use.

**Prepared**
- P1 ✅ Graph confirmed `tesela-keyboard-audit-2026-07-23` by screenshot before
  anything was touched. Production graph never opened.
- P2 ✅ Backup at `~/.logseq/plugin-backups/vimblocks-pre-1.0.0-20260728-074523`,
  diffed clean. Prior install also moved aside to
  `vimblocks-replaced-1.0.0-<stamp>` rather than deleted.
- Logseq quit gracefully, `release/vimblocks/` installed, `diff -rq` confirms
  the install matches the packaged artifact byte for byte. Relaunched.

**Verified without the GUI**
- **S3 ✅ PASS — and this closes the plan's open question.** After relaunching
  under the new id, `~/.logseq/settings/vimblocks.json` was rewritten at
  07:46:00 and still holds `cursorColor: #18cae6`,
  `dbTaskCaptureShortcut: ctrl+shift+t`, `vimBoundaryProfile: logseq-first`,
  `settingsVersion: v6`, and all 93 keybindings. No new settings file appeared
  under any other key; `logseq-plugin-vim-shortcuts.json` is untouched since
  Jul 23. **Settings are keyed by install directory, so the id change is
  invisible to users** — and skipping the A5 migration was correct.
- **R5 partial ✅** — the plugin loaded. Logseq started at 07:45:59 and
  `vimblocks.json` was written at 07:46:00, i.e. the plugin initialising one
  second later, from files already diffed byte-identical to the 1.0.0
  artifact. Card count and renderer-console cleanliness still need the UI.
- **Logseq's own log proves the identity model.** `~/Library/Logs/Logseq/main.log`
  records the plugin as `:id "vimblocks"` with `:url ".../plugins/vimblocks"`
  on 2026-07-25 at `:version "0.4.1"` and on 2026-07-28 at
  `:version "0.5.0-capture.1"` — both builds whose manifest declared
  `logseq.id: "logseq-plugin-vim-shortcuts"`. **Logseq derives plugin identity
  from the installed directory name and ignored the manifest id entirely for
  unpacked installs.** So the id switch is a no-op locally, which is why no
  settings moved; it matters only for a Marketplace install, where the
  directory comes from the package name. This is direct evidence, not
  inference, and it retires the "verify for Marketplace installs" open item
  for the unpacked case.

**Blocked**
- Every interactive class (R1, R1b, R2, R3, R4, R6, R8, S1, S2, S4, S5, S6).
- Cause: `screenshot` failed repeatedly — first `CU display unavailable`, then
  `Screenshot capture returned nil (permission missing or SCContentFilter
  failure)` after switching monitors. Points at macOS Screen Recording
  permission for the Computer Use helper, not a transient glitch. Consistent
  with the `get_app_state` timeouts recorded on 2026-07-24.
- Retried across six distinct strategies: plain retry, display reset to auto,
  an 8s wait, re-opening Logseq, switching to the second monitor, and
  re-requesting access to rebind the native screenshot filter to the
  relaunched process. The access grant stayed live throughout (tier `full`),
  so this is the capture layer, not the allowlist. Stopped rather than
  looping.

**State left behind:** 1.0.0 is installed and Logseq is running it. Rollback:

```bash
rm -rf ~/.logseq/plugins/vimblocks
ditto ~/.logseq/plugin-backups/vimblocks-pre-1.0.0-20260728-074523 ~/.logseq/plugins/vimblocks
```

## Result

Record per class: pass/fail, what was observed, and any console output. A
finding does not reset the gate — fix it, add a regression test, and re-run
only the classes the fix could affect. Full re-run only if the fix touches the
host bridge or the disposal path.

### Run 2 — 2026-07-28, live Logseq 2.0.1

Environment:
- Graph visibly confirmed `tesela-keyboard-audit-2026-07-23` before input.
  No other graph or project opened.
- Scratch page: `Vimblocks 1.0.0 Smoke 2026-07-28 1102`.
- Dashboard: exactly one installed plugin/card; `Vimblocks 1.0.0`,
  `ID: vimblocks`, enabled; no Ready Error.
- Final renderer-console snapshot: 299 messages, zero exposed
  `Uncaught`/`TypeError`/`ReferenceError`/`RangeError`/`SyntaxError`/
  `Ready Error`/explicit error entries. Earlier snapshot exposed two generic
  DevTools warning/breaking-change notices, not renderer exceptions.

Classes:
- **R1 PASS** — before: `R1 alpha`, `R1 beta`, `R1 gamma` (3 blocks).
  Focused `R1 beta`, Esc to normal, opened Journals, pressed `dd`, returned to
  the fixture page. After: all three blocks still present, same text and order;
  no off-screen deletion.
- **R1b PASS** — source hierarchy was root `R1b2 parent` → child
  `R1b2 child` → grandchild `R1b2 grandchild`, followed by root sibling
  `R1b2 sibling`. Physical `Shift+V`, `y`, move to sibling, `p` produced one
  additional root parent with one child and one grandchild after the sibling.
  No flattening or duplicated descendants. A first `press_key("V")` attempt
  was an automation-token mismatch and pasted the prior register; the physical
  shifted-key retry exercised the intended command.
- **R2 PASS (human physical-keyboard follow-up)** — typed
  `jkiv ciw daw C D ^ :/~`; observed stored text
  `jkiv ciw daw C D ^ :/~~`. Logseq inserted the second `~` as its normal
  paired-delimiter closing behavior. The same result had already reproduced
  with Vimblocks disabled, so no Vimblocks-dependent corruption occurred.
- **R3 FAIL** — the specified three Esc → `i` → Esc cycles passed: each Esc
  focused the host document and each `i` returned to the same `R3 target`
  editor; an extra unfocused Esc also recovered with `i`. Later, opening
  `Open Vimblocks settings` and clicking its Close button left focus trapped
  in the hidden plugin iframe
  (`lsp://logseq.com/plugins/vimblocks/index.html?__v__=1.0.0`). Page links
  still navigated, but block clicks, command-palette shortcuts, the panic
  chord, and `ctrl+shift+t` could not regain host focus. A renderer reload was
  required. Prior-build regression status: unknown; backup comparison not run.
- **R4 PASS** — dashboard toggle cycles:
  `1 → 0 → 1`, then `1 → 0 → 1`. One card remained. After both cycles,
  selected `bcde`, pressed `x`, observed `cde` (one character only). No
  explicit renderer-console errors.
- **R5 PASS** — one `Vimblocks 1.0.0` card, enabled, `ID: vimblocks`, no Ready
  Error. Renderer console had no explicit error entries.
- **R6 FAIL** — command palette accepted exact `Vimblocks`; initial global
  search accepted exact `Vimblocks 1.0.0 Smoke 2026-07-28 1102`; task-status
  picker accepted exact `Doing`; date picker accepted exact `tomorrow`; block
  property editor accepted exact `smokeprop`. Failure reproduction:
  1. Focus `S6 task target`, Esc to Vim normal mode.
  2. Open Logseq global search with `Cmd+K`.
  3. Type exactly `Add task status`.
  4. Observed search value `dd. taskstatus`; expected `Add task status`.
  The same search surface had accepted exact input before a normal-mode cursor
  was active. This is consistent with normal-mode capture leaking into a host
  surface. Prior-build regression status: unknown; backup comparison not run.
- **R7 TEST-COVERED** — not live-reachable; retained coverage in
  `tests/public-host-bridge.test.ts`.
- **R8 PASS** — `abcde` at column 0 + `x` became `bcde`, with both known
  siblings still present. `dd` on `R8 sibling one` removed that block only;
  `R8 sibling two` remained.

Additional checks:
- **S1 PASS (capture release)** — `Ctrl+Alt+Shift+V` prevented selected-block
  `ddx` from executing as Vim operations; the selected `panic` block remained.
  At document-body focus Logseq ignored the ordinary letters rather than
  inserting them. Off/on reload restored capture.
- **S2 PASS (capture release)** — palette command
  `Vimblocks: Disable key capture` likewise prevented `ddx` from executing
  Vim operations on the selected block. Off/on reload restored capture.
- **S3 PASS** — live settings UI showed `cursorColor: #18cae6`,
  `dbTaskCaptureShortcut: ctrl+shift+t`, and boundary profile
  `logseq-first`.
- **S4 PASS** — changed boundary profile to `vim-first`, toggled plugin
  off/on, reopened settings, and observed persisted `vim-first`. Restored
  `logseq-first`, toggled off/on again, and left Vimblocks enabled.
- **S5 PASS** — with `S5 search cleanup` selected, `s q` returned focus to the
  host document, preserved the block, and produced no explicit console error.
- **S6 FAIL (PDF half)**:
  - DB task capture passed. `test task tom at 8 p1` previewed title
    `test task`, Status `Todo`, Priority `Urgent`, Scheduled
    `Wed, Jul 29, 8:00 AM`; creation produced a `#Task` block scheduled
    `Tomorrow 08:00` and notification `DB task captured.`
  - PDF failed. The selected scratch block was
    `[S6 PDF](file:///Users/tfinklea/logseq/graphs/tesela-keyboard-audit-2026-07-23/assets/6a6207bb-ffd9-4f72-a4e2-fdbb85550197.pdf)`.
    The file exists on disk, and the link matches the command's accepted
    `file://...pdf` shape. `Open selected PDF inline` reported:
    `Error: Missing PDF "file:///Users/tfinklea/logseq/graphs/tesela-keyboard-audit-2026-07-23/assets/6a6207bb-ffd9-4f72-a4e2-fdbb85550197.pdf". Is this the correct path?`
    No viewer opened. Prior-build regression status: unknown; this correction
    had not previously completed its physical Logseq gate.

SMOKE: fail (R3, R6, S6)

### Post-run fixes — 2026-07-28

- **R3 fixed in source** — settings close only hid the Pinia dialog, leaving
  Logseq's plugin iframe focused but invisible. The close path now hides the
  main plugin UI with cursor restoration. Regression:
  `tests/settings-dialog.test.ts`.
- **R6 fixed in source** — the host bridge classified only `event.target`.
  Logseq global search can focus its text field while a keydown is still
  retargeted at the previously active block. Capture now also yields when
  `document.activeElement` is a host text-entry surface. Regression:
  `tests/public-host-bridge.test.ts`.
- **S6 fixed in source** — `Editor.openPDFViewer` takes the selected block UUID;
  extracting and passing its `file://` URL reproduced Logseq's Missing PDF
  error. File-backed blocks now use their UUID. Regression:
  `tests/open-pdf-command.test.ts`.
- Red/green evidence: the three new expectations failed against `50afebe`,
  then passed after the fixes.
- Automated gates: `pnpm check` clean; `pnpm test` 150/150; `pnpm package`
  rebuilt `release/vimblocks-1.0.0.zip`.
- The rebuilt artifact was **not** copied into the running Logseq install.
  Live status remains failed until the checklist below is completed.

### Human verification required

Only use graph `tesela-keyboard-audit-2026-07-23`. Stop immediately if the
sidebar shows any other graph. Never open `taylor` or the Tesela project.

1. Quit Logseq, replace `~/.logseq/plugins/vimblocks` with the newly rebuilt
   `release/vimblocks/`, relaunch, and visibly verify the disposable graph
   name before typing. Keep the existing
   `vimblocks-pre-1.0.0-20260728-074523` backup.
2. Because R6 changes `public/host-bridge.js`, rerun the complete R1–R8 and
   S1–S6 table above, not only the three failed cases. Record exact before and
   after text, block counts, cursor position, and renderer-console errors.
3. **R2 HUMAN PASS — complete.** Physical-keyboard input of
   `jkiv ciw daw C D ^ :/~` produced
   `jkiv ciw daw C D ^ :/~~`. The second `~` is Logseq's expected
   paired-delimiter closing behavior, reproduced independently of Vimblocks.
4. Probe **R3** beyond the three Esc → `i` → Esc cycles: open
   `Open Vimblocks settings`, close it with the title-bar close button, and
   immediately click a fresh scratch block and type `focus recovered`.
   Repeat through the Cancel button and through the unsaved-changes Confirm
   path. Expected: all three return focus without a renderer reload.
5. Probe **R6** from an active Vim cursor: select `S6 task target`, press Esc,
   open global search with Cmd+K, and type exactly `Add task status`. Expected
   query: `Add task status`, not `dd. taskstatus`. Repeat exact letter input in
   the command palette, task-status picker, date picker, and property editor.
6. Probe **S6 PDF**: select the existing `S6 PDF` link block and run
   `Open selected PDF inline`. Expected: page 1 renders inline and the
   renderer console contains no Missing PDF error.
7. For **S1/S2**, use a focused scratch editor when checking ordinary text:
   after the panic chord and after `Vimblocks: Disable key capture`, type
   `ddx`. Expected: literal `ddx`; no delete or character operation. Reload
   the plugin between checks.

Record the rerun immediately below this checklist and end it with exactly
`SMOKE: pass` or `SMOKE: fail (<classes>)`.

### Run 3 — 2026-07-28, rebuilt candidate in live Logseq 2.0.1

Environment:
- Installed `release/vimblocks/` after moving the failed candidate to
  `~/.logseq/plugin-backups/vimblocks-failed-smoke-20260728`; `diff -rq`
  confirmed the install was byte-identical to the rebuilt artifact.
- Graph visibly confirmed `tesela-keyboard-audit-2026-07-23` before input.
  No other graph or project opened.
- Scratch pages: the Run 2 page plus
  `Vimblocks 1.0.0 Smoke Fix Rerun 2026-07-28`. Rapid Computer Use fixture
  creation mangled several new fixture strings; those blocks were excluded.

Classes:
- **R1 PASS** — verified replacement fixture before:
  `R1H alpha` / `R1H beta` / `R1H gamma` (3 blocks). Focused `R1H beta`,
  navigated away, pressed `dd`, returned. After: the same 3 blocks, same text
  and order; no off-screen deletion.
- **R1b BLOCKED** — existing source hierarchy remained parent → child →
  grandchild plus sibling, with one prior copied hierarchy. `V`, `y`, move,
  `p` did not produce a new copy through Computer Use, so hierarchy replay
  could not be judged. Run 2 passed this class; no pass is inferred here.
- **R2 PASS (human result retained)** — physical input
  `jkiv ciw daw C D ^ :/~` stored `jkiv ciw daw C D ^ :/~~`; the second `~`
  is Logseq's independently reproduced paired-delimiter behavior.
- **R3 FAIL** — starting from the `R3 target` editor, the first Esc → `i`
  left focus on the host HTML document rather than an editor. The next two
  cycles focused the previously remembered `R1b2 parent`, not `R3 target`;
  Esc still returned to the host and no restart was needed. Run 2 had returned
  all three cycles to `R3 target`, so this is a regression from that run.
  The repaired settings-close paths themselves passed: title Close, Cancel,
  and unsaved-changes Confirm each removed the plugin frame and immediately
  accepted exact scratch text `focus recovered title-close`,
  `cancel recovered`, and `confirm recovered`.
- **R4 PASS** — dashboard cycles were `1 → 0 → 1` twice; exactly one card
  remained. After the cycles, `cde` + `x` became `de`, and `dd` removed only
  `R8 sibling one`; no doubled execution.
- **R5 PASS** — exactly one enabled `Vimblocks 1.0.0` card, `ID: vimblocks`,
  no Ready Error.
- **R6 FAIL** — global search accepted exact `Add task status`; the property
  editor accepted exact `smokeprop2`; the task-status picker accepted exact
  `Doing`. From an active normal-mode cursor after reload, the command palette
  transformed typed `Open Vimblocks settings` into
  `Open. Vimblockssettings` and created/navigated to that garbled scratch
  page instead of invoking the command. Expected the exact query and command
  dispatch. Run 2's command-palette probe passed, so this is a regression from
  that run. The calendar opened, but typing `tomorrow` exposed no editable
  value in accessibility state; that subprobe is inconclusive.
- **R7 TEST-COVERED** — not live-reachable; retained coverage in
  `tests/public-host-bridge.test.ts`.
- **R8 PASS** — `cde` + `x` became `de` exactly; both known siblings remained.
  Then `dd` removed `R8 sibling one` only; `R8 sibling two` and `de` remained.

Additional checks:
- **S1 PASS** — `Ctrl+Alt+Shift+V` followed by typed `ddx` produced literal
  editor text `ddx`; no Vim delete/character operation. Plugin reload restored
  capture.
- **S2 PASS** — `Vimblocks: Disable key capture` followed by typed `ddx`
  changed scratch text `ddx` to literal `ddxddx`; plugin reload restored
  capture.
- **S3 PASS** — DB capture remained `ctrl+shift+t`; boundary profile began and
  ended at `logseq-first`. Cursor colour was not re-read in Run 3; Run 2
  verified `#18cae6`.
- **S4 PASS** — changed `logseq-first` → `vim-first`, reloaded the plugin,
  reopened Logseq's plugin settings, and observed persisted `vim-first`.
  Restored `logseq-first`, reloaded, and left Vimblocks enabled.
- **S5 PASS** — `s q` preserved exact scratch text
  `ddxddx cancel recovered confirm recovered` and returned focus to host HTML.
- **S6 FAIL (PDF half)**:
  - DB task capture passed. `test task tom at 8 p1` previewed title
    `test task`, Status `Todo`, Priority `Urgent`, Scheduled
    `Wed, Jul 29, 8:00 AM`; creation produced a `#Task` block scheduled
    `Tomorrow 08:00` and notification `DB task captured.`
  - With the actual PDF block editor focused, `Open selected PDF inline`
    no longer emitted the old Missing PDF error, but no viewer opened. Logseq
    reported `Error: UnexpectedResponseException` and
    `Unexpected server response (0) while retrieving PDF
    "assets://users/tfinklea/logseq/graphs/tesela-keyboard-audit-2026-07-23/assets/6a68d727-4816-42d9-9873-71b9b57eef35.pdf".
    Please confirm with pdf file resource.` The generated filename is the
    selected block UUID, not the linked asset filename.

Renderer console:
- 708 messages total; DevTools badge showed 2 errors and 1 warning.
- Filtering to the PDF exception exposed one concrete error entry:
  `[PDF loader] UnexpectedResponseException` at `utils.js:19`.
- No `Uncaught`, `TypeError`, or `ReferenceError` text was exposed. The two
  Issues entries were DevTools breaking-change notices.

SMOKE: fail (R1b blocked, R3, R6, S6)
