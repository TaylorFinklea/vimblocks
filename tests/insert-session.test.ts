import assert from "node:assert/strict";
import test from "node:test";

import {
  applyInsertDelta,
  beginInsertSession,
  finishInsertSession,
  insertExitPosition,
  openSiblingOptions,
} from "../src/runtime/insert-session.ts";

test("places i, a, I, and A at their Vim edit positions", () => {
  const cases = [
    ["i", 3],
    ["a", 4],
    ["I", 2],
    ["A", 7],
  ] as const;

  for (const [command, editPosition] of cases) {
    assert.deepEqual(
      beginInsertSession(command, "block-1", "  alpha", 3, 2),
      {
        command,
        blockUUID: "block-1",
        beforeContent: "  alpha",
        editPosition,
        count: 2,
      }
    );
  }
});

test("keeps every insert command inside an empty block", () => {
  for (const command of ["i", "a", "I", "A", "o", "O"] as const) {
    assert.equal(
      beginInsertSession(command, "empty", "", 9, 1).editPosition,
      0
    );
  }
});

test("opens o and O as same-indentation siblings below and above", () => {
  assert.deepEqual(openSiblingOptions("o"), {
    before: false,
    sibling: true,
  });
  assert.deepEqual(openSiblingOptions("O"), {
    before: true,
    sibling: true,
  });
});

test("records no change when an insert session leaves content unchanged", () => {
  const session = beginInsertSession("i", "block-1", "alpha", 2, 1);

  assert.equal(finishInsertSession(session, "alpha"), null);
});

test("records the minimal inserted span relative to the edit position", () => {
  const session = beginInsertSession("a", "block-1", "alpha beta", 4, 3);

  assert.deepEqual(finishInsertSession(session, "alpha new beta"), {
    kind: "insert",
    command: "a",
    relativeStart: 1,
    removedText: "",
    insertedText: "new ",
    count: 3,
  });
});

test("records the minimal replacement without reconstructing caret history", () => {
  const session = beginInsertSession("i", "block-1", "alpha beta", 6, 1);

  assert.deepEqual(finishInsertSession(session, "alpha BETA"), {
    kind: "insert",
    command: "i",
    relativeStart: 0,
    removedText: "beta",
    insertedText: "BETA",
    count: 1,
  });
});

test("returns normal mode on the last inserted character", () => {
  const session = beginInsertSession("A", "block-1", "alpha", 0, 1);
  const change = finishInsertSession(session, "alpha beta");

  assert.equal(insertExitPosition(session, change), 9);
});

test("replays a recorded delta at the equivalent target position", () => {
  assert.deepEqual(
    applyInsertDelta("one two", 4, {
      relativeStart: 0,
      removedText: "two",
      insertedText: "THREE",
    }),
    {
      content: "one THREE",
      cursor: 8,
    }
  );
});

test("clamps replay deltas to the target block", () => {
  assert.deepEqual(
    applyInsertDelta("ab", 0, {
      relativeStart: -9,
      removedText: "",
      insertedText: "x",
    }),
    {
      content: "xab",
      cursor: 0,
    }
  );
});
