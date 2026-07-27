import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";

const loadApi = () => {
  const window: Record<string, unknown> = {};
  runInNewContext(
    readFileSync(new URL("../public/key-token.js", import.meta.url), "utf8"),
    { window }
  );
  return window.__vimblocksKeyToken as {
    eventToken(event: Record<string, unknown>): string;
    shouldCapture(input: Record<string, unknown>): boolean;
    entersTextEntry(token: string): boolean;
    startsCaptureAll(token: string): boolean;
  };
};
const event = (
  code: string,
  key: string,
  modifiers: Record<string, boolean> = {}
) => ({
  code,
  key,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
  ...modifiers,
});

test("normalizes shifted and Option-modified keys from event.code", () => {
  const api = loadApi();
  assert.equal(api.eventToken(event("KeyG", "G", { shiftKey: true })), "shift+g");
  assert.equal(api.eventToken(event("Digit4", "$", { shiftKey: true })), "shift+4");
  assert.equal(
    api.eventToken(event("Semicolon", "…", { metaKey: true, altKey: true })),
    "mod+alt+;"
  );
  assert.equal(api.eventToken(event("KeyJ", "∆", { altKey: true })), "alt+j");
  assert.equal(api.eventToken(event("KeyR", "r", { ctrlKey: true })), "ctrl+r");
});

test("captures only configured modal contexts", () => {
  const api = loadApi();
  const base = {
    token: "w",
    textEntryActive: false,
    captureAll: false,
    normalModeActive: false,
    captureTokens: ["d"],
    normalModeTokens: ["w"],
  };
  assert.equal(api.shouldCapture(base), false);
  assert.equal(api.shouldCapture({ ...base, normalModeActive: true }), true);
  assert.equal(api.shouldCapture({ ...base, captureAll: true }), true);
  assert.equal(
    api.shouldCapture({ ...base, normalModeActive: true, textEntryActive: true }),
    false
  );
});

test("identifies commands that synchronously enter Logseq text editing", () => {
  const api = loadApi();
  for (const token of ["i", "a", "shift+i", "shift+a", "o", "shift+o"]) {
    assert.equal(api.entersTextEntry(token), true);
  }
  assert.equal(api.entersTextEntry("d"), false);
});

test("identifies character-find prefixes that synchronously capture the target", () => {
  const api = loadApi();
  for (const token of ["f", "shift+f", "t", "shift+t"]) {
    assert.equal(api.startsCaptureAll(token), true);
  }
  assert.equal(api.startsCaptureAll("a"), false);
});
