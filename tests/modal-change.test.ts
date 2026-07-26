import assert from "node:assert/strict";
import test from "node:test";

import {
  planOperatorMutation,
  replayChange,
  runNativeHistoryToward,
  snapshotDistance,
  type NativeHistorySnapshot,
} from "../src/runtime/modal-change.ts";
import type { ChangeDescriptor } from "../src/runtime/modal-command.ts";
import type { BlockNode } from "../src/runtime/block-subtrees.ts";

test("replays every change descriptor with multiplied counts", () => {
  const cases: Array<[ChangeDescriptor, unknown]> = [
    [
      { kind: "delete-char", count: 2 },
      { kind: "delete-char", count: 6 },
    ],
    [
      {
        kind: "operator",
        operator: "delete",
        motion: "w",
        count: 2,
      },
      {
        kind: "operator",
        operator: "delete",
        motion: "w",
        count: 6,
      },
    ],
    [
      { kind: "put", before: false, count: 2 },
      { kind: "put", before: false, count: 6 },
    ],
    [
      {
        kind: "insert",
        command: "a",
        relativeStart: 1,
        removedText: "",
        insertedText: "x",
        count: 2,
      },
      {
        kind: "replay-insert",
        command: "a",
        relativeStart: 1,
        removedText: "",
        insertedText: "x",
        count: 6,
      },
    ],
  ];

  for (const [change, expected] of cases) {
    assert.deepEqual(replayChange(change, 3), expected);
  }
});

test("plans local counted and text-object operators", () => {
  const nodes: BlockNode[] = [
    {
      uuid: "a",
      content: "alpha beta gamma delta",
      children: [],
    },
  ];
  const buffer = {
    blocks: nodes.map(({ uuid, content }) => ({ uuid, content })),
  };

  assert.deepEqual(
    planOperatorMutation(
      buffer,
      nodes,
      { blockUUID: "a", offset: 0 },
      "delete",
      "w",
      3,
      "logseq-first"
    ),
    {
      updates: [{ uuid: "a", content: "delta" }],
      removeRoots: [],
      register: {
        kind: "characterwise",
        text: "alpha beta gamma ",
      },
      cursor: { blockUUID: "a", offset: 0 },
    }
  );
  assert.equal(
    planOperatorMutation(
      buffer,
      nodes,
      { blockUUID: "a", offset: 7 },
      "delete",
      "iw",
      1,
      "logseq-first"
    ).register.kind,
    "characterwise"
  );
  assert.equal(
    planOperatorMutation(
      buffer,
      nodes,
      { blockUUID: "a", offset: 7 },
      "delete",
      "aw",
      1,
      "logseq-first"
    ).updates[0].content,
    "alpha gamma delta"
  );
});

test("Vim-first operators cross blocks while Logseq-first stops", () => {
  const nodes: BlockNode[] = [
    { uuid: "a", content: "alpha", children: [] },
    { uuid: "b", content: "beta gamma", children: [] },
  ];
  const buffer = {
    blocks: nodes.map(({ uuid, content }) => ({ uuid, content })),
  };
  const start = { blockUUID: "a", offset: 0 };

  assert.deepEqual(
    planOperatorMutation(
      buffer,
      nodes,
      start,
      "delete",
      "w",
      1,
      "logseq-first"
    ).updates,
    [{ uuid: "a", content: "alpha" }]
  );
  assert.deepEqual(
    planOperatorMutation(
      buffer,
      nodes,
      start,
      "delete",
      "w",
      1,
      "vim-first"
    ),
    {
      updates: [{ uuid: "a", content: "beta gamma" }],
      removeRoots: ["b"],
      register: { kind: "characterwise", text: "alpha\n" },
      cursor: { blockUUID: "a", offset: 0 },
    }
  );
});

test("linewise plans canonicalize ancestors and preserve hierarchy", () => {
  const nodes: BlockNode[] = [
    {
      uuid: "parent",
      content: "parent",
      children: [
        {
          uuid: "child",
          parentUUID: "parent",
          content: "child",
          children: [],
        },
      ],
    },
  ];
  const buffer = {
    blocks: [
      { uuid: "parent", content: "parent" },
      { uuid: "child", content: "child" },
    ],
  };

  assert.deepEqual(
    planOperatorMutation(
      buffer,
      nodes,
      { blockUUID: "parent", offset: 0 },
      "delete",
      "line",
      2,
      "logseq-first"
    ),
    {
      updates: [],
      removeRoots: ["parent"],
      register: {
        kind: "linewise",
        blocks: [
          {
            content: "parent",
            children: [{ content: "child", children: [] }],
          },
        ],
      },
      cursor: null,
    }
  );
});

test("measures deterministic subtree and cursor distance", () => {
  const before: NativeHistorySnapshot = {
    roots: [
      {
        content: "parent",
        children: [{ content: "child", children: [] }],
      },
    ],
    cursor: { blockUUID: "parent", offset: 0 },
  };
  const changed: NativeHistorySnapshot = {
    roots: [{ content: "parent changed", children: [] }],
    cursor: { blockUUID: "parent", offset: 4 },
  };

  assert.equal(snapshotDistance(before, before), 0);
  assert.ok(snapshotDistance(changed, before) > 0);
  assert.equal(
    snapshotDistance(changed, before),
    snapshotDistance(before, changed)
  );
});

test("distance decreases as deleted roots return in target order", () => {
  const root = (content: string) => ({ content, children: [] });
  const target: NativeHistorySnapshot = {
    roots: [root("gamma"), root("t"), root("alpha")],
    cursor: null,
  };
  const deleted: NativeHistorySnapshot = {
    roots: [root("alpha")],
    cursor: null,
  };
  const partiallyRestored: NativeHistorySnapshot = {
    roots: [root("gamma"), root("alpha")],
    cursor: null,
  };

  assert.ok(
    snapshotDistance(partiallyRestored, target) <
      snapshotDistance(deleted, target)
  );
});

test("distance decreases as nested inserted blocks are undone", () => {
  const before: NativeHistorySnapshot = {
    roots: [{ content: "anchor", children: [] }],
    cursor: null,
  };
  const fullyInserted: NativeHistorySnapshot = {
    roots: [
      { content: "anchor", children: [] },
      {
        content: "new",
        children: [{ content: "child", children: [] }],
      },
    ],
    cursor: null,
  };
  const childUndone: NativeHistorySnapshot = {
    roots: [
      { content: "anchor", children: [] },
      { content: "new", children: [] },
    ],
    cursor: null,
  };

  assert.ok(
    snapshotDistance(childUndone, before) <
      snapshotDistance(fullyInserted, before)
  );
});

test("compensates and aborts on the first non-progressing native step", async () => {
  const target: NativeHistorySnapshot = {
    roots: [{ content: "before", children: [] }],
    cursor: null,
  };
  const unchanged: NativeHistorySnapshot = {
    roots: [{ content: "after", children: [] }],
    cursor: null,
  };
  let steps = 0;
  let compensations = 0;

  const result = await runNativeHistoryToward({
    target,
    maxNativeSteps: 4,
    readSnapshot: async () => unchanged,
    step: async () => {
      steps += 1;
    },
    compensate: async () => {
      compensations += 1;
    },
  });

  assert.deepEqual(result, {
    matched: false,
    steps: 1,
    compensated: true,
  });
  assert.equal(steps, 1);
  assert.equal(compensations, 1);
});

test("stops as soon as the target native snapshot matches", async () => {
  const root = (content: string) => ({ content, children: [] });
  const target: NativeHistorySnapshot = {
    roots: [root("gamma"), root("t"), root("alpha")],
    cursor: null,
  };
  const snapshots: NativeHistorySnapshot[] = [
    {
      roots: [root("alpha")],
      cursor: null,
    },
    {
      roots: [root("gamma"), root("alpha")],
      cursor: null,
    },
    target,
  ];
  let index = 0;

  const result = await runNativeHistoryToward({
    target,
    maxNativeSteps: 4,
    readSnapshot: async () => snapshots[index],
    step: async () => {
      index += 1;
    },
    compensate: async () => {
      throw new Error("should not compensate");
    },
  });

  assert.deepEqual(result, {
    matched: true,
    steps: 2,
    compensated: false,
  });
});
