import assert from "node:assert/strict";
import test from "node:test";

import {
  findDuplicateKeyBindings,
  normalizeKeyBinding,
  validateKeyBinding,
} from "../src/runtime/keybindings.ts";

test("normalizes binding case and whitespace", () => {
  assert.equal(normalizeKeyBinding("  Mod+Shift+P   G  J "), "mod+shift+p g j");
});

test("rejects malformed bindings while accepting chord sequences", () => {
  assert.deepEqual(validateKeyBinding("g j"), { valid: true });
  assert.deepEqual(validateKeyBinding("mod++p"), {
    valid: false,
    error: "Invalid key binding format: empty key not allowed",
  });
});

test("detects resolved conflicts across scalar and list bindings", () => {
  assert.deepEqual(
    findDuplicateKeyBindings({
      up: ["k", "ctrl+p"],
      down: "j",
      alternateUp: " CTRL+P ",
    }),
    [{ key1: "up", key2: "alternateUp", binding: "ctrl+p" }]
  );
});
