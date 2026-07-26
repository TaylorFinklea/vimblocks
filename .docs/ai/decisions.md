# Decisions

## 2026-07-23 Consolidate the companion into Vimblocks

**Context**: The separate companion required users to build, load, update, and verify two unpacked plugins for one product.
**Decision**: Register the companion's PDF command inside Vimblocks, retain `logseq-plugin-vim-shortcuts` as the sole plugin ID, and publish one loadable package.
**Alternatives considered**: Keep two unpacked plugins; submit two Marketplace entries.
**Rationale**: One package provides the simplest installation and update path while preserving existing Vimblocks settings and identity.

## 2026-07-24 Run modal input through a host bridge

**Context**: Logseq 2.0.1 isolates plugin frames from the host document, so direct `window.top` keyboard and cursor access fails with cross-origin `SecurityError`s.
**Decision**: Mark Vimblocks as an effect plugin, inject a host-owned bridge with `logseq.Experiments.loadScripts`, and exchange validated key/cursor messages through `postMessage`. Use a ready handshake so configured bindings are resent after the host listener exists.
**Alternatives considered**: Keep direct host DOM access; register every Vim sequence as a Logseq shortcut; capture every non-editor key in the host.
**Rationale**: The bridge restores immediate modal input and cursor painting without bypassing frame isolation, while limiting key capture to Vimblocks-owned bindings and preserving normal text-entry behavior.

## 2026-07-25 Make normal mode own block identity and rendered order

**Context**: Logseq clears or delays its current-block selection after Esc, and
its journal stream renders blocks from several page trees. Fixed delays and
`getCurrentPageBlocksTree()` left cursor activation racy, second Esc orphaned
the cursor, and j/k stopped at day boundaries.
**Decision**: Capture the block UUID from Logseq's block editor before Esc,
forward the transition only after the host observes the non-editing block DOM,
and make second Esc idempotently retain Vimblocks' cursor and Logseq selection.
While cursor mode is active, capture h/j/k/l through the host and navigate from
the owned cursor UUID. Derive vertical adjacency from visible host block order,
excluding journal headings, and enforce one global Vim highlight.
**Alternatives considered**: Increase the fixed delay; continue requiring
`Editor.getCurrentBlock()` for every motion; stitch adjacent journal page trees
through date arithmetic.
**Rationale**: Verified state transitions remove timing dependence, owned
identity survives Logseq selection churn, and rendered order matches what the
user can actually see without assuming journal dates or page boundaries.

## 2026-07-25 Base page motion and cursor styling on validated host state

**Context**: Logseq does not expose its multi-page journal viewport through the
plugin API, repeated one-block jumps can leave intermediate cursor marks during
host re-renders, and a free-form CSS color setting would permit malformed style
injection.
**Decision**: Have the host bridge report rendered blocks intersecting the
viewport, define Ctrl-U/Ctrl-D as half that unique-block count, and select only
the final rendered-order target. Accept hexadecimal cursor colors only and fall
back to the existing `#ffff00`.
**Alternatives considered**: Use a fixed block count; scroll pixels without
moving the Vim cursor; issue repeated j/k actions; accept arbitrary CSS colors.
**Rationale**: Viewport-derived distance follows the visible journal stream,
one final selection preserves a single cursor mark, and hex validation keeps
the setting predictable and safe to inject.

## 2026-07-25 Capture tasks through Logseq DB properties

**Context**: Logseq DB represents tasks through its Task class and built-in
Status, Priority, and Scheduled properties; Markdown `TODO`, `SCHEDULED`, and
`property::` syntax targets the retired file graph model.
**Decision**: Keep the experiment local and deterministic: parse a compact
natural-language shorthand, preview its interpretation, insert a plain sibling
block after the selected or Vim-owned block, then set Logseq's built-in DB
properties. Treat bare dates as Scheduled and `due` dates as the distinct
Deadline property. Map p1-p4 to Urgent/High/Medium/Low and remove the inserted
block if any property write fails.
**Alternatives considered**: Generate Markdown task syntax; call an external
LLM; create before preview; write custom properties instead of Logseq's built-ins.
**Rationale**: Native properties make the result participate in Logseq DB task
views, a preview keeps shorthand interpretation visible, and the local parser
adds no network, credential, latency, or model-availability dependency.

## 2026-07-25 Centralize daily Vim behavior behind boundary profiles

**Context**: Vimblocks contains many individual Vim command handlers, but the
repaired owned-cursor behavior, counts, operator composition, repeat, and visual
state need one deterministic model. Taylor also needs to experience strict
Vim-stream and block-safe Logseq behavior before choosing a preferred default.
**Decision**: Build one shared modal state/action layer and expose persistent
Vim-first and Logseq-first boundary profiles. Include the full daily Vim set,
characterwise `v`, linewise `V`, subtree-preserving linewise mutations,
rendered-view search, and sibling-block `o/O`. Retain both profiles after the
comparison and remember the last-used choice.
**Alternatives considered**: Patch every handler independently; replace the
command system immediately; choose one boundary model without live comparison;
remove the losing profile after the test.
**Rationale**: Shared grammar prevents command-specific state drift, policy
adapters make the trade-off directly testable, subtree preservation respects
Logseq's data model, and retaining both profiles provides instant rollback.
Escalate to a replacement engine only when the objective triggers in
`.docs/ai/phases/vim-daily-parity-spec.md` prove the shared-layer approach is
not viable.

## 2026-07-25 Make host capture static and group native history by snapshots

**Context**: Logseq host events must be suppressed synchronously before the
plugin-frame modal reducer receives them. The host and plugin previously
normalized shifted/meta keys differently, raw block offsets differ from
rendered DOM offsets, and Logseq exposes no multi-block transaction API.
**Decision**: Load one canonical key-token implementation into both host and
plugin frames. The host statically consumes configured modal grammar tokens
while normal/visual mode is active; the asynchronous reducer does not expose a
retroactive consume result. Keep modal points in raw block offsets and convert
once at the paint boundary. For plugin-owned multi-block mutations, record
before/after snapshots plus a maximum native-history step count; Vim `u` and
Ctrl-R invoke Logseq history until the expected snapshot matches. Option/Alt
tokens derive their unmodified base from `event.code`; Escape claims host normal
mode synchronously. Remove each legacy Logseq palette keybinding only in the
phase that replaces its keyboard path; intermediate commits must retain
exactly one working route, and that same commit must add every configured token
to host capture. Keep digits in ungated non-editing capture for legacy counted
commands, and route any existing chord whose prefix becomes captured (notably
`g u`/`g U`) through the shared dispatcher. Native history is permitted only
after live update/subtree probes and aborts with a compensating inverse action
on the first non-progressing step. Linewise put is one nested sibling batch.
Retire the old Markdown-graph `property::` position special case instead of
carrying it into the DB-only engine.
**Alternatives considered**: Maintain two tokenizers with parity by convention;
let the reducer decide browser suppression asynchronously; accept one undo per
mutated root; replace Logseq history with a fully private undo stack; store DOM
offsets in modal state.
**Rationale**: One token source removes shifted/meta dispatch holes, static
capture reflects the browser timing boundary honestly, raw offsets preserve
content semantics across markup, and snapshot-bounded native history keeps one
Vim undo per command without pretending Logseq offers transactions. The live
probe plus progress guard keeps that bounded loop from wandering into unrelated
user history; batch put and removal of the obsolete file-graph branch keep
Logseq DB hierarchy and rendered offsets explicit.
