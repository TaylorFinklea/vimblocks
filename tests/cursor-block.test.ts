import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveCurrentBlockUUID,
  resolveNormalModeBlockUUID,
} from "../src/runtime/cursor-block.ts";

test("prefers the Vim-owned block while normal mode is active", () => {
  assert.equal(
    resolveCurrentBlockUUID("editing-block", true, "cursor-block"),
    "cursor-block"
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

test("enters normal mode from the block captured before Logseq exits editing", () => {
  assert.equal(
    resolveNormalModeBlockUUID(
      "captured-block",
      false,
      undefined,
      undefined
    ),
    "captured-block"
  );
});

test("keeps the owned block on a second Escape without Logseq selection", () => {
  assert.equal(
    resolveNormalModeBlockUUID(
      undefined,
      true,
      "cursor-block",
      undefined
    ),
    "cursor-block"
  );
});
