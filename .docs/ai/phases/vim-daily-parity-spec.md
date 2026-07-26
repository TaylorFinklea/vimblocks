# Vim Daily Parity and Visual Modes Spec

## Status

- Design approved by Taylor on 2026-07-25
- Bead: `tesela-8c9v.4.16`
- Target: Vimblocks `0.5.0`
- Pre-implementation gate: independent OMP reviews by `claude-opus-5` and
  `ollama-cloud/glm-5.2`
- Execution plan: `.docs/ai/phases/vim-daily-parity-plan.md`
- GLM review: `ship-with-changes`; corrections incorporated
- Opus review 1: `rethink`; architecture corrections incorporated
- Opus adversarial rounds: `rethink`, then three `ship-with-changes` passes;
  every high/medium finding adjudicated and incorporated; shared architecture
  survived each pass
- Pre-implementation review gate cleared; implementation phases 1-4 complete

## Goal

Make ordinary Logseq DB editing feel dependably Vim-like without requiring
Taylor to re-plan between implementation phases. Deliver the full daily command
set, characterwise and linewise visual modes, and two persistent boundary
profiles. Finish with one consolidated product test in the disposable graph.

## Scope

### Required command surface

- Mode transitions: Esc, `i`, `a`, `I`, `A`, `o`, `O`
- Character and word motion: `h`, `l`, `w`, `b`, `e`
- Line and rendered-stream motion: `0`, `^`, `$`, `j`, `k`, `gg`, `G`,
  Ctrl-U, Ctrl-D
- Character find: `f`, `F`, `t`, `T`, `;`, `,`
- Operators: composable `d`, `c`, and `y`; linewise repetitions; `iw` and
  `aw`; existing put and delete behavior
- Counts: motions, operators, linewise actions, search repeats, and character
  finds; operator and motion counts multiply
- Repeat and history: `.`, `u`, Ctrl-R
- Search: `/`, `n`, `N`
- Visual: characterwise `v` and linewise `V`, composed with the same motions
  and operators

### Protected existing behavior

- Deterministic edit-Esc-normal transition and idempotent second Esc
- Vimblocks-owned cursor identity and synchronized Logseq selection
- `h/j/k/l/w`, Ctrl-U/Ctrl-D, `x`, `diw`, `dw`, `ciw`, `yiw`, `p/P`,
  `yy`, and `dd`
- Immediate mutation repaint
- Visible July 23/July 24 journal-stream navigation
- Cursor-color setting
- DB-native capture, including Scheduled versus Deadline semantics
- File-backed PDF opening
- Ordinary Logseq text entry and command palette behavior
- One enabled plugin registration and clean unload/reload lifecycle

### Deferred

- Ctrl-V blockwise visual mode
- Macros and replay registers
- Named registers and clipboard-register expansion
- New mark behavior
- Ex command parity
- A permanent replacement command engine unless the escalation gate fires

## Architecture

Use one shared modal state layer around the existing host bridge, cursor store,
and operator handling. Existing command handlers should route normalized
actions through the shared layer rather than independently reconstructing
selection or mode state.

The shared state owns:

- Current mode
- Vimblocks-owned block UUID and cursor position
- Preferred vertical column
- Count buffer
- Pending operator and motion
- Visual anchor and extent
- Search and character-find state
- Last repeatable change
- Active boundary profile

The host adapter remains responsible for:

- Capturing the active block before Logseq clears editing state
- Resolving rendered block order and viewport state
- Synchronizing Logseq visual selection with Vimblocks' owned cursor
- Capturing modal keys only when Vimblocks owns the interaction
- Preserving ordinary inputs, forms, dialogs, and command palettes

One canonical `public/key-token.js` implementation normalizes events in both
the Logseq host and plugin frame. It maps Cmd to `mod`, shifted printable keys
to Logseq binding notation (`G` → `shift+g`, `$` → `shift+4`), derives the
unmodified base key from `event.code` when Option/Alt changes `event.key`, and
owns the static host capture decision. Parity tests use code-plus-modifier
fixtures for every default binding. The host resolves the tokenizer lazily on
each keydown; until it is loaded, it passes keys through without suppression or
forwarding.

Digits `0`-`9` are modal host tokens while normal mode is active. The shared
modal reducer, not the legacy timer-based `numberCache`, owns every count. No
motion, operator, undo, redo, or linewise handler may read counts from a second
state path.

Host suppression is static and synchronous: while Vimblocks normal/visual mode
is active, the host consumes the configured modal grammar tokens before
forwarding them. The asynchronous reducer does not claim it can retroactively
consume or release a browser event. Invalid captured sequences reset pending
state and remain swallowed, matching Vim normal-mode behavior. When Escape
leaves a block editor, the host synchronously claims normal-mode ownership
before forwarding the transition; the plugin later confirms the state. Every
modal-grammar command-palette registration remains discoverable by label but
loses its Logseq `keybinding` only in the phase that makes the host dispatcher
its replacement and adds its configured tokens to the host capture set, so
every intermediate commit retains exactly one working keyboard path. Digits
remain in the ungated non-editing capture set so legacy counted actions still
work before a Vimblocks cursor is active. Operator-pending and initial character-pending states enable the
existing synchronous host capture-all mode until completion or cancellation,
focus loss, graph change, or disposal, so an invalid terminator cannot leak
into a Logseq shortcut. Plugin disposal explicitly unlatches capture, normal
mode, and the injected host listener.

`ModalPoint.offset` is always an offset in raw Logseq block content. One shared
raw-to-rendered position map skips markup for motion and converts to rendered
DOM offsets only at the highlight boundary. Motions, search, visual selection,
and cursor painting share this mapping.

The two profiles share the engine, parser, actions, and mutation paths. Only
boundary resolution changes.

## Boundary Profiles

### Vim-first

- Treat the current rendered block stream as Vim lines in one buffer.
- Word motions, operator ranges, and characterwise visual selection may cross
  adjacent rendered block boundaries.
- `j/k` preserve the preferred column across rendered blocks.
- `gg/G` address the first/last rendered block; counted forms address the
  corresponding rendered row.

### Logseq-first

- Character and word motions remain within the current block.
- Characterwise visual selection and text operators stop at block boundaries.
- Cross-block changes require explicit block-safe actions such as `j/k`, `V`,
  or counted linewise operators.
- Rendered-stream navigation remains available without making characterwise
  deletion implicitly structural.

### Persistence

- First launch defaults to Logseq-first.
- The plugin setting exposes `Vim-first` and `Logseq-first`.
- The last-used profile persists across plugin reload and app restart.
- Both profiles remain available after the final comparison; the product test
  chooses the preferred default, not a profile to delete.

## Command Semantics

### Counts

- A nonzero digit begins or extends a count in normal, operator-pending, or
  visual mode.
- Bare `0` remains the line-start motion when no count is pending.
- Operator and motion counts multiply: `2d3w` covers six word motions.
- Counts apply to repeatable search and character-find navigation.

### Repeat and history

- `.` repeats the last completed mutation, including its count and
  operator-motion shape.
- Repeat coverage includes character deletion, operator changes, put, and
  deterministic insert/open sessions.
- Insert/open repeat is deterministic only for one contiguous edit at the
  content-diff boundary. It records the minimal contiguous net replacement
  between the before/after block contents and replays that net delta; it does
  not claim to reproduce the user's insert-mode keystroke or caret history.
- Motions, search navigation, and profile changes do not replace the recorded
  change.
- `u` and Ctrl-R use Logseq's real history and restore a usable Vimblocks
  cursor afterward. Vimblocks records before/after snapshots and a maximum
  primitive-step count for each plugin mutation. It invokes native undo/redo
  until the corresponding snapshot matches, then stops, so one Vim `u` can
  reverse a multi-root command without assuming Logseq transaction grouping.
- Native-history grouping is blocked until live probes prove both a content
  update and a three-node subtree removal can be undone and re-fetched in the
  disposable DB graph. Each history loop must make progress toward its expected
  snapshot; on the first non-progressing step, compensate with the inverse
  native history action, restore the owned cursor, show an error, and abort
  before unrelated user history can be touched.
- A multi-block Vim action should be one undoable action where Logseq's DB API
  provides a transaction boundary. A proven host limitation must be recorded
  explicitly and treated as an architecture-review finding, not hidden.

### Search and character find

- `/` searches the current rendered view in display order, including a
  multi-day journal stream.
- `n/N` repeat in the forward/reverse direction and wrap with clear feedback.
- `f/F/t/T` operate within the applicable profile boundary; `;/,` repeat and
  reverse the last character find.
- Search UI and pending character input never leak bindings into Logseq's
  command palette or ordinary text entry.

### Insert and open

- `i/a/I/A` enter Logseq editing at the Vim position implied by the command.
- `o/O` create a sibling block below/above at the same indentation and enter
  insert mode.
- Esc deterministically returns to a Vimblocks-owned normal cursor.

### Visual

- `v` enters characterwise visual mode; Esc returns to usable normal mode.
- `V` enters linewise block selection.
- Motions and counts extend the selection through the shared action grammar.
- `d/c/y` act on the visual range and leave mode/cursor state consistent.
- Vim-first characterwise selection may cross rendered blocks.
- Logseq-first characterwise selection stops at the current block.
- Host painting prefers the CSS Custom Highlight API with one DOM `Range` per
  block segment, so selections can span inline markup and multiple blocks
  without mutating Logseq-owned DOM. Capability is proven live before cutover;
  an explicit multi-node mark fallback is required if unavailable.

## Structural Safety

- Linewise operations treat a selected Logseq block together with its complete
  descendant subtree.
- Yank and put preserve hierarchy and sibling order.
- Linewise put creates sibling roots through one nested `insertBatchBlock`
  plan; it never degrades to repeated flat inserts.
- Hidden descendants remain part of a selected subtree.
- Overlapping selected ancestors/descendants are canonicalized so a subtree is
  never mutated twice.
- `V`, counted linewise actions, and cross-day rendered order must not flatten,
  duplicate, or silently reparent children.
- On partial mutation failure, stop, report the error, and restore or preserve
  the last verified cursor state. Never leave a visible orphan cursor.

## Escalation to a Replacement Engine

Approach 2 is declared unsuccessful when any of these is demonstrated:

- Reliable single-dispatch cannot be achieved without fighting Logseq command
  registration.
- More than roughly one-third of the agreed daily command scenarios must bypass
  the shared modal core.
- The two profiles require substantially separate implementations instead of
  boundary-policy adapters.
- Two consecutive live repair cycles fail because modal state and Logseq
  selection cannot stay synchronized.

When a trigger fires:

- Stop the current phase.
- Record the evidence in this spec, the wave Bead, and `current-state.md`.
- Preserve all working phase commits.
- Create a separate replacement-engine branch/worktree from the last verified
  checkpoint.
- Continue with approach 3 without overwriting the approach-2 branch.

Evaluate these triggers after the shared-dispatch phase, after the
operator/history phase, and at final QA. The first gate scores only the scenarios Task 1 claims
to route: `{1,2,3,4,5,6,8,9}` and requires single dispatch for all of them.
The second gate scores `{1–13,20}` and permits at most 4 bypasses. Final QA
scores all 20 and applies the more-than-6 bypass threshold. Each gate includes
a targeted agent-run Logseq smoke and stops the wave before the next phase when
a trigger is met.

The gate uses a scoped diagnostic dispatch trace enabled only for the smoke.
The shared reducer and any surviving legacy shortcut callback append distinct
entries, and a palette command displays the latest entries for scoring. The
diagnostic path is disabled and its global state removed after the gate.

The full denominator is this exact 20-scenario transport matrix. A scenario passes
the shared-core gate only when the host token reaches `stepModalKey` and no
legacy `registerCommandPalette` shortcut callback also executes. Scenario 20
instead passes when the profile-setting change reaches the shared modal store
without a reload:

1. Esc from editing
2. second Esc in normal mode
3. `h/l`
4. `j/k`
5. `w/b/e`
6. `0/^/$`
7. `gg/G`
8. Ctrl-U/Ctrl-D
9. `10l`, `2d3w`, and `d0`
10. `d/c/y` plus motions
11. `x`, `p`, and `P`
12. `.`
13. `u` and Ctrl-R
14. `i/a/I/A`
15. `o/O`
16. `/`, `n`, and `N`
17. `f/F/t/T`, `;`, and `,`
18. `v` plus motions/operators
19. `V` plus motions/operators
20. cross-block profile switch behavior

More than 4 bypassing scenarios at Task 3 or more than 6 at final QA triggers
approach 3.

## Phases

### 0. Specification and external review

- Complete this spec and the execution plan.
- Dispatch independent self-contained OMP reviews to `claude-opus-5` and
  `ollama-cloud/glm-5.2`.
- Give both reviewers the adversarial charge; do not expose either review to
  the other.
- Adjudicate disagreements and resolve every high-severity finding before code.
- Stop rather than silently substitute if either requested model is unavailable.

### 1. Isolated foundation

- Create `codex/vim-daily-parity` in an isolated worktree from the current
  capture branch.
- Add shared mode/count/operator/repeat/profile state without changing working
  command behavior.
- Add the validated profile setting and persistence.
- Remove the legacy digit/count path and prove host digits reach the reducer.
- Run the first live architecture gate for single dispatch and core bypasses.

### 2. Motions and counts

- Route current motions through the shared action path.
- Add or repair `b/e`, `0/^/$`, `gg/G`, counts, viewport motion, and rendered
  boundary policy.

### 3. Operators, repeat, and history

- Compose `d/c/y` with the motion grammar and text objects.
- Add counted linewise forms, `.`, `u`, and Ctrl-R.
- Preserve subtree hierarchy and cursor state across mutations.
- Live-test subtree cascade and the exact Logseq undo-step count, then run the
  second approach-2 architecture gate before continuing.

### 4. Insert and open transitions

- Add or repair `i/a/I/A/o/O`.
- Record deterministic insert/open changes for repeat.
- Verify Esc always restores normal mode without a mouse click.

### 5. Search and character navigation

- Add or repair `/`, `n/N`, `f/F/t/T`, `;`, and `,`.
- Search the rendered view and preserve text-entry/palette isolation.
- Resolve rendered UUIDs through a DB-native batch lookup or per-page DB trees,
  reconcile results to host display order, and keep DB fetch plus match
  planning for the July 23/July 24 fixture at or below 150 ms. Remove modal
  debounce/highlight delays and separately record end-to-end key-to-paint
  latency.

### 6. Visual character and line modes

- Add or repair `v` and `V` on the shared motion/operator grammar.
- Apply profile boundaries and subtree safety.

### 7. Hardening and product test

- Rebuild and install `0.5.0` into the stable plugin path.
- Run the complete live matrix in both profiles.
- Produce one focused comparison test for Taylor and record the chosen default.

Each implementation phase receives one child Bead and one focused commit.
Automated verification runs after every phase. No human planning pause occurs
between phases unless live evidence contradicts the spec, an external review
blocks the architecture, or an approach-3 escalation trigger fires.

## Verification

### Per phase

- `pnpm check`
- `pnpm test`
- `pnpm package`
- Command-trace regression tests for the state transition introduced
- Targeted agent-run Logseq smoke when mocked state cannot prove the behavior
- Mandatory architecture smokes after phases 1 and 3

### Final live matrix

- Computer Use target: `Logseq`
- Application: `/Applications/Logseq.app`
- Graph: `tesela-keyboard-audit-2026-07-23` only
- Stable install: `/Users/tfinklea/.logseq/plugins/vimblocks`
- Never open or modify Taylor's production graph
- Never target or open Tesela

Test both profiles:

1. Edit `alpha beta gamma`, press Esc, and verify the cursor appears without a
   wake-up mutation.
2. Verify second Esc, base motions, counts, word/line/stream motions, and
   Ctrl-U/Ctrl-D.
3. Verify operator-motion composition, linewise forms, `x`, put, `.`, undo,
   and redo with immediate repaint.
4. Verify `i/a/I/A/o/O` and deterministic return to normal mode.
5. Verify rendered-view `/ n N` and `f/F/t/T ; ,`.
6. Verify `v/V`, counts, operators, profile boundary differences, and Esc.
7. Verify subtree yank/delete/put/undo without flattening or duplication.
8. Verify `j/k`, search, and linewise selection across visible July 23/July 24
   journal sections.
9. Switch profiles, reload the plugin, restart Logseq, and confirm the last-used
   profile persists.
10. Verify DB capture Scheduled and Deadline examples, PDF opening, cursor
    color, command-palette typing/Esc, and ordinary text entry.
11. Confirm exactly one enabled Vimblocks `0.5.0` card and one registration per
    owned command.
12. Report renderer-console and plugin-load errors.

## Rollback

- The existing `codex/db-natural-capture` branch remains the source checkpoint.
- Preserve the currently installed stable plugin as a restorable archive
  outside Logseq's plugin-scan directory before installing `0.5.0`.
- Record the pre-install commit, package version, archive path, and restore
  command in the phase report.
- Phase commits permit reverting one capability without discarding the wave.
- Do not push.
