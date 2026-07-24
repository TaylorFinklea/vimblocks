# Decisions

## 2026-07-23 Consolidate the companion into Vimblocks

**Context**: The separate companion required users to build, load, update, and verify two unpacked plugins for one product.
**Decision**: Register the companion's PDF command inside Vimblocks, retain `logseq-plugin-vim-shortcuts` as the sole plugin ID, and publish one loadable package.
**Alternatives considered**: Keep two unpacked plugins; submit two Marketplace entries.
**Rationale**: One package provides the simplest installation and update path while preserving existing Vimblocks settings and identity.
