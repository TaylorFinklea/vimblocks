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
properties. Map p1-p4 to Urgent/High/Medium/Low and remove the inserted block if
any property write fails.
**Alternatives considered**: Generate Markdown task syntax; call an external
LLM; create before preview; write custom properties instead of Logseq's built-ins.
**Rationale**: Native properties make the result participate in Logseq DB task
views, a preview keeps shorthand interpretation visible, and the local parser
adds no network, credential, latency, or model-availability dependency.
