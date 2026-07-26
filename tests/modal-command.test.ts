import assert from "node:assert/strict";
import test from "node:test";

import {
  NORMAL_MODE_CAPTURE_TOKENS,
  createModalState,
  normalizeBoundaryProfile,
  stepModalKey,
} from "../src/runtime/modal-command.ts";

const trace = (tokens: string[]) => {
  let state = createModalState("logseq-first");
  let command;
  for (const token of tokens) {
    const result = stepModalKey(state, token);
    state = result.state;
    if (result.command) command = result.command;
  }
  return { state, command };
};

test("reduces counts, operators, zero, and mode transitions", () => {
  assert.deepEqual(trace(["2", "d", "3", "w"]).command, {
    kind: "operator",
    operator: "delete",
    motion: "w",
    count: 6,
  });
  assert.deepEqual(trace(["d", "0"]).command, {
    kind: "operator",
    operator: "delete",
    motion: "0",
    count: 1,
  });
  assert.deepEqual(trace(["d", "j"]).command, {
    kind: "operator",
    operator: "delete",
    motion: "j",
    count: 2,
  });
  assert.deepEqual(trace(["2", "d", "k"]).command, {
    kind: "operator",
    operator: "delete",
    motion: "k",
    count: 3,
  });
  assert.deepEqual(trace(["d", "c"]).command, {
    kind: "operator",
    operator: "change",
    motion: "line",
    count: 1,
  });
  assert.equal(trace(["1", "0", "l"]).command?.count, 10);
  assert.deepEqual(trace(["g", "g"]).command, {
    kind: "motion",
    motion: "gg",
    count: 1,
  });
  assert.deepEqual(trace(["shift+g"]).command, {
    kind: "motion",
    motion: "G",
    count: 1,
  });
  assert.deepEqual(trace(["g", "shift+u"]).command, {
    kind: "change-case",
    case: "upper",
    count: 1,
  });
  assert.equal(trace(["v"]).state.mode, "visual-char");
  assert.equal(trace(["shift+v"]).state.mode, "visual-line");
  assert.deepEqual(trace(["escape", "escape"]).state, trace(["escape"]).state);
  assert.equal(normalizeBoundaryProfile("bad"), "logseq-first");
});

test("emits total commands for delete, put, repeat, and character find", () => {
  assert.deepEqual(trace(["x"]).command, { kind: "delete-char", count: 1 });
  assert.deepEqual(trace(["p"]).command, { kind: "put", before: false, count: 1 });
  assert.deepEqual(trace(["shift+p"]).command, { kind: "put", before: true, count: 1 });
  assert.deepEqual(trace(["."]).command, { kind: "repeat-change", count: 1 });
  assert.deepEqual(trace(["f", "q"]).command, {
    kind: "char-find",
    motion: "f",
    character: "q",
    count: 1,
  });
  assert.deepEqual(trace([";"]).command, {
    kind: "char-find",
    motion: ";",
    character: null,
    count: 1,
  });
});

test("host capture includes every reducer-owned normal-mode token", () => {
  for (const token of [
    ".", "d", "x", "p", "i", "o", "/", "f", "u", "ctrl+r",
  ]) {
    assert.equal(NORMAL_MODE_CAPTURE_TOKENS.includes(token), true, token);
  }
});
