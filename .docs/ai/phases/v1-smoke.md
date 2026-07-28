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
