# Vim Daily Parity and Visual Modes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:executing-plans` to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver Vimblocks 0.5.0 with one deterministic daily-Vim command
engine, persistent Vim-first and Logseq-first boundaries, and dependable `v`/`V`
in Logseq DB.

**Architecture:** Add a pure modal reducer and rendered-buffer helpers, then
make the existing host-bridge listener and Pinia stores adapt Logseq state to
those pure interfaces. Existing command-palette registrations remain
discoverable, while host modal keystrokes pass through one dispatcher. Both
profiles share commands and mutations; only boundary resolution differs.

**Tech Stack:** TypeScript 5.9, Pinia 3, Vue 3, Logseq plugin API 0.0.17,
host-owned JavaScript bridge, Node's built-in test runner, Vite, pnpm.

## Global Constraints

- Work only in `/Users/tfinklea/git/vimblocks`; never edit Tesela source.
- Implementation branch: `codex/vim-daily-parity`, created in an isolated
  worktree from `codex/db-natural-capture`.
- Target package version: `0.5.0`.
- Logseq DB only; do not add old Markdown/file-graph behavior.
- Remove the retired `property::` rendered-position special case instead of
  carrying an untested Markdown-graph compatibility branch.
- First launch uses Logseq-first; persist the last-used boundary profile.
- Preserve complete subtrees for every linewise operation.
- `o/O` create same-indentation sibling blocks.
- `/` searches the current rendered view in display order.
- Never capture modal keys in ordinary text inputs, dialogs, or command
  palettes.
- A palette `keybinding` is stripped only when the same commit routes the
  command and adds every configured token to host capture. Tests assert stripped
  tokens are a subset of the configured capture sets.
- Run `pnpm check`, `pnpm test`, and `pnpm package` after every task.
- One focused commit and one Bead close per task; do not push.
- Live testing targets app `Logseq` and graph
  `tesela-keyboard-audit-2026-07-23` only; never open Taylor's production graph
  or target/open Tesela.
- `tesela-8c9v.4` remains open as the human five-day verification gate.

## Pre-implementation Gate

- [x] Dispatch independent OMP reviews of this plan and
  `.docs/ai/phases/vim-daily-parity-spec.md` to `claude-opus-5` and
  `ollama-cloud/glm-5.2`.
- [x] Give both reviewers this exact charge: “Attempt to REFUTE. No praise, no
  padding. If a decision survives your attack, say so in one line and move on.”
- [x] Adjudicate the reviews, resolve all high-severity findings in the spec and
  plan, and rerun a reviewer when a correction changes architecture.
- [x] Stop rather than substitute another model if either requested OMP model
  is unavailable.
- [x] Use `superpowers:using-git-worktrees` to create the isolated worktree.
- [x] Record the worktree path and starting commit in
  `.docs/ai/current-state.md` and `tesela-8c9v.4.16`.

## File Map

- Create `public/key-token.js`: canonical event-token and static-capture logic
  loaded into both the Logseq host and plugin frame.
- Create `src/runtime/key-token.ts`: typed access to the shared tokenizer.
- Create `src/runtime/modal-count.ts`: import-free count storage used by the
  reducer and temporary compatibility shims without a `funcs.ts` cycle.
- Create `src/runtime/modal-command.ts`: pure mode, count, pending operator,
  visual, character-pending, and repeat state reducer.
- Create `src/stores/modal.ts`: Pinia adapter that owns the current
  `ModalState` and persists the active profile.
- Create `src/runtime/rendered-buffer.ts`: pure rendered points, motions,
  operator ranges, preferred-column logic, and profile boundaries.
- Create `src/runtime/modal-change.ts`: serializable repeat descriptors and
  mutation replay planning.
- Create `src/runtime/insert-session.ts`: deterministic insert/open-session
  capture and replay.
- Create `src/runtime/rendered-search.ts`: rendered-view matches, wrapping, and
  counted search/character-find resolution.
- Create `src/runtime/block-subtrees.ts`: subtree serialization,
  canonicalization, and hierarchy-preserving register payloads.
- Modify `src/runtime/cursor-style.ts`: emit cursor/visual CSS for both Custom
  Highlights and mark fallback from the configured cursor color.
- Modify `src/keybindings/operators.ts`: become the single modal host-event
  dispatcher and route palette actions through the same command path.
- Modify `src/stores/search.ts`: retain cursor/search UI responsibilities but
  delegate modal parsing, motion, visual ranges, and repeat state.
- Modify `src/runtime/host-bridge.ts` and `public/host-bridge.js`: carry modal
  context and paint multiple cursor/selection ranges without host text-entry
  leakage.
- Modify `src/runtime/operator-sequence.ts`: use the canonical tokenizer and
  allow modal dispatch during visual mode.
- Modify `src/runtime/vim-register.ts`: support characterwise text and
  linewise serialized subtrees.
- Modify `src/runtime/normal-mode-mutation.ts`: execute verified mutation plans
  and restore owned cursor state.
- Modify `src/common/funcs.ts`, `src/common/type.ts`, and `src/main.ts`: migrate
  settings safely, keep binding metadata/defaults in parity, register the
  profile enum, and invalidate cached settings changes.
- Modify `src/keybindings/number.ts`: retire the timer-based count cache and
  route `0`-`9` through the shared host modal dispatcher.
- Modify `src/command-registry.ts` and the existing keybinding modules only
  where needed to strip `keybinding` from every modal-grammar palette
  registration while preserving label-only palette discoverability.
- Add focused tests beside the existing `tests/*.test.ts` suite.

---

### Task 1: Shared modal state and persistent profiles

**Bead:** `tesela-8c9v.4.16.1`

**Files:**

- Create: `public/key-token.js`
- Create: `src/runtime/key-token.ts`
- Create: `src/runtime/modal-count.ts`
- Create: `src/runtime/modal-command.ts`
- Create: `src/stores/modal.ts`
- Create: `tests/key-token.test.ts`
- Create: `tests/modal-command.test.ts`
- Create: `tests/settings-bindings.test.ts`
- Modify: `index.html`
- Modify: `src/common/funcs.ts`
- Modify: `src/common/type.ts`
- Modify: `src/main.ts`
- Modify: `src/keybindings/operators.ts`
- Modify: `src/keybindings/number.ts`
- Modify: `src/keybindings/left.ts`
- Modify: `src/keybindings/right.ts`
- Modify: `src/keybindings/up.ts`
- Modify: `src/keybindings/down.ts`
- Modify: `src/keybindings/wordForward.ts`
- Modify: `src/keybindings/wordBackward.ts`
- Modify: `src/keybindings/wordEnd.ts`
- Modify: `src/keybindings/lineEnd.ts`
- Modify: `src/keybindings/firstNonBlank.ts`
- Modify: `src/command-registry.ts`
- Modify: `src/runtime/operator-sequence.ts`
- Modify: `src/runtime/host-bridge.ts`
- Modify: `public/host-bridge.js`
- Modify: `tests/operator-sequence.test.ts`
- Modify: `tests/host-bridge.test.ts`
- Modify: `tests/package-release.test.ts`

**Interfaces:**

- Produces:

```ts
export type BoundaryProfile = "logseq-first" | "vim-first";
export type ModalMode =
  | "normal"
  | "operator-pending"
  | "visual-char"
  | "visual-line"
  | "char-pending";
export type VimOperator = "delete" | "change" | "yank";
export type ModalMotionToken =
  | "h" | "j" | "k" | "l"
  | "w" | "b" | "e"
  | "0" | "^" | "$"
  | "gg" | "G"
  | "ctrl+u" | "ctrl+d"
  | "f" | "F" | "t" | "T" | ";" | ","
  | "iw" | "aw" | "line";
export interface ModalPoint {
  blockUUID: string;
  offset: number;
}
export type ChangeDescriptor =
  | { kind: "delete-char"; count: number }
  | {
      kind: "operator";
      operator: VimOperator;
      motion: ModalMotionToken;
      count: number;
    }
  | { kind: "put"; before: boolean; count: number }
  | {
      kind: "insert";
      command: "i" | "a" | "I" | "A" | "o" | "O";
      relativeStart: number;
      removedText: string;
      insertedText: string;
      count: number;
    };
export interface ModalState {
  mode: ModalMode;
  profile: BoundaryProfile;
  countDigits: string;
  operator: VimOperator | null;
  operatorCount: number;
  visualAnchor: ModalPoint | null;
  lastChange: ChangeDescriptor | null;
}
export type ModalCommand =
  | { kind: "escape" }
  | { kind: "motion"; motion: ModalMotionToken; count: number }
  | { kind: "delete-char"; count: number }
  | { kind: "put"; before: boolean; count: number }
  | {
      kind: "operator";
      operator: VimOperator;
      motion: ModalMotionToken;
      count: number;
    }
  | { kind: "visual"; mode: "char" | "line" }
  | { kind: "insert"; command: "i" | "a" | "I" | "A" | "o" | "O"; count: number }
  | {
      kind: "replay-insert";
      command: "i" | "a" | "I" | "A" | "o" | "O";
      relativeStart: number;
      removedText: string;
      insertedText: string;
      count: number;
    }
  | { kind: "search"; direction: "forward" | "next" | "previous"; count: number }
  | {
      kind: "char-find";
      motion: "f" | "F" | "t" | "T" | ";" | ",";
      character: string | null;
      count: number;
    }
  | { kind: "undo"; count: number }
  | { kind: "redo"; count: number }
  | { kind: "change-case"; case: "lower" | "upper"; count: number }
  | { kind: "repeat-change"; count: number };
export interface ModalStep {
  state: ModalState;
  command?: ModalCommand;
}
export const createModalState = (profile: BoundaryProfile): ModalState;
export const normalizeBoundaryProfile = (value: unknown): BoundaryProfile;
export const stepModalKey = (state: ModalState, token: string): ModalStep;
```

- `useModalStore()` wraps `ModalState`, exposes `step(token)`, `setProfile()`,
  `setVisualAnchor()`, `recordChange()`, and `resetPending()`.

- [x] **Step 1: Claim the phase and prove canonical token/capture parity**

Run:

```bash
bd update tesela-8c9v.4.16.1 --claim
```

Create `public/key-token.js` as a non-module script that assigns:

```ts
window.__vimblocksKeyToken = {
  eventToken(event: KeyboardEventLike): string,
  shouldCapture(input: {
    token: string;
    textEntryActive: boolean;
    captureAll: boolean;
    normalModeActive: boolean;
    captureTokens: readonly string[];
    normalModeTokens: readonly string[];
  }): boolean,
};
```

Load it from `index.html` before `src/main.ts` and through
`Experiments.loadScripts("/key-token.js", "/host-bridge.js")`. Do not assume
the two-script loader establishes execution order: `public/host-bridge.js`
resolves `window.__vimblocksKeyToken` lazily inside each keydown and passes
through inertly—without `preventDefault` or forwarding—when it is absent. Make
`src/runtime/operator-sequence.ts` call this same global API. Evaluate the
public script with `node:vm` and prove:

```ts
assert.equal(token(shiftKey("G")), "shift+g");
assert.equal(token(shiftKey("$")), "shift+4");
assert.equal(token(shiftKey("V")), "shift+v");
assert.equal(token({ code: "Semicolon", key: "…", metaKey: true, altKey: true }), "mod+alt+;");
assert.equal(token({ code: "KeyJ", key: "∆", altKey: true }), "alt+j");
assert.equal(token(ctrlKey("r")), "ctrl+r");
```

Generate event fixtures for every binding in `defaultSettings.keyBindings` and
require host/plugin token parity. For every Alt/Option binding, construct the
fixture from `event.code` plus modifiers rather than a hand-normalized
`event.key`. For every token returned by `expandOperatorBinding()`, prove at
least one code-plus-modifier fixture causes `eventToken()` to emit that exact
configured token; fail on any unreachable binding. Test `shouldCapture` for
normal, visual, text-entry, capture-all, and missing-tokenizer states. If
required shifted/meta tokens cannot use one canonical tokenizer, stop before
routing commands and evaluate approach 3.

- [x] **Step 2: Write failing reducer tests**

Add table-driven tests proving:

```ts
assert.deepEqual(trace(["2", "d", "3", "w"]).command, {
  kind: "operator",
  operator: "delete",
  motion: "w",
  count: 6,
});
assert.equal(trace(["0"]).command?.kind, "motion");
assert.equal(trace(["1", "0", "l"]).command?.count, 10);
assert.deepEqual(trace(["d", "0"]).command, {
  kind: "operator",
  operator: "delete",
  motion: "0",
  count: 1,
});
assert.equal(trace(["v"]).state.mode, "visual-char");
assert.equal(trace(["shift+v"]).state.mode, "visual-line");
assert.equal(trace(["escape"]).state.mode, "normal");
assert.deepEqual(
  trace(["escape", "escape"]).state,
  trace(["escape"]).state
);
assert.equal(normalizeBoundaryProfile("bad"), "logseq-first");
```

Add traces for `x`, `p`, `P`, `.`, and `f` followed by a character. Prove
`;/,` emit `character: null`, while initial `f/F/t/T` emits the captured
character. In Task 3, require `replayChange()` to switch exhaustively over all
four `ChangeDescriptor` kinds with a `never` default.

- [x] **Step 3: Verify the tests fail for the missing module**

Run: `node --test --experimental-strip-types tests/modal-command.test.ts`

Expected: FAIL because `src/runtime/modal-command.ts` does not exist.

- [x] **Step 4: Implement the pure reducer and Pinia adapter**

Implement the interfaces above. `stepModalKey` must be deterministic and
side-effect free. It must:

- distinguish bare `0` from a count digit;
- use empty `countDigits` as the only “no count pending” representation;
- retain an operator count while reading a motion count;
- cancel pending state on Esc or an invalid sequence;
- emit one command only when a sequence is complete;
- leave `lastChange` unchanged for motion/search/profile commands.

- [x] **Step 5: Add safe settings migration and profile persistence**

Add this native Logseq setting in `src/main.ts`:

```ts
{
  key: "vimBoundaryProfile",
  type: "enum",
  default: "logseq-first",
  title: "Vim block boundary behavior",
  description: "Vim-first treats rendered blocks as lines in one buffer; Logseq-first keeps character operations block-local.",
  enumChoices: ["logseq-first", "vim-first"],
  enumPicker: "select",
}
```

Add `vimBoundaryProfile: "logseq-first"` to `defaultSettings`, bump
`settingsVersion` from `v5` to `v6`, and replace the version-mismatch overwrite
in `initSettings()` with:

```ts
deepAssign(structuredClone(defaultSettings), existingSettings, {
  settingsVersion,
});
```

Pass the merged object to `logseq.updateSettings`.
Replace the default `top: "shift+t"` with `top: "g g"` and add
`lineStart: "0"`, `tillChar: "t"`, `tillCharBackward: "shift+t"`, and
`repeatChange: "."`; `bottom: "shift+g"` remains Vim `G`. This resolves the
old `T`/top collision in the same v6 migration. Before the deep merge, treat a
v5 `top === "shift+t"` as the known legacy default and migrate it to `"g g"`;
preserve any other user-customized `top` binding. Test both cases. This preserves existing
shortcuts, cursor color, and capture settings before
the version is written. Prove a v5 fixture with
`keyBindings.down = "ctrl+n"` retains that value while gaining the default
profile. Invalidate `getSettings()` caching on `logseq.onSettingsChanged`,
normalize the new value, update `useModalStore`, and register the off-hook in
`DisposableRegistry`. Reset modal state and the owned cursor on
`onCurrentGraphChanged`.

Update `src/common/type.ts` `keyBindingsMeta` in the same commit: add the four
new rows and change `top.defaultBinding`/description to `g g`. Add a parity
test requiring the metadata/default key sets to be identical and every
`defaultBinding` to deep-equal the corresponding default. `lineStart` and
`repeatChange` are host-dispatch-only settings; Task 5 registers `tillChar` and
`tillCharBackward` through the existing find-character modules.

- [x] **Step 6: Route normal/visual-mode keys through one dispatcher**

Expand the existing host listener in `src/keybindings/operators.ts` to call
`useModalStore().step(keyboardEventToken(event))`. Dispatch emitted commands to
the existing motion/operator functions initially. Browser suppression remains
entirely in the shared synchronous `shouldCapture` token-set decision; remove
`ModalStep.consume` and do not treat plugin-frame no-op `preventDefault()` as
evidence. Captured invalid sequences reset and remain swallowed. Palette
actions invoke the same dispatcher entry point.

Add `0`-`9` to the ungated `configureHostCapture` set, not the
normal-mode-only set, preserving counted non-editing commands before any Esc.
Replace `number.ts` handlers with
palette-only discoverability that calls the same dispatcher. Delete
`numberCache`; keep `getNumber`, `hasExplicitNumber`, `setNumber`, and
`resetNumber` temporarily as compatibility shims over the import-free
`src/runtime/modal-count.ts` leaf, which the modal store also owns. `funcs.ts`
forwards lazily and never imports the store, preventing a
`funcs.ts`↔`stores/modal.ts` cycle. Existing non-wave consumers compile without
a second count state. Required daily commands migrate from the shims when their
phase routes them through `ModalCommand.count`. Because a pre-existing
`funcs.ts`↔`stores/search.ts` cycle is outside this wave, scope the regression
assertions exactly: `funcs.ts` must not import `@/stores/modal`, and
`src/runtime/modal-count.ts` must have zero local imports.

The compatibility inventory is:
`changeCase.ts`, `cutWord.ts`, `decrease.ts`,
`deleteCurrentAndNextSiblingBlocks.ts`,
`deleteCurrentAndPrevSiblingBlocks.ts`, `deleteCurrentBlock.ts`, `down.ts`,
`increase.ts`, `indent.ts`, `joinNextLine.ts`, `jumpInto.ts`, `mark.ts`,
`nextSibling.ts`, `prevSibling.ts`, `redo.ts`, `undo.ts`, `up.ts`, and
`stores/emoji.ts`. Tests fail if any of these imports still point at deleted
timer state.

Remove `visualMode` from `shouldCaptureNormalModeKey`'s rejection criteria and
prove that `w` in `visual-char` still reaches `step()`.

Strip `keybinding` only after the shared dispatcher owns that exact command.
Task 1's explicit `COMMAND_REGISTRY` inventory is `number`, `left`, `right`,
`up`, `down`, `word-forward`, `word-backward`, `word-end`, `line-end`, and
`first-nonblank`; half-page motions already live inside `text-operators`.
In the same commit, add every configured token for those ids to the appropriate
host capture set via `expandOperatorBinding()`. A test asserts every stripped
binding token is present in `configuredTokens ∪ normalModeTokens`.
Leave all commands routed in Tasks 3–6 on their existing Logseq keybindings
until their owning task cuts them over. Each phase verifies every binding in
`defaultSettings.keyBindings` still fires exactly once. On Escape from a
contenteditable block editor,
`public/host-bridge.js` synchronously sets its local
`normalModeActive = true` before forwarding; the plugin's later state message
confirms it. If normal-mode entry returns false, immediately post
`normal-mode:false`; the host also revokes its optimistic claim when the next
captured token arrives without a plugin confirmation.

While the reducer is `operator-pending` or waiting for an initial
`f/F/t/T` character, enable the existing host capture-all path so invalid
terminators cannot leak into Logseq. Release it on completion, invalid
sequence, Escape, UI close, graph change, and plugin dispose. A pending state
never asks an asynchronous reducer to retroactively swallow a key.
Also release on window blur and `visibilitychange`. The plugin disposer first
posts `capture-all:false` and `normal-mode:false`, then a new host `dispose`
message that invokes the injected script's `dispose()`. Assert that exact
message sequence in `tests/host-bridge.test.ts`.

- [x] **Step 7: Prove transport and run the first architecture gate**

Extend `tests/host-bridge.test.ts` so a digit forwarded while
`normalModeActive` reaches `step()` exactly once, Escape synchronously claims
normal mode, and an unavailable tokenizer causes an inert pass-through. The
primary capture test is the pure shared `shouldCapture` contract, not only
plugin-frame messaging.

Add a scoped diagnostic dispatch trace enabled only for architecture smokes:
the shared dispatcher and legacy palette callbacks append distinct entries,
and a developer palette action shows the latest entries. In the disposable
graph probe `10l`, `2d3w`, `d0`, `G`, `$`, `^`, `V`, `D`, `mod+alt+;`,
`5m`, and `5 shift+j` without a prior Esc;
then score the completed-phase set `{1,2,3,4,5,6,8,9}` from the trace. Scenario
7 waits for the rendered-buffer `gg/G` cutover. Disable tracing and remove its
global state after evidence capture. Stop and escalate when single dispatch
fails for a claimed scenario. The full 20-scenario threshold runs at Task 3;
scenario 20 passes when a `vimBoundaryProfile` change reaches the shared modal
store without reload.

- [x] **Step 8: Run focused and full verification**

Run:

```bash
node --test --experimental-strip-types tests/key-token.test.ts tests/modal-command.test.ts tests/settings-bindings.test.ts tests/operator-sequence.test.ts tests/host-bridge.test.ts tests/package-release.test.ts
pnpm check
pnpm test
pnpm package
```

Expected: all pass; package contains `host-bridge.js`, package metadata,
licenses, and the current capture feature.

- [x] **Step 9: Update handoff, commit, and close the Bead**

Evidence (2026-07-25): canonical host/plugin token tests, pure reducer traces,
and host exact-once/disposal tests pass. Installed the phase build into the
stable plugin path and reloaded the single enabled Vimblocks card in Logseq.
On disposable graph `tesela-keyboard-audit-2026-07-23`, Escape from editing
painted the cursor immediately; second Escape retained a usable cursor;
`h/j/k/l/w`, counted `3l`, and `2d3w` reached the shared path and repainted
without a refresh. The edited block was restored to `alpha beta gamma`.
`pnpm check`, all 70 tests, `pnpm package`, and `git diff --check` pass.

Update the Task 1 checkbox/evidence in `.docs/ai/current-state.md` and this
plan. Commit:

```bash
git add public/key-token.js public/host-bridge.js src/runtime/key-token.ts src/runtime/modal-count.ts src/runtime/modal-command.ts src/runtime/operator-sequence.ts src/runtime/host-bridge.ts src/stores/modal.ts src/common/funcs.ts src/common/type.ts src/main.ts src/keybindings/operators.ts src/keybindings/number.ts src/keybindings/left.ts src/keybindings/right.ts src/keybindings/up.ts src/keybindings/down.ts src/keybindings/wordForward.ts src/keybindings/wordBackward.ts src/keybindings/wordEnd.ts src/keybindings/lineEnd.ts src/keybindings/firstNonBlank.ts src/command-registry.ts index.html tests/key-token.test.ts tests/modal-command.test.ts tests/settings-bindings.test.ts tests/operator-sequence.test.ts tests/host-bridge.test.ts tests/package-release.test.ts .docs/ai
git commit -m "feat: add shared Vim modal state"
bd close tesela-8c9v.4.16.1 --reason "Shared modal reducer, single dispatcher, and persistent boundary profile pass check, test, and package."
```

---

### Task 2: Counted rendered-buffer motions

**Bead:** `tesela-8c9v.4.16.2`

**Files:**

- Create: `src/runtime/rendered-buffer.ts`
- Create: `tests/rendered-buffer.test.ts`
- Modify: `src/common/funcs.ts`
- Modify: `src/runtime/host-bridge.ts`
- Modify: `public/host-bridge.js`
- Modify: `src/stores/search.ts`
- Modify: `src/keybindings/operators.ts`
- Modify: `src/keybindings/top.ts`
- Modify: `src/keybindings/bottom.ts`
- Modify: `src/keybindings/left.ts`
- Modify: `src/keybindings/right.ts`
- Modify: `src/keybindings/up.ts`
- Modify: `src/keybindings/down.ts`
- Modify: `src/keybindings/wordForward.ts`
- Modify: `src/keybindings/wordBackward.ts`
- Modify: `src/keybindings/wordEnd.ts`
- Modify: `src/keybindings/lineEnd.ts`
- Modify: `src/keybindings/firstNonBlank.ts`
- Modify: `src/keybindings/changeCaseUpperCase.ts`
- Modify: `src/keybindings/changeCaseLowerCase.ts`
- Modify: `src/keybindings/search.ts`
- Modify: `src/keybindings/visualLineMode.ts`
- Modify: `src/commands/page.ts`
- Modify: `src/runtime/visible-block-navigation.ts`
- Modify: `tests/visible-block-navigation.test.ts`
- Modify: `tests/cursor-block.test.ts`
- Modify: `tests/host-bridge.test.ts`

**Interfaces:**

```ts
export interface RenderedBlock {
  uuid: string;
  content: string;
}
export interface RenderedBuffer {
  blocks: readonly RenderedBlock[];
}
export type MotionName = Exclude<
  ModalMotionToken,
  "f" | "F" | "t" | "T" | ";" | "," | "iw" | "aw" | "line"
>;
export interface MotionContext {
  profile: BoundaryProfile;
  viewportBlockUUIDs: readonly string[];
  preferredColumn: number | null;
}
export interface MotionResult {
  point: ModalPoint;
  preferredColumn: number | null;
  crossedBlock: boolean;
}
export const resolveMotion = (
  buffer: RenderedBuffer,
  point: ModalPoint,
  motion: MotionName,
  count: number,
  context: MotionContext
): MotionResult;
export const buildPositionMap = (content: string): number[];
export const normalizeRawOffset = (
  content: string,
  rawOffset: number
): number;
export const toRenderedOffset = (
  content: string,
  rawOffset: number
): number;
```

- [x] **Step 1: Claim the phase and write failing pure motion tests**

Run: `bd update tesela-8c9v.4.16.2 --claim`

Cover:

```ts
assert.deepEqual(resolve("alpha beta", 0, "w", 2), point(0, 11));
assert.deepEqual(resolve("  alpha", 5, "^", 1), point(0, 2));
assert.equal(resolveAcross(["one", "two"], "w", "vim-first").blockUUID, "b2");
assert.equal(resolveAcross(["one", "two"], "w", "logseq-first").blockUUID, "b1");
assert.equal(resolveVertical(["short", "long value"], "j", 7).offset, 7);
assert.equal(resolveVertical(["long value", "x"], "j", 7).offset, 0);
assert.equal(move("**bold** and [[Page]]", 2, "w").point.offset, 9);
assert.equal(move("**bold** and [[Page]]", 9, "w").point.offset, 15);
assert.equal(toRenderedOffset("**bold**", 2), 0);
```

- [x] **Step 2: Verify the missing module fails**

Run: `node --test --experimental-strip-types tests/rendered-buffer.test.ts`

Expected: FAIL because the module does not exist.

- [x] **Step 3: Implement rendered points and motions**

Use the host-provided unique rendered UUID order and fetched block contents.
Preserve the preferred column for `j/k`; do not let clamping on a short block
replace it. `gg/G` use rendered row numbers for counted forms. Ctrl-U/D use
half the unique viewport rows multiplied by the count and select only the final
target. Route all eleven existing motion modules listed in this task through
`resolveMotion`; `gg/G` sets the owned cursor in the rendered buffer first and
scrolling is only a side effect. Move `buildPositionMap`, raw/rendered conversion, visible-position
normalization, and next/previous visible-position helpers out of `search.ts`
into this module. `ModalPoint.offset` is always raw Logseq content; convert once
with `toRenderedOffset()` at the host paint boundary. Tests include emphasis,
page references, tags, and inline code. Delete the retired `property::`
position mapping and replace it with a DB-native markup characterization test;
this wave targets Logseq DB and does not carry old file-graph syntax.
Before deletion, capture and record the raw `content` returned by live DB blocks
containing a user property and `id::`; the unit fixture must be copied from that
evidence rather than assumed.

- [x] **Step 4: Replace store-local motion algorithms**

Make `useSearchStore` build a `RenderedBuffer`, call `resolveMotion`, select the
target block, update owned cursor content/position, synchronize Logseq
selection, and paint one cursor. Remove every motion dependency on
`Editor.getCurrentBlock()` while cursor mode owns a UUID.

Replace `clearCurrentPageBlocksHighlight()` plus the 50ms repaint timer with
one no-argument `clearHostHighlights()` helper and one host clear/paint message
per modal transition. Update every caller in `src/common/funcs.ts`,
`src/keybindings/search.ts`, `src/keybindings/visualLineMode.ts`,
`src/commands/page.ts`, and `src/stores/search.ts`. The Task 2 Logseq smoke
records per-motion latency on plain and markup-bearing blocks.
In `public/host-bridge.js`, a message with explicit UUIDs clears only those
marks; an omitted UUID list calls `clearAllHighlights()`. Add a host-bridge test
for the no-argument message shape.

This task strips the `keybinding` only from `top` and `bottom` once `gg/G`
reach the shared dispatcher. Because capturing the `g` prefix would otherwise
break the protected `g u` / `g shift+u` commands, recognize both in the reducer
as `change-case` commands, delegate to their existing actions, and strip
`change-case-uppercase` and `change-case-lowercase` in the same commit. Add all
four commands' configured tokens to host capture and assert every stripped
token is captured. Re-verify that every configured binding fires exactly once.

- [x] **Step 5: Verify and commit**

Evidence (2026-07-25): raw-to-rendered mapping and profile-boundary tests pass
for emphasis, page references, tags, inline code, counted words, preferred
columns, `gg/G`, and half pages. Installed/reloaded the phase build in Logseq.
On disposable graph `tesela-keyboard-audit-2026-07-23`, `2w`, `e`, `0`, `$`,
`gg`, `G`, Ctrl-U, and Ctrl-D moved and painted immediately. `k` from the
first July 23 block selected/painted the final July 24 block; `j` crossed back
to the first July 23 block. An initial offscreen-selection smoke exposed a
viewport-sync defect; host painting now scrolls offscreen targets into view,
and the repeated bidirectional test passed. `pnpm check`, all 75 tests,
`pnpm package`, and `git diff --check` pass.

Run:

```bash
node --test --experimental-strip-types tests/rendered-buffer.test.ts tests/visible-block-navigation.test.ts tests/cursor-block.test.ts tests/host-bridge.test.ts
pnpm check
pnpm test
pnpm package
```

Commit and close:

```bash
git add src/runtime/rendered-buffer.ts src/runtime/visible-block-navigation.ts src/runtime/host-bridge.ts public/host-bridge.js src/common/funcs.ts src/stores/search.ts src/keybindings/operators.ts src/keybindings/top.ts src/keybindings/bottom.ts src/keybindings/left.ts src/keybindings/right.ts src/keybindings/up.ts src/keybindings/down.ts src/keybindings/wordForward.ts src/keybindings/wordBackward.ts src/keybindings/wordEnd.ts src/keybindings/lineEnd.ts src/keybindings/firstNonBlank.ts src/keybindings/changeCaseUpperCase.ts src/keybindings/changeCaseLowerCase.ts src/keybindings/search.ts src/keybindings/visualLineMode.ts src/commands/page.ts tests/rendered-buffer.test.ts tests/visible-block-navigation.test.ts tests/cursor-block.test.ts tests/host-bridge.test.ts .docs/ai
git commit -m "feat: add counted rendered Vim motions"
bd close tesela-8c9v.4.16.2 --reason "Counted motions and both rendered-boundary profiles pass check, test, and package."
```

---

### Task 3: Operators, repeat, subtree registers, undo, and redo

**Bead:** `tesela-8c9v.4.16.3`

**Files:**

- Create: `src/runtime/modal-change.ts`
- Create: `src/runtime/block-subtrees.ts`
- Create: `tests/modal-change.test.ts`
- Create: `tests/block-subtrees.test.ts`
- Modify: `src/runtime/vim-register.ts`
- Modify: `src/runtime/text-objects.ts`
- Modify: `src/runtime/normal-mode-mutation.ts`
- Modify: `src/keybindings/operators.ts`
- Modify: `src/keybindings/undo.ts`
- Modify: `src/keybindings/redo.ts`
- Modify: `src/common/funcs.ts`
- Modify: `src/keybindings/changeCurrentBlock.ts`
- Modify: `src/keybindings/copyCurrentBlockContent.ts`
- Modify: `src/keybindings/copyCurrentBlockRef.ts`
- Modify: `src/keybindings/cut.ts`
- Modify: `src/keybindings/deleteCurrentBlock.ts`
- Modify: `src/keybindings/deleteCurrentAndNextSiblingBlocks.ts`
- Modify: `src/keybindings/deleteCurrentAndPrevSiblingBlocks.ts`
- Modify: `src/keybindings/pasteNext.ts`
- Modify: `src/keybindings/pastePrev.ts`
- Modify: `src/keybindings/showRegister.ts`
- Modify: `src/stores/search.ts`
- Modify: `tests/vim-register.test.ts`
- Modify: `tests/text-objects.test.ts`
- Modify: `tests/normal-mode-mutation.test.ts`

**Interfaces:**

```ts
export interface SerializedBlock {
  content: string;
  children: SerializedBlock[];
}
export type VimRegisterValue =
  | { kind: "characterwise"; text: string }
  | { kind: "linewise"; blocks: SerializedBlock[] };
export interface LinewisePutPlan {
  batch: IBatchBlock[];
  sibling: true;
  before: boolean;
}
export const planLinewisePut = (
  register: Extract<VimRegisterValue, { kind: "linewise" }>,
  anchorUUID: string,
  before: boolean
): LinewisePutPlan;
export interface BlockNode {
  uuid: string;
  content: string;
  parentUUID?: string;
  children: BlockNode[];
}
export const canonicalizeSubtreeRoots = (
  selectedUUIDs: readonly string[],
  nodes: readonly BlockNode[]
): string[];
export const serializeSubtrees = (
  rootUUIDs: readonly string[],
  nodes: readonly BlockNode[]
): SerializedBlock[];
export interface MutationPlan {
  updates: Array<{ uuid: string; content: string }>;
  removeRoots: string[];
  register: VimRegisterValue;
  cursor: ModalPoint | null;
}
export interface NativeHistorySnapshot {
  roots: SerializedBlock[];
  cursor: ModalPoint | null;
}
export interface NativeHistoryGroup {
  before: NativeHistorySnapshot;
  after: NativeHistorySnapshot;
  maxNativeSteps: number;
}
export const snapshotDistance = (
  current: NativeHistorySnapshot,
  target: NativeHistorySnapshot
): number;
export const planOperatorMutation = (
  buffer: RenderedBuffer,
  nodes: readonly BlockNode[],
  start: ModalPoint,
  operator: VimOperator,
  motion: MotionName | "iw" | "aw" | "line",
  count: number,
  profile: BoundaryProfile
): MutationPlan;
export const replayChange = (
  change: ChangeDescriptor,
  count: number
): ModalCommand;
```

- [x] **Step 1: Claim and write failing operator/subtree tests**

Run: `bd update tesela-8c9v.4.16.3 --claim`

Test `2d3w`, `diw/daw`, `dd/2dd`, `cc/yy`, cross-block Vim-first ranges,
block-local Logseq-first ranges, overlapping ancestor selection, hidden
descendants, hierarchy serialization, and `.` count multiplication. Require a
named ancestor+descendant fixture that returns only the ancestor root. Require
`2dd` followed by `p` to restore both subtrees in original order through one
`planLinewisePut()` batch with `{ sibling: true }`.
Test `replayChange()` against every `ChangeDescriptor` kind with an exhaustive
`never` arm.
Test `snapshotDistance()` and prove a mocked native step that fails to reduce
distance invokes one compensating inverse action and aborts.

- [x] **Step 2: Verify tests fail**

Run:

```bash
node --test --experimental-strip-types tests/modal-change.test.ts tests/block-subtrees.test.ts
```

Expected: FAIL because both modules are missing.

- [x] **Step 3: Implement pure mutation and repeat planning**

Make characterwise operators produce content updates and linewise operators
produce canonical subtree roots. Extend the unnamed register without flattening
children. Rewrite `putVimRegister` so a linewise value executes the nested
`IBatchBlock` from `planLinewisePut()` with `Editor.insertBatchBlock`, and
verify root order and descendants live. Delete the unused `readClipboard()`
helper and use the register `kind` discriminant for emptiness checks. Change
`VimRegisterStore.write` to `write(value: VimRegisterValue)`;
`planRegisterPut` retains only the characterwise branch, while
`planLinewisePut` owns linewise placement. Update `describeUnnamedRegister`,
`writeClipboard`, `readVimRegister`, and `.text` consumers to switch on `kind`.
`IBatchBlock` does not contain UUIDs: linewise put creates new identities while
preserving content, properties, hierarchy, and order. Keep
`change` insert entry separate from persistence so a failed mutation cannot
leave the engine in insert mode.

- [x] **Step 4: Block on native-history and subtree runtime probes**

Before building history grouping, use the disposable DB graph to run and record
both probes:

1. plugin `updateBlock` → `logseq.editor/undo` → re-fetch and compare content;
2. `removeBlock` on a three-node subtree → native undo → re-fetch and compare
   the complete hierarchy.

Also verify nested `insertBatchBlock` preserves root order, descendants, and
indentation. If either undo probe does not restore the expected snapshot, stop
Task 3 and escalate the history design; do not implement an unproven native
undo loop.

- [x] **Step 5: Execute plans through verified Logseq mutations**

Extend `persistNormalModeContent` or add a sibling exported executor that:

1. re-fetches every block named by the plan;
2. applies content updates;
3. removes only canonical roots;
4. compensates inserted data when a later step fails where the API permits;
5. restores the last verified owned cursor;
6. accepts an optional `ChangeDescriptor` and records `lastChange` only after
   success when that descriptor is non-null;
7. records a `NativeHistoryGroup` with before/after snapshots and a safe
   maximum native-step count.

The installed `@logseq/libs` types prove that
`Editor.getBlock(uuid, { includeChildren: true })` exists and that
`IBatchBlock.children` can represent nested hierarchy. The live probes, not the
type declarations, prove cascade, batch insertion, and native history.

- [x] **Step 6: Route `.`, `u`, and Ctrl-R**

Make `.` dispatch `replayChange(lastChange, count)`. For plugin-owned history,
`u` invokes native `logseq.editor/undo` one step at a time and re-fetches state
after each step, stopping as soon as the recorded `before` snapshot matches or
`maxNativeSteps` is reached. Ctrl-R mirrors this against `after`. If current DB
state matches neither expected snapshot, clear plugin grouping and perform one
native history action. Restore the owned UUID or nearest surviving rendered
UUID afterward.

After each native step, compare a deterministic distance from current state to
the target snapshot. On the first step that does not reduce that distance,
immediately invoke the inverse history action to compensate, re-fetch, restore
the owned cursor, show a Logseq error message, clear the plugin group, and
abort. Never continue to `maxNativeSteps` after non-progress because that could
undo unrelated user edits.

- [x] **Step 7: Run the second live architecture gate**

In the disposable graph, verify `2dd`, one `p`, a three-root linewise delete,
one `u`, and one Ctrl-R. Confirm the put restores hierarchy and root order.
Record the exact native step count required to reach each snapshot. Also record the
fraction of required commands still bypassing the shared core and whether both
profiles remain policy adapters. Failure to reach an expected snapshot within
the recorded maximum is a hard architecture stop; do not close Task 3 on pure
tests alone.

Cut over and strip `keybinding` for this explicit `COMMAND_REGISTRY` inventory:
`undo`, `redo`, `delete-current-block`,
`delete-current-and-next-siblings`,
`delete-current-and-previous-siblings`, `change-current-block`,
`copy-current-block-content`, `paste-next`, `paste-previous`, and `cut`.
`text-operators` already registers label-only palette actions. Verify every
configured token is added to host capture in the same commit and every binding
still fires exactly once. Score `{1–13,20}` here; scenario 20 passes on a
profile change observed by the modal store without reload. More than 4 bypasses
triggers approach 3. The full 20-scenario one-third gate waits for Task 7.

- [x] **Step 8: Verify and commit**

Run:

```bash
node --test --experimental-strip-types tests/modal-change.test.ts tests/block-subtrees.test.ts tests/vim-register.test.ts tests/text-objects.test.ts tests/normal-mode-mutation.test.ts
pnpm check
pnpm test
pnpm package
```

Commit and close:

```bash
git add src/runtime/modal-change.ts src/runtime/block-subtrees.ts src/runtime/vim-register.ts src/runtime/text-objects.ts src/runtime/normal-mode-mutation.ts src/keybindings/operators.ts src/common/funcs.ts src/keybindings/undo.ts src/keybindings/redo.ts src/keybindings/changeCurrentBlock.ts src/keybindings/copyCurrentBlockContent.ts src/keybindings/copyCurrentBlockRef.ts src/keybindings/cut.ts src/keybindings/deleteCurrentBlock.ts src/keybindings/deleteCurrentAndNextSiblingBlocks.ts src/keybindings/deleteCurrentAndPrevSiblingBlocks.ts src/keybindings/pasteNext.ts src/keybindings/pastePrev.ts src/keybindings/showRegister.ts src/stores/search.ts tests/modal-change.test.ts tests/block-subtrees.test.ts tests/vim-register.test.ts tests/text-objects.test.ts tests/normal-mode-mutation.test.ts .docs/ai
git commit -m "feat: compose Vim operators and repeat"
bd close tesela-8c9v.4.16.3 --reason "Operators, repeat, structural registers, and history restoration pass check, test, and package."
```

---

### Task 4: Insert and sibling-open transitions

**Bead:** `tesela-8c9v.4.16.4`

**Files:**

- Create: `src/runtime/insert-session.ts`
- Create: `tests/insert-session.test.ts`
- Modify: `src/keybindings/insert.ts`
- Modify: `src/keybindings/insertBefore.ts`
- Modify: `src/keybindings/nextNewBlock.ts`
- Modify: `src/keybindings/prevNewBlock.ts`
- Modify: `src/keybindings/operators.ts`
- Modify: `src/stores/search.ts`
- Modify: `tests/host-bridge.test.ts`

**Interfaces:**

```ts
export interface InsertSession {
  command: "i" | "a" | "I" | "A" | "o" | "O";
  blockUUID: string;
  beforeContent: string;
  editPosition: number;
  count: number;
}
export const beginInsertSession = (
  command: InsertSession["command"],
  blockUUID: string,
  content: string,
  cursor: number,
  count: number
): InsertSession;
export const finishInsertSession = (
  session: InsertSession,
  afterContent: string
): Extract<ChangeDescriptor, { kind: "insert" }> | null;
```

- [ ] **Step 1: Claim and write failing session tests**

Run: `bd update tesela-8c9v.4.16.4 --claim`

Prove exact edit positions for all six commands, empty blocks, same-indentation
sibling creation, no-op insert sessions, and the minimal contiguous net
replacement between before/after content. A no-op returns `null`; changed
content produces `{relativeStart, removedText, insertedText}` without claiming
to reconstruct caret history.

- [ ] **Step 2: Implement session capture**

Record the original block/content before entering Logseq editing. On the
existing host-ready Esc transition, fetch final content, remove the longest
common prefix and suffix, and record the remaining minimal net replacement
relative to the edit position. Dot replays that content delta at the equivalent
target and does not claim to replay the original keystroke/caret sequence.

- [ ] **Step 3: Route insert/open commands**

Make the shared dispatcher own `i/a/I/A/o/O`. Use
`Editor.insertBlock(anchor, "", { before, sibling: true })` for `o/O`. Dot
replay for `o/O` creates another sibling and inserts the recorded text; it must
not reuse or overwrite the original new block.

After each command is routed, strip `keybinding` from the explicit registry
IDs `insert`, `insert-before`, `next-new-block`, and `previous-new-block`.
Add their configured tokens to host capture in the same commit and verify every
configured binding still fires exactly once.

- [ ] **Step 4: Verify and commit**

Run:

```bash
node --test --experimental-strip-types tests/insert-session.test.ts tests/host-bridge.test.ts
pnpm check
pnpm test
pnpm package
```

Commit and close:

```bash
git add src/runtime/insert-session.ts src/keybindings/insert.ts src/keybindings/insertBefore.ts src/keybindings/nextNewBlock.ts src/keybindings/prevNewBlock.ts src/keybindings/operators.ts src/stores/search.ts tests/insert-session.test.ts tests/host-bridge.test.ts .docs/ai
git commit -m "feat: add deterministic Vim insert transitions"
bd close tesela-8c9v.4.16.4 --reason "Insert/open transitions and repeat capture pass check, test, and package."
```

---

### Task 5: Rendered-view search and character navigation

**Bead:** `tesela-8c9v.4.16.5`

**Files:**

- Create: `src/runtime/rendered-search.ts`
- Create: `tests/rendered-search.test.ts`
- Modify: `src/stores/search.ts`
- Modify: `src/keybindings/search.ts`
- Modify: `src/keybindings/findChar.ts`
- Modify: `src/keybindings/findCharBackward.ts`
- Modify: `src/keybindings/repeatCharSearch.ts`
- Modify: `src/keybindings/repeatCharSearchReverse.ts`
- Modify: `src/keybindings/operators.ts`
- Modify: `src/main.ts`
- Modify: `tests/context-guard.test.ts`

**Interfaces:**

```ts
export interface RenderedMatch extends ModalPoint {
  length: number;
}
export const findRenderedMatches = (
  buffer: RenderedBuffer,
  query: string
): RenderedMatch[];
export const moveRenderedMatch = (
  matches: readonly RenderedMatch[],
  currentIndex: number,
  direction: "next" | "previous",
  count: number
): { index: number; wrapped: boolean };
export const resolveCharacterFind = (
  content: string,
  cursor: number,
  motion: "f" | "F" | "t" | "T",
  character: string,
  count: number
): number | null;
```

- [ ] **Step 1: Claim and write failing search/find tests**

Run: `bd update tesela-8c9v.4.16.5 --claim`

Cover display order, multiple matches per block, case behavior matching current
Vimblocks search, wrap notices, counts, `t/T` offsets, `;/,`, missing matches,
Esc cancellation, and text-entry guards.

- [ ] **Step 2: Replace page-tree search with rendered-buffer search**

Store the latest host-provided rendered UUID order before opening `/`. Fetch
unique DB blocks through one inspected and live-probed batch seam:
`logseq.DB.datascriptQuery` when the DB graph exposes the required UUID/content
shape, otherwise one page-tree query per visible journal page. Reconcile those
results to the host-provided rendered order, call `findRenderedMatches`, and
move the owned cursor/highlight to the match. Do not use
`getCurrentPageBlocksTree()` as the only Vim `/` source. The July 23/July 24
live fixture must complete DB fetch plus match planning in at most 150 ms.
Remove the existing 300 ms debounce and 50 ms highlight delay from the
Enter/`n`/`N` modal path, and record both fetch+match and end-to-end key-to-paint
latency in the final report.

- [ ] **Step 3: Route character pending state through the modal engine**

Use `char-pending` for `f/F/t/T`; capture exactly one printable character or
Esc. Keep `setHostCaptureAll(true)` only for the pending character interval and
always release it on completion, cancellation, UI close, graph change, or
plugin dispose.

After routing, strip `keybinding` from the exact registry IDs `search`,
`find-character`, `find-character-backward`, `repeat-character-search`, and
`repeat-character-search-reverse`. Extend `findChar.ts` and
`findCharBackward.ts` to register `till-character` and
`till-character-backward`; `lineStart` and `repeatChange` remain
host-dispatch-only tokens with no palette registrar. The `search` registrar
owns `/`, `n`, `N`, and cleanup actions. Add every routed configured token to
host capture in the same commit and verify every configured binding still
fires exactly once.

- [ ] **Step 4: Verify and commit**

Run:

```bash
node --test --experimental-strip-types tests/rendered-search.test.ts tests/context-guard.test.ts tests/host-bridge.test.ts
pnpm check
pnpm test
pnpm package
```

Commit and close:

```bash
git add src/runtime/rendered-search.ts src/stores/search.ts src/keybindings/search.ts src/keybindings/findChar.ts src/keybindings/findCharBackward.ts src/keybindings/repeatCharSearch.ts src/keybindings/repeatCharSearchReverse.ts src/keybindings/operators.ts src/main.ts tests/rendered-search.test.ts tests/context-guard.test.ts tests/host-bridge.test.ts .docs/ai
git commit -m "feat: add rendered Vim search and character find"
bd close tesela-8c9v.4.16.5 --reason "Rendered search and f/F/t/T repeat behavior pass check, test, and package."
```

---

### Task 6: Characterwise and linewise visual modes

**Bead:** `tesela-8c9v.4.16.6`

**Files:**

- Modify: `src/runtime/cursor-style.ts`
- Modify: `tests/cursor-style.test.ts`
- Create: `tests/visual-mode.test.ts`
- Modify: `src/runtime/modal-command.ts`
- Modify: `src/runtime/rendered-buffer.ts`
- Modify: `src/runtime/block-subtrees.ts`
- Modify: `src/runtime/host-bridge.ts`
- Modify: `public/host-bridge.js`
- Modify: `src/stores/search.ts`
- Modify: `src/keybindings/toggleVisualMode.ts`
- Modify: `src/keybindings/visualLineMode.ts`
- Modify: `src/keybindings/operators.ts`
- Modify: `src/main.ts`
- Modify: `tests/host-bridge.test.ts`
- Modify: `tests/block-subtrees.test.ts`

**Interfaces:**

```ts
export interface HostHighlightRange {
  uuid: string;
  renderedOffset: number;
  renderedLength: number;
  role: "cursor" | "visual";
}
export const highlightHostRanges = (
  ranges: readonly HostHighlightRange[]
): void;
export interface VisualRange {
  kind: "characterwise" | "linewise";
  start: ModalPoint;
  end: ModalPoint;
  rootUUIDs: string[];
}
export const resolveVisualRange = (
  buffer: RenderedBuffer,
  nodes: readonly BlockNode[],
  anchor: ModalPoint,
  head: ModalPoint,
  kind: VisualRange["kind"],
  profile: BoundaryProfile
): VisualRange;
```

- [ ] **Step 1: Claim and write failing visual traces**

Run: `bd update tesela-8c9v.4.16.6 --claim`

Test `v` and `V` entry/exit, forward/reverse motions, counts, same-block
character ranges, Vim-first cross-block ranges, Logseq-first boundary stops,
linewise canonical roots, hidden descendants, `d/c/y`, and Esc restoration.
Include a selection spanning emphasis, inline code, and a page reference.

- [ ] **Step 2: Add multi-range host painting**

Before cutover, prove `CSS.highlights`, `Highlight`, and DOM `Range` exist in
Logseq 2.0.1. Add a `highlight-ranges` bridge message that turns every block
segment into a DOM `Range`, including selections crossing multiple text nodes,
and installs cursor/visual ranges with the CSS Custom Highlight API without
mutating Logseq-owned DOM. Add `::highlight(vimblocks-cursor)` and
`::highlight(vimblocks-visual)` styles. If the capability probe fails, wrap
every intersecting text-node segment from last to first as the explicit
fallback. Never paint journal headings, inputs, or contenteditable editors.
One atomic message replaces the old clear plus 50ms debounce.

Compute each range's `renderedLength` as the difference between the rendered
offsets of its raw start and raw end; never pass a raw-content length to the
host. Add a markup-bearing fixture that would fail if delimiters inflate the
painted selection. Move style generation to `src/runtime/cursor-style.ts` and
prove the configured cursor color is emitted for both
`::highlight(vimblocks-cursor)` and the mark fallback.
Preserve the existing `cursorHighlightStyle()` mark fallback, add
`highlightPseudoStyle()` for the cursor and visual pseudo-elements, and emit
both from the single `logseq.provideStyle` call in `src/main.ts`.

- [ ] **Step 3: Replace single-block visual state**

Store anchor/head as `ModalPoint`s. Characterwise Logseq-first clamps the head
to the anchor block; Vim-first follows rendered order. Linewise `V` resolves
canonical subtree roots in both profiles. Operators consume `VisualRange` and
return to normal mode with one usable cursor.

After routing, strip `keybinding` from the exact registry IDs `visual-mode`
and `visual-line-mode`. Add their configured tokens to host capture in the
same commit and verify every configured binding still fires exactly once.
Visual-range mutations pass `null` as the executor's optional
`ChangeDescriptor`, leaving `lastChange` untouched rather than fabricating a
motion-shaped repeat.

- [ ] **Step 4: Verify and commit**

Run:

```bash
node --test --experimental-strip-types tests/visual-mode.test.ts tests/cursor-style.test.ts tests/host-bridge.test.ts tests/block-subtrees.test.ts
pnpm check
pnpm test
pnpm package
```

Commit and close:

```bash
git add src/runtime/cursor-style.ts src/runtime/modal-command.ts src/runtime/rendered-buffer.ts src/runtime/block-subtrees.ts src/runtime/host-bridge.ts public/host-bridge.js src/stores/search.ts src/keybindings/toggleVisualMode.ts src/keybindings/visualLineMode.ts src/keybindings/operators.ts src/main.ts tests/cursor-style.test.ts tests/visual-mode.test.ts tests/host-bridge.test.ts tests/block-subtrees.test.ts .docs/ai
git commit -m "feat: add Vim character and line visual modes"
bd close tesela-8c9v.4.16.6 --reason "v/V, profile boundaries, multi-range painting, and subtree-safe operators pass check, test, and package."
```

---

### Task 7: Package, install, and complete the two-profile product test

**Bead:** `tesela-8c9v.4.16.7`

**Files:**

- Modify: `package.json`
- Modify: `tests/package-release.test.ts`
- Modify: `scripts/package-release.mjs`
- Create: `.docs/ai/phases/vim-daily-parity-report.md`
- Modify: `.docs/ai/current-state.md`
- Modify: `.docs/ai/roadmap.md`
- Modify: `.docs/ai/phases/vim-daily-parity-plan.md`

- [ ] **Step 1: Claim the phase and run a clean baseline**

Run:

```bash
bd update tesela-8c9v.4.16.7 --claim
pnpm check
pnpm test
pnpm package
git rev-parse HEAD
git status --short
```

Expected: all automated gates pass and only intended tracked changes exist.

- [ ] **Step 2: Set and verify version 0.5.0**

Change `package.json` from `0.5.0-capture.1` to `0.5.0`. Extend
`tests/package-release.test.ts` to require the same version and stable plugin
ID in the hermetic staged-package fixture by asserting the staged manifest
version equals the fixture root manifest version and
`logseq.id === "logseq-plugin-vim-shortcuts"`. Put real-build assertions only
in the CLI entry block of `scripts/package-release.mjs`, after `pnpm package`
has built `dist`: refuse to stage when `dist/key-token.js` or
`dist/host-bridge.js` is missing, or when `dist/index.html` fails
`/(?:\.\/)?key-token\.js/` before the module entry. The exported
`stageRelease()` remains hermetic and accepts the synthetic fixture.

- [ ] **Step 3: Preserve the installed rollback copy outside plugin scan**

Resolve the current stable install and verify it is exactly one directory:

First call Computer Use `get_app_state` with app exactly `Logseq`, confirm the
disposable graph, exit any active block editor, and then request a normal quit.
Poll for process exit and stop without moving the plugin if Logseq remains
running; do not force-quit dirty state.

```bash
test -d /Users/tfinklea/.logseq/plugins/vimblocks
test ! -e /Users/tfinklea/.logseq/plugin-backups/vimblocks-before-0.5.0-20260725
test ! -e /Users/tfinklea/.logseq/plugin-backups/vimblocks-staged-0.5.0-20260725
test ! -e /Users/tfinklea/.logseq/plugin-backups/vimblocks-replaced-0.5.0-20260725
mkdir -p /Users/tfinklea/.logseq/plugin-backups/vimblocks-before-0.5.0-20260725
ditto /Users/tfinklea/.logseq/plugins/vimblocks /Users/tfinklea/.logseq/plugin-backups/vimblocks-before-0.5.0-20260725
diff -qr /Users/tfinklea/.logseq/plugins/vimblocks /Users/tfinklea/.logseq/plugin-backups/vimblocks-before-0.5.0-20260725
mkdir -p /Users/tfinklea/.logseq/plugin-backups/vimblocks-staged-0.5.0-20260725
ditto dist /Users/tfinklea/.logseq/plugin-backups/vimblocks-staged-0.5.0-20260725
diff -qr dist /Users/tfinklea/.logseq/plugin-backups/vimblocks-staged-0.5.0-20260725
osascript -e 'tell application "Logseq" to quit'
for attempt in {1..20}; do pgrep -f 'Logseq.app/Contents/MacOS' >/dev/null || break; sleep 0.5; done
! pgrep -f 'Logseq.app/Contents/MacOS' >/dev/null
mv /Users/tfinklea/.logseq/plugins/vimblocks /Users/tfinklea/.logseq/plugin-backups/vimblocks-replaced-0.5.0-20260725
mv /Users/tfinklea/.logseq/plugin-backups/vimblocks-staged-0.5.0-20260725 /Users/tfinklea/.logseq/plugins/vimblocks
diff -qr dist /Users/tfinklea/.logseq/plugins/vimblocks
open -a /Applications/Logseq.app
```

Rollback command:

```bash
mv /Users/tfinklea/.logseq/plugins/vimblocks /Users/tfinklea/.logseq/plugin-backups/vimblocks-failed-0.5.0-20260725
ditto /Users/tfinklea/.logseq/plugin-backups/vimblocks-before-0.5.0-20260725 /Users/tfinklea/.logseq/plugins/vimblocks
```

- [ ] **Step 4: Run agent-owned live verification**

Before interaction, call Computer Use `get_app_state` with app exactly
`Logseq`. Confirm graph `tesela-keyboard-audit-2026-07-23`. If another graph is
active, switch only to the disposable graph; never inspect or edit production.

Run the complete twelve-step live matrix from
`.docs/ai/phases/vim-daily-parity-spec.md` in both profiles. Record exact
strings before/after mutations, cursor positions, profile persistence after
reload and full restart, July 23/July 24 crossings, dashboard version/count,
and renderer/plugin-load errors.
Enable the scoped dispatch trace and score all 20 transport scenarios; more
than 6 bypasses triggers approach 3 rather than release. Disable and remove the
trace after evidence capture.

- [ ] **Step 5: Give Taylor one comparison test**

Provide a short product test that starts Logseq-first, switches to Vim-first,
repeats the same cross-block word/operator/visual actions, and asks Taylor which
profile should be the preferred default. Both profiles remain installed and
last-used persistence remains enabled.

- [ ] **Step 6: Write the report and final verification**

The report must include:

- exact Computer Use target and interaction path;
- pre-install commit, package version, stable/backup paths, worktree branch,
  commits, and every phase Bead;
- root causes and changed files;
- all automated results;
- installed version and stable/rollback paths;
- exact Esc, motion, count, operator, `.`, undo/redo, insert/open, search/find,
  `v/V`, subtree, and cross-day outcomes for both profiles;
- command-palette, capture, PDF, dashboard, reload, and console results;
- confirmation that only the disposable graph was used;
- confirmation that `tesela-8c9v.4` remains open.

Run:

```bash
pnpm check
pnpm test
pnpm package
diff -qr dist /Users/tfinklea/.logseq/plugins/vimblocks
git status --short
```

- [ ] **Step 7: Commit and close the implementation wave**

Commit:

```bash
git add package.json scripts/package-release.mjs tests/package-release.test.ts .docs/ai
git commit -m "feat: deliver Vimblocks 0.5.0 daily parity"
bd close tesela-8c9v.4.16.7 --reason "Vimblocks 0.5.0 passes automation and the complete two-profile disposable-graph Logseq product test."
bd close tesela-8c9v.4.16 --reason "All seven daily-parity phases are committed, installed, and live-verified; human comparison is delivered while tesela-8c9v.4 remains open."
```

Do not close `tesela-8c9v.4`. Do not push.
