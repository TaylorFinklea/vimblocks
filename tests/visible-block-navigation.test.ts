import assert from "node:assert/strict";
import test from "node:test";

import { resolveAdjacentVisibleBlockUUID } from "../src/runtime/visible-block-navigation.ts";

test("moves across adjacent page boundaries in rendered order", () => {
  const visible = ["july-24-last", "july-23-first", "july-23-second"];

  assert.equal(
    resolveAdjacentVisibleBlockUUID(visible, "july-23-first", "up"),
    "july-24-last"
  );
  assert.equal(
    resolveAdjacentVisibleBlockUUID(visible, "july-24-last", "down"),
    "july-23-first"
  );
});

test("deduplicates repeated rendered instances before resolving adjacency", () => {
  const visible = ["first", "first", "second"];

  assert.equal(
    resolveAdjacentVisibleBlockUUID(visible, "first", "down"),
    "second"
  );
});

test("moves by a requested number of rendered blocks", () => {
  const visible = ["first", "second", "third", "fourth", "fifth"];

  assert.equal(
    resolveAdjacentVisibleBlockUUID(visible, "second", "down", 2),
    "fourth"
  );
  assert.equal(
    resolveAdjacentVisibleBlockUUID(visible, "fourth", "up", 2),
    "second"
  );
});

test("stops at rendered stream edges", () => {
  assert.equal(
    resolveAdjacentVisibleBlockUUID(["first", "second"], "first", "up"),
    undefined
  );
  assert.equal(
    resolveAdjacentVisibleBlockUUID(["first", "second"], "second", "down"),
    undefined
  );
});
