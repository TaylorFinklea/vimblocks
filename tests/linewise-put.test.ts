import assert from "node:assert/strict";
import test from "node:test";

import type { BlockEntity } from "@logseq/libs/dist/LSPlugin";

import {
  insertLinewiseBatch,
  type LinewisePutEditor,
} from "../src/runtime/linewise-put.ts";

const inserted = [
  {
    uuid: "new",
    content: "new",
    children: [],
  },
] as unknown as BlockEntity[];

test("puts linewise values directly beside a valid anchor", async () => {
  const calls: unknown[][] = [];
  const editor: LinewisePutEditor = {
    insertBatchBlock: async (...args) => {
      calls.push(args);
      return inserted;
    },
    getBlock: async () => null,
    getPage: async () => null,
    insertBlock: async () => null,
    prependBlockInPage: async () => null,
  };

  const result = await insertLinewiseBatch(
    editor,
    { uuid: "anchor", parent: { id: 42 } },
    [{ content: "new" }],
    false
  );

  assert.deepEqual(result, {
    blocks: inserted,
    nativeSteps: 1,
  });
  assert.deepEqual(calls, [
    [
      "anchor",
      [{ content: "new" }],
      { before: false, sibling: true },
    ],
  ]);
});

test("retries a before-first put as the parent's first child", async () => {
  const calls: unknown[][] = [];
  const editor: LinewisePutEditor = {
    insertBatchBlock: async (...args) => {
      calls.push(args);
      if (calls.length === 1) {
        throw {
          message:
            "Expected number or lookup ref for entity id, got nil",
        };
      }
      return inserted;
    },
    getBlock: async () => null,
    getPage: async (identity) =>
      identity === 42 ? { uuid: "page" } : null,
    insertBlock: async () => null,
    prependBlockInPage: async (
      pageUUID,
      content
    ) => {
      calls.push(["prepend", pageUUID, content]);
      return inserted[0];
    },
  };

  const result = await insertLinewiseBatch(
    editor,
    { uuid: "first", parent: { id: 42 } },
    [{ content: "new" }],
    true
  );

  assert.deepEqual(result, {
    blocks: inserted,
    nativeSteps: 1,
  });
  assert.deepEqual(calls, [
    [
      "first",
      [{ content: "new" }],
      { before: true, sibling: true },
    ],
    ["prepend", "page", "new"],
  ]);
});

test("fallback preserves multiple roots and nested children", async () => {
  const calls: unknown[][] = [];
  let nextId = 0;
  const makeBlock = (content: string): BlockEntity =>
    ({
      uuid: `new-${++nextId}`,
      content,
      children: [],
    }) as unknown as BlockEntity;
  const editor: LinewisePutEditor = {
    insertBatchBlock: async () => {
      throw {
        message:
          "Expected number or lookup ref for entity id, got nil",
      };
    },
    getBlock: async () => ({ uuid: "parent" }),
    getPage: async () => null,
    insertBlock: async (anchor, content, options) => {
      calls.push(["insert", anchor, content, options]);
      return makeBlock(content);
    },
    prependBlockInPage: async () => {
      throw new Error("unexpected page insertion");
    },
  };

  const result = await insertLinewiseBatch(
    editor,
    { uuid: "first", parent: { id: 42 } },
    [
      {
        content: "root one",
        children: [
          {
            content: "child",
            children: [
              { content: "grandchild", children: [] },
            ],
          },
        ],
      },
      { content: "root two", children: [] },
    ],
    true
  );

  assert.equal(result.nativeSteps, 4);
  type TestBlock = {
    content: string;
    children: TestBlock[];
  };
  const resultBlocks = result.blocks as unknown as TestBlock[];
  assert.deepEqual(
    resultBlocks.map((block) => ({
      content: block.content,
      children: block.children.map((child) => ({
        content: child.content,
        children: child.children.map(
          (grandchild) => grandchild.content
        ),
      })),
    })),
    [
      {
        content: "root one",
        children: [
          {
            content: "child",
            children: ["grandchild"],
          },
        ],
      },
      { content: "root two", children: [] },
    ]
  );
  assert.deepEqual(calls, [
    [
      "insert",
      "parent",
      "root one",
      {
        sibling: false,
        start: true,
        properties: undefined,
      },
    ],
    [
      "insert",
      "new-1",
      "child",
      {
        sibling: false,
        start: true,
        properties: undefined,
      },
    ],
    [
      "insert",
      "new-2",
      "grandchild",
      {
        sibling: false,
        start: true,
        properties: undefined,
      },
    ],
    [
      "insert",
      "new-1",
      "root two",
      {
        before: false,
        sibling: true,
        properties: undefined,
      },
    ],
  ]);
});

test("does not retry unrelated insertion failures", async () => {
  const failure = new Error("database unavailable");
  const editor: LinewisePutEditor = {
    insertBatchBlock: async () => {
      throw failure;
    },
    getBlock: async () => {
      throw new Error("unexpected parent lookup");
    },
    getPage: async () => {
      throw new Error("unexpected page lookup");
    },
    insertBlock: async () => {
      throw new Error("unexpected block insertion");
    },
    prependBlockInPage: async () => {
      throw new Error("unexpected page insertion");
    },
  };

  await assert.rejects(
    insertLinewiseBatch(
      editor,
      { uuid: "anchor", parent: { id: 42 } },
      [{ content: "new" }],
      true
    ),
    failure
  );
});
