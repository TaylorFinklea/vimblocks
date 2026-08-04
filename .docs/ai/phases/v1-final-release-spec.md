# Vimblocks 1.0.0 Final Release Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:executing-plans` to execute this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish Vimblocks 1.0.0-rc.1 as an explicitly prerelease GitHub
release for a two-day, three-device soak, then promote a separately verified
1.0.0 artifact and submit the Logseq Marketplace listing.

**Architecture:** Freeze one runtime artifact before the soak. Keep inert
release work parallel, but never let documentation or Marketplace work obscure
which bundle was installed and tested. Release through the existing draft
workflow, using exact-ref tag pushes and a final smoke of the downloaded asset.

**Tech stack:** Logseq DB 2.0.1 desktop, TypeScript/Vue/Vite, pnpm 11.13.1,
GitHub Actions, Logseq Marketplace manifest.

## Global Constraints

- Live testing only on graph `tesela-keyboard-audit-2026-07-23`.
- Never open, inspect, or edit `taylor`; never touch the Tesela project.
- No push, tag, release publication, release mutation, or Marketplace PR
  without Taylor's explicit go for that action.
- Runtime restart set: `src/**`, `public/**`, `index.html`, runtime
  dependencies, or build configuration. Docs, icon, workflow, release
  metadata, and Marketplace files do not restart the soak, but any packaged
  artifact change requires rebuilding and an R5 load check.
- Use exact tag pushes. Never `git push --tags` or `--follow-tags`.

## Reviewed Ground Truth — 2026-07-28

- `main` and `origin/main` both point to `71d29be`; remote CI run
  `30418118423` passed on Node 22.22.0.
- Automated gate: TypeScript clean, 151/151 tests, package green.
- The running install is **not** the current release artifact:
  installed `assets/index-DBbYuxDA.js`; current package
  `assets/index-DFkx69Z8.js`; `diff -rq` is not clean.
- Therefore Run 4 did not prove the final R3 settings-close or S6 PDF fixes.
  The final `SMOKE: pass` is provisional until the focused Run 5 below.
- Tracked `icon.png` is the upstream icon and ships inside the GitHub ZIP.
- Selected replacement: `vimblocks-aqua.png`, 1024×1024 aqua stepped-block
  mark on charcoal. It is visually distinct and strongest at small dark-UI
  sizes. Because it is currently under `ai-scratch/`, an agent must not copy
  it into a tracked path; Taylor must place the selected file at `icon.png`.
- `index.html` still ships `<title>Vim shortcuts</title>`.
- Logseq Marketplace requires at least one image or GIF showing the plugin in
  action; the removed upstream screencast cannot satisfy that requirement.
- Local clone has 36 tags, while origin has only v0.3.0 and v0.3.1. The
  inherited local tags must never be batch-pushed.
- Existing public v0.3.0/v0.3.1 releases make v0.3.1 the current GitHub
  `latest`; release-state cleanup needs an explicit Taylor decision before
  1.0.0 publication.

## Reviewer Adjudication

- Opus 5, Kimi K3, and GLM 5.2: `ship-with-changes`.
- Accepted consensus: final-artifact mismatch, icon before tag, stale HTML
  title, explicit soak contract, stale handoff state, Marketplace action
  image, exact-ref tag push, and draft-asset verification.
- Rejected GLM R6 objection: Run 4 explicitly records the exact palette query
  from an active Vim cursor.
- Rejected Kimi production-graph soak: violates the hard graph boundary.
- No review evidenced a new release-blocking runtime defect.

---

### Task 1: Freeze the actual release candidate

**Files:**
- User replaces: `icon.png`
- Modify: `index.html`
- Test: `tests/package-release.test.ts` only if packaging expectations change

- [x] **Step 1: Taylor places the selected aqua candidate at `icon.png`**

Agent boundary: do not copy or move it out of `ai-scratch/`.

- [x] **Step 2: Verify the selected icon**

Run:

```bash
file icon.png
sips -g pixelWidth -g pixelHeight -g hasAlpha icon.png
```

Acceptance: square PNG, at least 256×256, legible at 32 and 48 px on both
light and dark fields, visibly distinct from the upstream Vim mark.

- [x] **Step 3: Correct the shipped HTML title**

Change `index.html` from `Vim shortcuts` to `Vimblocks`.

- [x] **Step 4: Run the full automated gate**

```bash
pnpm check
pnpm test
pnpm package
```

Acceptance: TypeScript clean, all tests pass, package succeeds.

Result: TypeScript clean; 151/151 tests; package created
`release/vimblocks-1.0.0-rc.1.zip`.

- [x] **Step 5: Commit the candidate**

Commit only the icon, title, tests if needed, and handoff updates.

Result: committed as `10c04ff` (`release: prepare v1.0.0-rc.1`).

---

### Task 2: Install and prove the final artifact

**Files:**
- Install source: `release/vimblocks/`
- Install destination: `~/.logseq/plugins/vimblocks`
- Record: `.docs/ai/phases/v1-smoke.md`

- [x] **Step 1: Back up the current installed candidate**

Use a new timestamped directory under `~/.logseq/plugin-backups/`; do not
overwrite an existing backup.

Result: no existing `~/.logseq/plugins/vimblocks` installation or backup
directory existed, so there was nothing to back up.

- [x] **Step 2: Install and compare**

Acceptance:

```bash
diff -rq release/vimblocks ~/.logseq/plugins/vimblocks
```

prints nothing.

Result: copied the final staged tree to `~/.logseq/plugins/vimblocks`;
`diff -rq` exited 0 with no output.

- [x] **Step 3: Verify the safety boundary before input**

Sidebar must visibly show `tesela-keyboard-audit-2026-07-23`.

Result: Taylor authorized a new isolated replacement graph. Created and
visibly verified `vimblocks-marketplace-2026-07-31` before any test input.

- [x] **Step 4: Run focused Run 5**

- R5: one enabled Vimblocks 1.0.0 card, new icon visible, no load error.
- R3: title Close, Cancel, and unsaved-change Confirm each return focus; a
  fresh block immediately accepts exact `focus recovered`.
- S6: existing DB asset PDF opens inline; no new `PDF loader`,
  `UnexpectedResponseException`, or `Missing PDF` console error.

- [x] **Step 5: Pin the evidence**

Append Run 5 with installed `assets/index-<hash>.js`, `diff -rq` result,
observations, console result, and final `SMOKE: pass` or failure.

2026-07-28 RC note: Computer Use timed out on the first Logseq state request.
Per the capture-layer hazard, no retry or UI mutation was attempted. The exact
RC live check is therefore deferred to the manual multi-device soak; this is
acceptable for an explicitly marked prerelease only, not for final 1.0.0.

---

### Task 3: Run the bounded soak

**Files:**
- Create: `.docs/ai/phases/v1-soak.md`

**Entry gate:** for final 1.0.0, Task 2 passes against the exact downloaded
artifact. For 1.0.0-rc.1 only, the published prerelease itself is the soak
artifact and the manual device installs supply the missing live evidence.

**Budget:** all required:

- At least 3 sessions across at least 2 calendar days.
- At least 90 cumulative active editing minutes.
- At least 6 plugin unload/reload or Logseq restart cycles.

**Activities across the budget:**

- Daily modal use: motions, counts, text objects, `c`/`d`/`y`, `.`, `/ n N`,
  `v`/`V`, subtree yank/put, undo/redo.
- At least 10 Esc → insert → Esc transitions from varied states.
- At least 5 plugin off/on cycles; after each, `x` and `dd` execute once.
- Command palette, global search, date picker, and property editor exact-input
  checks from an active Vim cursor.
- Two boundary-profile switches with reload.
- Three DB task captures and one inline PDF open.
- One session at least 30 minutes without reload, followed by normal-mode use.
- One off-screen stale-cursor R1 probe at the end.

**Stop bar:** any R1–R8 occurrence stops the soak and blocks the tag.

**Restart rule:** only a runtime restart-set change restarts the budget.
Documentation, action-shot, icon, workflow, and Marketplace changes do not;
rebuild and rerun R5 for any packaged-file change.

**Evidence:** artifact identifier, dates, minutes, reload counts, activities,
findings, console errors, restart ledger, and exactly
`SOAK: pass (<sessions>, <minutes>, <reloads>)` or
`SOAK: fail (<classes>)`.

---

### Task 4: Finish inert release preparation during the soak

**Files:**
- Create: Marketplace `packages/vimblocks/manifest.json` in the Marketplace
  contribution checkout, not this repository
- Modify: `README.md`
- Modify: `.github/workflows/ci.yml`
- Modify: `.github/workflows/publish.yml`
- Modify: `.docs/ai/current-state.md`
- Modify: `.docs/ai/roadmap.md`

- [x] **Step 1: Capture one original action image or GIF**

Use the real DB build on the disposable graph. Show Vimblocks visibly in
action without private content. Add it to README for Marketplace eligibility.

Result: created the isolated `Vimblocks Marketplace Demo` page and captured
the final 1.0.0 DB task overlay parsing `tom at 3 pm p1` into Todo, Urgent,
and Scheduled properties. Added the reviewed 3604×2268 original image at
`docs/images/vimblocks-db-task-capture.png`; no private content is visible.

- [x] **Step 2: Draft the Marketplace manifest**

Required values include:

```text
repo: TaylorFinklea/vimblocks
effect: true
supportsDBOnly: true
web: false
```

Do not submit before the GitHub release is public.

Result: drafted `packages/vimblocks/{manifest.json,icon.png}` in temporary
checkout `/private/tmp/logseq-marketplace-vimblocks`; JSON and routing fields
validated, and the 1024×1024 icon is byte-identical to this repository's icon.

- [x] **Step 3: Decide workflow SHA pinning**

Runner and Node are pinned; `actions/checkout@v4` and
`actions/setup-node@v4` still float. Either pin immutable SHAs or record the
explicit risk acceptance before tagging.

Result: pinned checkout to `11d5960a326750d5838078e36cf38b85af677262`
and setup-node to `49933ea5288caeca8642d1e84afbd3f7d6820020`, the commits
advertised by their respective `v4` refs on 2026-07-31.

- [x] **Step 4: Reconcile handoff state**

Record Run 5 and soak truth. Remove the stale pending PDF/smoke blockers.

- [x] **Step 5: Audit release refs**

Record the 36 local tags and the two origin tags. With explicit approval,
remove inherited local tags or preserve them while enforcing exact-ref pushes.
Never batch-push them.

Result (2026-08-03): the earlier 36-tag local state is no longer present.
Exactly four tags exist locally and on origin: `v0.3.0`, `v0.3.1`,
`v1.0.0-rc.1`, and `v1.0.0-rc.2`. Every local target commit matches the
corresponding peeled origin tag. No tag was created, removed, or pushed.

---

### Task 5: Create and verify the draft release

**Final 1.0.0 prerequisite:** `SOAK: pass` for the exact runtime candidate.

**Post-RC.3 final candidate — 2026-08-03:**

- Manifest version advanced from `1.0.0-rc.3` to `1.0.0`; no runtime source
  changed after the successful rc.3 soak.
- Fresh gates: TypeScript clean, 160/160 tests, packaging succeeds.
- Local package: `release/vimblocks-1.0.0.zip`; SHA-256
  `a45fa75de24a887113efeaad2dedd3e12b0f3157f48c6ebdbdc90705518525bb`;
  runtime `assets/index-DSUORCDr.js`.
- The expanded final artifact was installed byte-for-byte. Logseq loaded
  `1.0.0`; visible Capture focused its input and accepted exact
  `marketplace final probe` without an input click. The capture was canceled
  and created no task.
- Fresh Marketplace checkout `/tmp/logseq-marketplace-vimblocks`, local branch
  `codex/add-vimblocks`, contains validated
  `packages/vimblocks/{manifest.json,icon.png}`. Routing is `effect: true`,
  `supportsDB: true`, `supportsDBOnly: true`, `web: false`; icon SHA-256
  `8239d407d01b926c3c2e7a14484d0b3f0b06e2b3db894ddf39eb597822fbe104`
  matches this repository exactly.
- No push, final tag, final release mutation/publication, fork creation, or
  Marketplace PR submission is authorized or performed by this preparation.

**Local final candidate — 2026-07-31:**

- Manifest version advanced from `1.0.0-rc.2` to `1.0.0`.
- Automated gate: TypeScript clean, 158/158 tests, package succeeds.
- Local package: `release/vimblocks-1.0.0.zip`; SHA-256
  `fc9b1b8868db688fa9a9ff17d3111dc773cc132191e4c1dea2f25c4a97c77dfd`.
- Runtime asset: `assets/index-BQoQWnii.js`.
- This candidate is not approved for tagging or publication until numeric soak
  evidence, exact-artifact install/diff, focused Run 5, and the action image
  gate pass.

**RC exception authorized 2026-07-28:** Taylor requested public
`v1.0.0-rc.1` now for testing on two additional devices over the next two
days. Push `main`, require green CI, push only
`refs/tags/v1.0.0-rc.1`, verify the CI ZIP and digest against the local
candidate, then publish the draft with GitHub's prerelease flag. This does not
authorize final `v1.0.0` or a Marketplace submission.

**RC publication result — 2026-07-29:**

- Origin CI `30420083458`: passed on `10c04ff`.
- Exact annotated tag `v1.0.0-rc.1` points to `10c04ff`; no other local tags
  were pushed.
- Publish workflow `30450598420`: passed.
- CI ZIP SHA-256:
  `0f9822320c692b91d8255a345f50275e527a8dac2439ffdc0979067e347499d5`.
- Downloaded checksum matched; extracted CI package was byte-for-byte
  identical to local `release/vimblocks/`.
- Published as GitHub prerelease, not latest:
  `https://github.com/TaylorFinklea/vimblocks/releases/tag/v1.0.0-rc.1`.
- Exact live UI verification remains manual because Computer Use timed out.

**Post-RC icon adjustment — 2026-07-29:**

- Enlarged the aqua mark with the local `ffmpeg` CLI from a `480×296` visual
  bound to `800×493`, centered on the unchanged 1024×1024 charcoal canvas.
- New icon SHA-256:
  `8239d407d01b926c3c2e7a14484d0b3f0b06e2b3db894ddf39eb597822fbe104`.
- 48 px preview remains legible; TypeScript, 151/151 tests, and packaging pass.
- The published RC remains immutable with its original icon. This new icon is
  for final 1.0.0 and the Marketplace submission.
- Icon-only change does not restart the runtime soak, but final R5 must verify
  the new card icon from the downloaded final artifact.

**RC.2 capture UI adjustment — 2026-07-29:**

- User screenshot exposed black inherited text on a dark Logseq plugin frame.
- Capture first gained an explicit navy/slate/white fallback so it no longer
  depended on Tailwind's absent host `dark` class. Live review then rejected
  that palette as visibly foreign to Logseq.
- The host bridge now sends only allowlisted semantic surface, text, border,
  font, radius, and selected `--lx-accent-*` values to its authenticated plugin
  frame. The capture consumes those values with safe fallbacks and refreshes
  on theme changes and every open.
- A 10 px host-native mode indicator appears only while Vimblocks owns input:
  `NORMAL`, `INSERT`, `VISUAL`, or `V-LINE`. It is removed when capture is
  disabled, including by the panic chord, and does not intercept pointer input.
- The editable input has a synchronized, pointer-inert presentation layer.
  Only date, deadline, time, and priority shorthand actually consumed by the
  parser is highlighted; raw input, selection, and caret stay native.
- Regression tests cover `due tom at 8 p1` segmentation and ensure an
  unconsumed bare `at 8` remains plain. Automated gate: TypeScript clean,
  158/158 tests, package `release/vimblocks-1.0.0-rc.2.zip`; local ZIP SHA-256
  `da465b322996ce7b96b8279da108b789ea40d67a08b67d59f3eeea03a87ae84f`.
- This is a runtime change and restarts the soak. Before final publication or
  Marketplace submission, human verification must confirm readable colors,
  visible `tom`/`p1` highlighting, ordinary editing/selection, Enter create,
  Esc close, and accurate minimal mode transitions in live Logseq.
- Published `v1.0.0-rc.2` prerelease:
  https://github.com/TaylorFinklea/vimblocks/releases/tag/v1.0.0-rc.2
- CI run `30508541767` passed; downloaded ZIP SHA-256
  `5176361e93e373b3927b9c92a9b0f76be48074ee5b72367b35a7891b5ecc8b79`
  matched its checksum and extracted byte-for-byte against the approved local
  `release/vimblocks/` tree.

**RC.3 Capture autofocus adjustment — 2026-08-03:**

- Taylor chose to fix the known mouse-click requirement before Marketplace
  submission and restart the full bounded soak.
- Root cause: `showMainUI({ autoFocus: true })` returns before Logseq finishes
  focusing the plugin iframe, so the host could overwrite the component's
  initial input focus. Capture now waits for iframe focus, then focuses and
  verifies the capture input; the component keeps its deferred fallback.
- Regression coverage verifies direct iframe/input focus and the host-focus
  wait. Fresh gates: TypeScript clean, 160/160 tests, and packaging succeeds.
- Local package: `release/vimblocks-1.0.0-rc.3.zip`; SHA-256
  `9e6ca57c862ccd51bbeaaea17ed74c125511dd4e4f90220f784d408ff1696da3`;
  runtime `assets/index-DvarLuei.js`.
- The exact expanded rc.3 artifact was installed byte-for-byte. With a safe
  destination selected, the visible Capture overlay reported its input as the
  focused element and accepted exact `focus probe` without clicking; the
  capture was canceled and created no task.
- Typing synthesized before the overlay is visible can still outrun plugin UI
  creation and lose leading characters; the verified user path begins once
  the overlay appears.
- This `src/**` change supersedes rc.2 soak certification. RC.3 must be
  published and complete the full 3-device bounded soak before final 1.0.0.
- No push, tag, prerelease publication, or final-release action was authorized
  or performed by this local preparation.

**RC.3 draft verification — 2026-08-03:**

- Taylor separately approved the `main` push and exact tag push. Head commit
  `8761e65` passed CI run `30868420007`; annotated tag `v1.0.0-rc.3` points to
  that exact commit.
- Publish workflow `30868490609` passed and created a draft release. Downloaded
  ZIP SHA-256
  `2731fd26139cd47dbf37eb6109db011b812f266aa676a64bdf221cb6f9510d35`
  matches its checksum; the extracted tree is byte-for-byte identical to the
  approved local rc.3 tree.
- Installed the downloaded expanded tree byte-for-byte. After reload, Logseq
  loaded `1.0.0-rc.3`; visible Capture focused its input and accepted exact
  `downloaded probe` without an input click. The capture was canceled and
  created no task.
- Taylor approved prerelease publication. RC.3 was published with
  `isDraft=false` and `isPrerelease=true`:
  https://github.com/TaylorFinklea/vimblocks/releases/tag/v1.0.0-rc.3
- Final 1.0.0 and Marketplace submission remain unauthorized. The restarted
  three-device soak is now the active release blocker.

**RC.3 soak result — 2026-08-03:**

- Taylor confirmed successful rc.3 use against the previously stated floor:
  3 devices, 3 sessions across at least 2 calendar days, 90 cumulative active
  minutes, and 6 reload/restart cycles.
- No R1-R8 or other stop-bar failure was reported.
- `SOAK: pass`; final 1.0.0 preparation may resume. Push, tag, publication,
  and Marketplace submission remain separate approval gates.

- [x] **Step 1: Obtain Taylor's push approval**

- [x] **Step 2: Push `main` and require CI green**

Result (2026-08-03): Taylor approved pushing `main` only. Commit `4eb2f87`
was pushed; CI run `30868311362` passed Typecheck, Test, and Package. No rc.3
tag or prerelease was created.

- [x] **Step 3: Resolve v0.3.0/v0.3.1 release-state policy**

Before publishing 1.0.0, decide whether the old releases become prereleases so
GitHub `latest` can never fall back to the pre-v1 build.

Result (2026-08-03): preserve both releases and their assets, but mark
`v0.3.0` and `v0.3.1` as prereleases immediately before publishing final
1.0.0. No release flag was changed during preparation.

- [x] **Step 4: Obtain Taylor's tag approval**

- [x] **Step 5: Push only the exact v1 tag**

```bash
git push origin refs/tags/v1.0.0
```

- [x] **Step 6: Verify the draft asset**

Download ZIP and `SHA256SUMS.txt`; verify digest; extract; compare the relative
path set and per-file hashes against the locally approved tree. A differing
runtime asset hash is a stop.

- [x] **Step 7: Install the downloaded asset and micro-smoke**

Verify load, Esc, one motion, one mutation plus undo, and unload/reload with a
clean console.

Result (2026-08-03):

- Final source commit `fc8165c` passed CI run `30871827278`; annotated tag
  `v1.0.0` points to that exact commit.
- Publish workflow `30871919999` passed and created a private, non-prerelease
  draft. Downloaded ZIP SHA-256
  `2ed55a58c7a2380b5b60f964cddc632b78198b39e3f556cf055943bda822577b`
  matches `SHA256SUMS.txt`; its extracted tree is byte-for-byte identical to
  the locally approved final tree.
- Installed the downloaded tree byte-for-byte. Logseq loaded final `1.0.0`;
  `0` then `l` moved the cursor, `x` changed `Composable` to `Cmposable`, and
  `u` restored the exact original text. Capture focused without an input click
  and accepted exact `final downloaded probe`; cancellation created no task.
  A subsequent reload completed with no visible error notification.
- Renderer-console inspection was unavailable in this harness; earlier exact
  artifact runs and the successful rc.3 soak remain the console/runtime
  evidence. No new visible load failure occurred.

- [x] **Step 8: Obtain Taylor's publish approval and publish the draft**

Result (2026-08-03): Taylor approved the coordinated publication. Preserved
`v0.3.0` and `v0.3.1` but marked both prerelease, then published `v1.0.0` as
stable Latest. Verified `isDraft=false`, `isPrerelease=false`, and
`isLatest=true`:
https://github.com/TaylorFinklea/vimblocks/releases/tag/v1.0.0

Stable asset URLs:
- `vimblocks-1.0.0.zip`; SHA-256
  `2ed55a58c7a2380b5b60f964cddc632b78198b39e3f556cf055943bda822577b`
- `SHA256SUMS.txt`

---

### Task 6: Submit Marketplace listing and close the release

- [ ] **Step 1: Submit the Marketplace PR**

Include manifest, identical chosen icon, and README action image/GIF.

- [ ] **Step 2: Update release handoff**

Record GitHub release URL, digest, Marketplace PR, and outstanding external
review status.

- [ ] **Step 3: Retire rollback worktrees/branches after publication**

Only after confirming `main` contains their commits.
