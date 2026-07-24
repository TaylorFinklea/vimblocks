import assert from "node:assert/strict";
import test from "node:test";

import { persistNormalModeContent } from "../src/runtime/normal-mode-mutation.ts";

test("reconciles Logseq's rendered block before restoring the Vim cursor", async () => {
  const calls: unknown[][] = [];
  const editor = {
    updateBlock: async (blockUUID: string, content: string) => {
      calls.push(["update", blockUUID, content]);
    },
    editBlock: async (blockUUID: string, options: { pos: number }) => {
      calls.push(["edit", blockUUID, options]);
    },
    exitEditingMode: async (selectBlock: boolean) => {
      calls.push(["exit", selectBlock]);
    },
  };

  await persistNormalModeContent({
    editor,
    blockUUID: "block-1",
    content: "lpha beta",
    cursor: 0,
    restoreCursor: async (blockUUID, content, cursor) => {
      calls.push(["restore", blockUUID, content, cursor]);
    },
  });

  assert.deepEqual(calls, [
    ["update", "block-1", "lpha beta"],
    ["edit", "block-1", { pos: 0 }],
    ["exit", true],
    ["restore", "block-1", "lpha beta", 0],
  ]);
});
