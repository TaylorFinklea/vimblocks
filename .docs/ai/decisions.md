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
