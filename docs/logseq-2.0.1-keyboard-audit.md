# Logseq 2.0.1 DB keyboard audit

Date: 2026-07-23

Status: implementation and disposable-graph smoke passed; five-day human pilot
still required.

## Baseline

- Application: `/Applications/Logseq.app`, version 2.0.1.
- Graph: disposable DB graph `tesela-keyboard-audit-2026-07-23`.
- Modal baseline: Vim Shortcuts 0.2.0.
- Upstream commit: `d79d2663f7751a4cdcd0ef67ccad35241540b6a3`.
- Upstream license: MIT, preserved in `LICENSE` and both production bundles.
- Fork package: `logseq-plugin-vim-shortcuts` 0.2.0-tesela.1.
- Companion package: `tesela-logseq-keyboard-companion` 0.1.0.
- Public typings: `@logseq/libs` 0.0.17.
- Current application source checked at Logseq 2.0.1 tag commit
  `26f6f7880`.
- Official references checked:
  - `libs/guides/commands_api_guide.md` in current Logseq source.
  - `db-version.md` in Logseq docs.
  - Current Logseq shortcut registration and PDF viewer source.

No production graph, Tesela application source, Logseq application source,
database schema, or storage was modified.

## Production build and load path

Build:

```bash
pnpm install
pnpm check
pnpm test
pnpm build
```

Current Logseq 2.0.1 developer-plugin workflow:

1. Press `Cmd+Shift+P`.
2. Run `Go to plugins dashboard`.
3. Choose `Load unpacked plugin`.
4. In the native folder picker press `Cmd+Shift+G`.
5. Enter `/Users/tfinklea/git/tesela-logseq-keyboard/dist`.
6. Press `Return`, then choose `Open`.
7. Repeat with
   `/Users/tfinklea/git/tesela-logseq-keyboard/companion/dist`.
8. Confirm the dashboard shows:
   - Vim Shortcuts (Tesela Keyboard) 0.2.0-tesela.1
   - Tesela Keyboard Companion 0.1.0

## Action matrix

Each row has exactly one requested classification. “Vim result” records the
pinned plugin baseline or the narrow fork behavior. “Public API” records the
supported route evaluated for a remaining gap.

| # | Action | Stock behavior tested | Vim result tested | Public API / remaining gap | Classification |
|---:|---|---|---|---|---|
| 1 | Global search | `Cmd+K`; searches and opens pages | Guard leaves search input untouched | `App.pushState` exists but is unnecessary | built-in and configurable |
| 2 | Command palette | `Cmd+Shift+P`; filters and runs commands | Guard leaves palette input untouched | `App.registerCommandPalette` supplies plugin entries | built-in and configurable |
| 3 | Today’s journal | `g j` | Does not replace the stock sequence | `App.pushState("page", …)` unnecessary | built-in and configurable |
| 4 | Arbitrary page | `Cmd+K`, type page, `Return` | Search field remains normal | Navigation APIs exist but add no value | built-in and configurable |
| 5 | Back / forward | `Cmd+[` / `Cmd+]` | Does not replace stock history | No companion command needed | built-in and configurable |
| 6 | Toggle and focus sidebars | `t l` / `t r` toggle; keyboard traversal can enter visible content | Vim page/block navigation remains available | Public APIs toggle sidebars, but expose no dedicated “focus left/right pane” command | acceptable keyboard approximation |
| 7 | Favorites and recent | `Cmd+K` reaches the same pages; visible sidebar links are keyboard-traversable | Vim does not own these lists | No public API exposes direct Favorites/Recent focus or indexed movement | acceptable keyboard approximation |
| 8 | Focus a block | Stock arrow/block selection remains available | `j` / `k` focuses adjacent blocks | Editor APIs exist but are unnecessary | supplied by the pinned Vim plugin |
| 9 | Enter / leave edit mode | Click/selection and `Esc` are stock | `i`/`a` enter; `Esc` reliably returns to normal mode after fork guard | Editor editing APIs exist but modal layer already owns this | supplied by the pinned Vim plugin |
| 10 | Normal-mode text and block movement | Stock editor keys apply while editing | `h`, `j`, `k`, `l`, `w`, `b`, `e`, `$` tested | No companion command needed | supplied by the pinned Vim plugin |
| 11 | Select blocks | `Option+Up/Down`, `Shift+Up/Down` | Visual-line mode also available | No companion command needed | built-in and configurable |
| 12 | Move / reorder blocks | `Cmd+Shift+Up/Down` | `V`, then `J`/`K`, also works | Editor move APIs unnecessary | built-in and configurable |
| 13 | Indent / outdent | `Tab` / `Shift+Tab` | `>` / `<` also works | Editor indent APIs unnecessary | built-in and configurable |
| 14 | Collapse / expand | `Cmd+Up/Down` or `Cmd+;` | `zc` / `zo`, with `zC` / `zO` recursive | Editor collapse APIs unnecessary | built-in and configurable |
| 15 | Create / follow reference | Type `[[page]]`; `Cmd+O` follows selected reference | `Cmd+Shift+Return` jump is also available | Editor reference APIs unnecessary | built-in and configurable |
| 16 | Set / cycle task status | `p s` opens status picker; `Cmd+Return` cycles | Guard preserves picker text entry | Editor property APIs unnecessary | built-in and configurable |
| 17 | Schedule / deadline | `p d` and property palette reach scheduling/deadline fields | Guard preserves property/date controls | Editor property APIs unnecessary | built-in and configurable |
| 18 | Add / edit property | `Cmd+P`, choose property, edit value | Guard preserves property editor | Editor property APIs unnecessary | built-in and configurable |
| 19 | Open / operate saved query or view | `Cmd+K` opens the Task DB view; task/property commands operate its records | Vim does not provide view-toolbar focus | No public API exposes direct focus/navigation for the current DB-view toolbar | acceptable keyboard approximation |
| 20 | Open inline PDF | Stock PDF viewer has `Option+N/P/F/X` after opening, but an asset link itself is not keyboard-focusable | Vim does not open the asset viewer | `Editor.getCurrentBlock` plus `Editor.openPDFViewer(block.uuid)` closes the gap | implementable through a supported public plugin API |

Result: all 20 actions have a mouse-free route in the tested desktop setup.
Three use acceptable keyboard approximations. The only genuine application
command-reach gap, opening an inline PDF, is closed through a supported public
API.

## Emacs-style chord assessment

Literal Control/Meta interception is intentionally not global. It would damage
normal macOS editing, search, dialogs, and Logseq input controls.

| Desired chord | Classification and pilot behavior |
|---|---|
| `C-n`, `C-p` | Built-in and context-sensitive in Logseq editor/autocomplete controls. Keep stock behavior; use Vim `j`/`k` in normal mode. |
| `C-f`, `C-b` | Keep normal macOS text-field behavior. Use Vim `l`/`h` in normal mode. Acceptable keyboard approximation outside text entry. |
| `C-a`, `C-e` | Keep macOS line start/end in text fields. In normal mode use `0`/`$`; note upstream Vim maps `C-a` to increase number. No global override. |
| `M-f`, `M-b` | Use `Option+Right/Left` in insert fields and Vim `w`/`b` in normal mode. Acceptable keyboard approximation. |
| `C-k`, `C-y` | Keep native editing semantics in text inputs. Use Vim delete/yank/paste operations in normal mode. No global override. |
| `C-s`, `C-r` | Use `Cmd+K` for global search or `/`, `n`, `N` for in-page search. Keep Vim `C-r` as redo in normal mode. No global override. |

## Companion command

The companion owns one registry entry:

- `Open selected PDF inline`
  - Palette name: `Open selected PDF inline`
  - Default shortcut: `Cmd+Option+P` (`mod+alt+p`)
  - Context: non-editing only
  - Setting: `openPdfShortcut`; blank means palette-only
  - Implementation: public `Editor.getCurrentBlock` and
    `Editor.openPDFViewer`
  - Failure behavior: warning if no block is selected; error if the selected
    block is not openable as a PDF

## Vim fork changes

The modal plugin required a narrow fork because the defect was inside its
shortcut registration and lifecycle implementation:

- Kept upstream history and MIT notice.
- Added one command registry covering every plugin-owned registrar.
- Changed modal bindings from global to non-editing context.
- Added a final text-entry guard for inputs, textareas, selects,
  contenteditable editors, and textbox/searchbox/combobox roles.
- Allowed only explicit editor commands that must cross a contenteditable
  boundary (`Exit editing` and `Insert emoji`); all ordinary modal actions stay
  blocked there.
- Kept normal typing intact in block editing, global search, command palette,
  property controls, query/view controls, and dialogs.
- Registered raw listeners, hotkeys, timers, stores, commands, and the Vue app
  once and disposed them on unload.
- Made unload idempotent and prevented duplicate handlers after reload.
- Treated missing mark-storage files in a fresh DB graph as empty storage
  instead of a plugin load error.

The companion could not fix modal key interception because it does not own the
Vim plugin's handlers. No unrelated dependency or visual rewrite was taken.

## Public API findings and ceilings

Supported API used:

- `App.registerCommandPalette`
- `App.registerCommandShortcut`
- `Editor.getCurrentBlock`
- `Editor.openPDFViewer`

Compatibility finding:

- The tagged Logseq 2.0.1 source and command guide describe a unified
  `Commands` API.
- In the installed Logseq 2.0.1 plugin runtime, `logseq.Commands` was
  `undefined`; using it produced a plugin Ready Error.
- The production companion therefore uses the supported legacy `App`
  registration APIs that are present in the installed runtime and current
  typings. The final restart had no Ready Error.

Verified remaining ceilings:

- No public API or stock command directly focuses the left or right sidebar
  content after toggling it.
- No public API exposes direct Favorites/Recent focus or indexed traversal.
- No public API exposes direct keyboard focus/navigation for the current DB
  saved-view toolbar and controls.

These are non-daily-critical approximations in the current pilot. No DOM
selectors, simulated clicks, private application commands, or direct SQLite
access were used.

## Automated verification

Final run after the text-entry guard:

- `pnpm check`: exit 0.
- `pnpm test`: exit 0; 19 passed, 0 failed.
  - Vim fork: 13 passed.
  - Companion: 6 passed.
- `pnpm build`: exit 0.
  - Vim production bundle built from 1,916 modules.
  - Companion production bundle built from 8 modules.
  - Only a stale Browserslist data warning; no build error.

The behavioral suites cover command registration, context guards, configurable
binding resolution, storage fallback, and idempotent unload/reload disposal.

## Disposable-graph smoke evidence

The smoke used only `tesela-keyboard-audit-2026-07-23`.

- Both unpacked production builds loaded and were enabled.
- Final process restart registered both packages without plugin console errors:
  console filters `Ready Error`, `TypeError`, and `Uncaught` each showed zero
  messages.
- Command palette showed exactly one `Open selected PDF inline` and exactly one
  `Open Vim Shortcuts settings` entry after repeated reloads and restart.
- `Cmd+Option+P` opened the selected `Understanding EXPLAIN.pdf` asset.
- In the viewer, `Option+N` moved page 1 to 2, `Option+P` returned to page 1,
  `Option+F` opened search, `Esc` closed search, and `Option+X` closed the
  viewer.
- Normal, insert, visual, and command/search modes were exercised:
  `j`/`k`, `i`, `Esc`, `/`, `Return`, `l`, `v`, `l`.
- Stock task and property flows were exercised with `p s` and `Cmd+P`.
- The Task DB page opened through `Cmd+K` and displayed the test task.
- Literal probe text remained intact in block editing, global search, command
  palette, and property controls after the final guard.
- Both plugins were unloaded/reloaded at least twice. No duplicate command
  entry, double execution, or stale listener was observed.
- After restarting Logseq, the journal blocks, task status, Description
  property, uploaded PDF asset, and PDF reference remained intact.
- One malformed page created while reproducing the pre-fix command-palette
  interception bug remains only in the disposable graph. It is evidence from
  the failed baseline, not production data loss.

## Five-day pilot checklist

Use a non-production pilot graph until the interaction layer earns trust.
Repeat the daily-critical section on five consecutive days and record every
forced-mouse incident.

### Install / start of day

1. Build with `pnpm check`, `pnpm test`, and `pnpm build`.
   Expected: all three exit 0.
2. Load both production directories using the developer-plugin path above.
   Expected: both packages enabled with the exact versions in Baseline.
3. Restart Logseq.
   Expected: graph opens with both plugins active and no Ready Error.
4. Press `Cmd+Shift+P`, type `Open selected PDF inline`, then `Esc`.
   Expected: exactly one command result; `Esc` closes the palette without
   executing it.

### Daily-critical navigation

1. Press `g`, then `j`.
   Expected: today’s journal opens.
2. Press `Cmd+K`, type a known page, press `Return`.
   Expected: page opens; `Esc` cancels without navigation.
3. Press `Cmd+[` and `Cmd+]`.
   Expected: history moves backward and forward.
4. Press `t`, `l`, then `t`, `r`.
   Expected: left and right sidebars toggle; subsequent keyboard navigation is
   not stranded in a hidden pane.
5. Open a favorite/recent page via `Cmd+K`, or keyboard-traverse the visible
   sidebar.
   Expected: target opens with no mouse.

### Daily-critical editing

1. With a block focused, press `j`, `k`.
   Expected: focus moves one block at a time.
2. Press `i`, type `pilot jkiv :/~`, then press `Esc`.
   Expected: literal text is preserved and normal mode returns.
3. Press `h`, `l`, `w`, `b`, `e`, `$`.
   Expected: cursor movement stays in the focused block.
4. Press `v`, move with `h`/`l`, then `Esc`.
   Expected: visual selection changes and `Esc` returns to normal mode.
5. Press `V`, extend with `j`/`k`, move with `J`/`K`, then `Esc`.
   Expected: block selection/reordering is visible and cancel returns safely.
6. Press `Tab`, `Shift+Tab`, `zc`, `zo`.
   Expected: indent/outdent and collapse/expand operate on the focused block.
7. Type `[[Pilot Reference]]`; place focus on it and press `Cmd+O`.
   Expected: reference is created and followed.

### Tasks, properties, views, and PDF

1. Focus a task block and press `p`, `s`; choose a status.
   Expected: status changes; `Esc` cancels the picker.
2. Press `p`, `d`; set or cancel a deadline.
   Expected: deadline flow is keyboard-operable; `Esc` cancels.
3. Press `Cmd+P`; choose a property and enter a value.
   Expected: normal typing; `Esc` closes without leaking Vim actions.
4. Press `Cmd+K`, open the Task page or another saved DB view.
   Expected: view opens; operate records through task/property commands.
   Record a limitation if a required view-toolbar operation still forces the
   mouse.
5. Select a PDF asset block and press `Cmd+Option+P`.
   Expected: inline viewer opens.
6. Press `Option+N`, `Option+P`, `Option+F`, `Esc`, `Option+X`.
   Expected: next page, previous page, search, cancel search, close viewer.

### Text-entry regression checks

Type the literal string `jkiv :/~ C-a C-r` in each surface:

1. Block editor.
2. Global search.
3. Command palette.
4. Property editor.
5. Query/view control.
6. Any dialog encountered during the day.

Expected: every character reaches the active field; no modal movement,
selection, command window, or destructive edit fires. `Esc` closes the
transient surface or returns to normal mode.

### Reload / persistence regression

1. In the plugins dashboard, reload each plugin twice.
   Expected: one palette entry per command, one execution per shortcut, no
   stale modal state.
2. Repeat one navigation, editing, task, property, view, and PDF action.
   Expected: all still work after reload.
3. Restart Logseq and reopen the pilot graph.
   Expected: content, task state, properties, view data, and PDF asset remain
   intact.
4. End each day by recording:
   - forced-mouse action and exact context, if any;
   - text-entry corruption, if any;
   - focus trap or failed `Esc`, if any;
   - plugin error or duplicate handler, if any.

Stage 1 passes only after five consecutive real-use days with zero
daily-critical forced-mouse actions. A successful build or smoke test alone
does not close that gate.
