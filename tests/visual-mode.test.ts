import assert from "node:assert/strict";
import test from "node:test";

import { createModalState, stepModalKey } from "../src/runtime/modal-command.ts";
import {
  resolveVisualRange,
  toRenderedOffset,
} from "../src/runtime/rendered-buffer.ts";
import type { BlockNode } from "../src/runtime/block-subtrees.ts";

const buffer = {
  blocks: [
    { uuid: "a", content: "alpha **beta** `gamma` [[delta]]" },
    { uuid: "b", content: "second" },
    { uuid: "c", content: "third" },
  ],
};
const nodes: BlockNode[] = [{
  uuid: "a",
  content: buffer.blocks[0].content,
  children: [{
    uuid: "b",
    content: "second",
    parentUUID: "a",
    children: [{ uuid: "hidden", content: "hidden", parentUUID: "b", children: [] }],
  }],
}, {
  uuid: "c",
  content: "third",
  children: [],
}];

test("visual reducer preserves mode for counted motion and exits through operators", () => {
  let state = stepModalKey(createModalState("vim-first"), "v").state;
  state = stepModalKey(state, "2").state;
  const motion = stepModalKey(state, "l");
  assert.equal(motion.state.mode, "visual-char");
  assert.deepEqual(motion.command, { kind: "motion", motion: "l", count: 2 });
  assert.deepEqual(stepModalKey(motion.state, "d").command, {
    kind: "visual-operator",
    operator: "delete",
  });
  assert.equal(stepModalKey(motion.state, "escape").state.mode, "normal");
});

test("characterwise ranges reverse and clamp only in Logseq-first", () => {
  const vim = resolveVisualRange(
    buffer,
    nodes,
    { blockUUID: "b", offset: 3 },
    { blockUUID: "a", offset: 6 },
    "characterwise",
    "vim-first"
  );
  assert.deepEqual(vim.start, { blockUUID: "a", offset: 8 });
  assert.deepEqual(vim.end, { blockUUID: "b", offset: 3 });

  const logseq = resolveVisualRange(
    buffer,
    nodes,
    { blockUUID: "a", offset: 0 },
    { blockUUID: "b", offset: 2 },
    "characterwise",
    "logseq-first"
  );
  assert.deepEqual(logseq.start, { blockUUID: "a", offset: 0 });
  assert.deepEqual(logseq.end, { blockUUID: "a", offset: 0 });
});

test("linewise selection canonicalizes ancestors while retaining hidden descendants", () => {
  const range = resolveVisualRange(
    buffer,
    nodes,
    { blockUUID: "a", offset: 0 },
    { blockUUID: "c", offset: 0 },
    "linewise",
    "logseq-first"
  );
  assert.deepEqual(range.rootUUIDs, ["a", "c"]);
  assert.equal(nodes[0].children[0].children[0].uuid, "hidden");
});

test("rendered selection lengths ignore emphasis, code, and page-reference delimiters", () => {
  const content = buffer.blocks[0].content;
  const start = toRenderedOffset(content, 6);
  const end = toRenderedOffset(content, content.length - 3);
  assert.equal(start, 6);
  assert.equal(end - start + 1, "beta gamma delta".length);
});
