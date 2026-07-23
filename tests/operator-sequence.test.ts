import assert from "node:assert/strict";
import test from "node:test";

import {
  advanceOperatorSequence,
  expandOperatorBinding,
  keyboardEventToken,
} from "../src/runtime/operator-sequence.ts";

const sequences = [
  { commandId: "delete-inner-word", tokens: ["d", "i", "w"] },
  { commandId: "delete-word", tokens: ["d", "w"] },
  { commandId: "yank-inner-word", tokens: ["y", "i", "w"] },
  { commandId: "change-inner-word", tokens: ["c", "i", "w"] },
  { commandId: "delete-line-end", tokens: ["shift+d"] },
  { commandId: "paste-next", tokens: ["p"] },
];

test("matches delete and yank sequences without consuming their first prefix", () => {
  const deletePrefix = advanceOperatorSequence(sequences, [], "d");
  assert.deepEqual(deletePrefix, {
    status: "pending",
    pendingTokens: ["d"],
    consume: false,
  });

  const deleteObject = advanceOperatorSequence(
    sequences,
    deletePrefix.pendingTokens,
    "i"
  );
  assert.deepEqual(deleteObject, {
    status: "pending",
    pendingTokens: ["d", "i"],
    consume: true,
  });

  assert.deepEqual(
    advanceOperatorSequence(
      sequences,
      deleteObject.pendingTokens,
      "w"
    ),
    {
      status: "matched",
      pendingTokens: [],
      consume: true,
      commandId: "delete-inner-word",
    }
  );

  const yankPrefix = advanceOperatorSequence(sequences, [], "y");
  assert.equal(yankPrefix.status, "pending");
  assert.equal(yankPrefix.consume, false);
});

test("leaves existing operator chords alone when they are not plugin-owned", () => {
  const prefix = advanceOperatorSequence(sequences, [], "d");
  assert.deepEqual(
    advanceOperatorSequence(sequences, prefix.pendingTokens, "d"),
    {
      status: "none",
      pendingTokens: [],
      consume: false,
    }
  );
});

test("matches direct aliases and expands configured word-object prefixes", () => {
  assert.deepEqual(advanceOperatorSequence(sequences, [], "shift+d"), {
    status: "matched",
    pendingTokens: [],
    consume: true,
    commandId: "delete-line-end",
  });
  assert.deepEqual(expandOperatorBinding("d i", true), ["d", "i", "w"]);
  assert.deepEqual(expandOperatorBinding("d w", false), ["d", "w"]);
  assert.deepEqual(advanceOperatorSequence(sequences, [], "p"), {
    status: "matched",
    pendingTokens: [],
    consume: true,
    commandId: "paste-next",
  });
});

test("normalizes keyboard events to Logseq binding tokens", () => {
  assert.equal(
    keyboardEventToken({
      key: "D",
      ctrlKey: false,
      altKey: false,
      metaKey: false,
      shiftKey: true,
    }),
    "shift+d"
  );
  assert.equal(
    keyboardEventToken({
      key: "$",
      ctrlKey: false,
      altKey: false,
      metaKey: false,
      shiftKey: true,
    }),
    "shift+4"
  );
});
