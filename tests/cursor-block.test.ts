import assert from "node:assert/strict";
import test from "node:test";

import { resolveCurrentBlockUUID } from "../src/runtime/cursor-block.ts";

test("uses Logseq's current editing block when available", () => {
  assert.equal(
    resolveCurrentBlockUUID("editing-block", true, "cursor-block"),
    "editing-block"
  );
});

test("falls back to the Vim cursor block in normal mode", () => {
  assert.equal(
    resolveCurrentBlockUUID(undefined, true, "cursor-block"),
    "cursor-block"
  );
});

test("does not use a stale cursor block outside cursor mode", () => {
  assert.equal(
    resolveCurrentBlockUUID(undefined, false, "cursor-block"),
    undefined
  );
});
