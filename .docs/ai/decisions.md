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
