import assert from "node:assert/strict";
import test from "node:test";

import {
  isContentEditableTarget,
  isTextEntryTarget,
  shouldBlockTextEntryAction,
} from "../src/runtime/context-guard.ts";

test("guards native text fields, contenteditable editors, and ARIA inputs", () => {
  assert.equal(isTextEntryTarget({ tagName: "input" }), true);
  assert.equal(isTextEntryTarget({ tagName: "TEXTAREA" }), true);
  assert.equal(isTextEntryTarget({ tagName: "select" }), true);
  assert.equal(isTextEntryTarget({ isContentEditable: true }), true);
  assert.equal(
    isTextEntryTarget({ getAttribute: (name) => name === "role" ? "searchbox" : null }),
    true
  );
  assert.equal(
    isTextEntryTarget({ getAttribute: (name) => name === "role" ? "dialog" : null }),
    false
  );
  assert.equal(isTextEntryTarget({ tagName: "DIV" }), false);
});

test("contenteditable is distinguished from other text-entry contexts", () => {
  assert.equal(isContentEditableTarget({ isContentEditable: true }), true);
  assert.equal(isContentEditableTarget({ tagName: "INPUT" }), false);
});

test("modal actions are blocked in text entry by default", () => {
  assert.equal(shouldBlockTextEntryAction({ tagName: "INPUT" }), true);
  assert.equal(
    shouldBlockTextEntryAction({ getAttribute: () => "searchbox" }),
    true
  );
  assert.equal(shouldBlockTextEntryAction({ tagName: "DIV" }), false);
});

test("exit-editing may run in contenteditable but not in other inputs", () => {
  const options = { allowContentEditable: true };

  assert.equal(
    shouldBlockTextEntryAction({ isContentEditable: true }, options),
    false
  );
  assert.equal(
    shouldBlockTextEntryAction({ tagName: "INPUT" }, options),
    true
  );
});
