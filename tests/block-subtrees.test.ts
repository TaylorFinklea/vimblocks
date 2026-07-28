import assert from "node:assert/strict";
import test from "node:test";

import type { BlockEntity } from "@logseq/libs/dist/LSPlugin";

import {
  canonicalizeSubtreeRoots,
  collectSubtreeUUIDs,
  firstSurvivingUUID,
  resolveLinewiseTargets,
  serializeSubtrees,
  type BlockNode,
} from "../src/runtime/block-subtrees.ts";
import { planLinewisePut } from "../src/runtime/vim-register.ts";
import {
  insertLinewiseBatch,
  type LinewisePutEditor,
} from "../src/runtime/linewise-put.ts";

const nodes: BlockNode[] = [
  {
    uuid: "parent",
    content: "parent",
    children: [
      {
        uuid: "child",
        content: "child",
        parentUUID: "parent",
        children: [
          {
            uuid: "grandchild",
            content: "grandchild",
            parentUUID: "child",
            children: [],
          },
        ],
      },
    ],
  },
  {
    uuid: "sibling",
    content: "sibling",
    children: [],
  },
];

test("canonicalizes overlapping ancestor and descendant selections", () => {
  assert.deepEqual(
    canonicalizeSubtreeRoots(
      ["grandchild", "parent", "child", "sibling", "sibling"],
      nodes
    ),
    ["parent", "sibling"]
  );
});

test("serializes hidden descendants without flattening hierarchy", () => {
  assert.deepEqual(serializeSubtrees(["parent", "sibling"], nodes), [
    {
      content: "parent",
      children: [
        {
          content: "child",
          children: [
            { content: "grandchild", children: [] },
          ],
        },
      ],
    },
    { content: "sibling", children: [] },
  ]);
});

test("collects every removed descendant for cursor restoration", () => {
  assert.deepEqual(
    collectSubtreeUUIDs(["parent", "sibling"], nodes),
    ["parent", "child", "grandchild", "sibling"]
  );
});

test("skips stale deleted descendants when restoring a cursor", async () => {
  const checked: string[] = [];
  const surviving = await firstSurvivingUUID(
    ["deleted-child", "deleted-grandchild", "alpha"],
    async (uuid) => {
      checked.push(uuid);
      return uuid === "alpha";
    }
  );

  assert.equal(surviving, "alpha");
  assert.deepEqual(checked, [
    "deleted-child",
    "deleted-grandchild",
    "alpha",
  ]);
});

test("plans one nested sibling batch in original root order", () => {
  const blocks = serializeSubtrees(["parent", "sibling"], nodes);
  assert.deepEqual(
    planLinewisePut(
      { kind: "linewise", blocks },
      "anchor",
      false
    ),
    {
      batch: [
        {
          content: "parent",
          children: [
            {
              content: "child",
              children: [{ content: "grandchild" }],
            },
          ],
        },
        { content: "sibling" },
      ],
      sibling: true,
      before: false,
    }
  );
});

test("linewise targets start at the cursor and run forward by count", () => {
  assert.deepEqual(
    resolveLinewiseTargets(["a", "b", "c", "d"], "b", undefined, 2),
    ["b", "c"]
  );
});

test("linewise targets for k run backward and include the cursor", () => {
  assert.deepEqual(
    resolveLinewiseTargets(["a", "b", "c", "d"], "c", "k", 2),
    ["b", "c"]
  );
});

test("linewise targets clamp to the rendered stream edges", () => {
  assert.deepEqual(
    resolveLinewiseTargets(["a", "b"], "b", undefined, 5),
    ["b"]
  );
  assert.deepEqual(resolveLinewiseTargets(["a", "b"], "a", "k", 5), ["a"]);
});

test("linewise targets are empty when the cursor block is not rendered", () => {
  // Regression: the cursor survives page navigation, so a stale cursorBlockUUID
  // used to fall back to itself and delete an off-screen block on another page,
  // with an undo snapshot scoped to the visible blocks that could not restore it.
  assert.deepEqual(
    resolveLinewiseTargets(["a", "b", "c"], "off-screen", undefined, 1),
    []
  );
  assert.deepEqual(
    resolveLinewiseTargets(["a", "b", "c"], "off-screen", "k", 3),
    []
  );
});

test("linewise targets are empty without a cursor block", () => {
  assert.deepEqual(resolveLinewiseTargets(["a", "b"], "", undefined, 1), []);
});

test("linewise targets ignore duplicate rendered instances", () => {
  assert.deepEqual(
    resolveLinewiseTargets(["a", "b", "a", "c"], "b", undefined, 2),
    ["b", "c"]
  );
});

test("round-trips a yanked subtree through put without flattening", async () => {
  // The pieces are unit-tested separately; this proves they compose. The
  // per-node fallback rebuilds the hierarchy one insert at a time, which is
  // where a subtree can flatten, duplicate, or reparent.
  const blocks = serializeSubtrees(["parent", "sibling"], nodes);
  const plan = planLinewisePut({ kind: "linewise", blocks }, "anchor", true);

  let nextId = 0;
  const contentOf = new Map<string, string>();
  const parentOf = new Map<string, string>();
  const childrenOf = new Map<string, string[]>([["parent", []]]);
  const attach = (uuid: string, parent: string) => {
    parentOf.set(uuid, parent);
    if (!childrenOf.has(parent)) childrenOf.set(parent, []);
    childrenOf.get(parent)!.push(uuid);
  };

  const editor: LinewisePutEditor = {
    insertBatchBlock: async () => {
      throw {
        message: "Expected number or lookup ref for entity id, got nil",
      };
    },
    getBlock: async () => ({ uuid: "parent" }),
    getPage: async () => null,
    insertBlock: async (anchorUUID, content, options) => {
      const uuid = `new-${++nextId}`;
      contentOf.set(uuid, content);
      attach(
        uuid,
        options.sibling ? (parentOf.get(anchorUUID) ?? "parent") : anchorUUID
      );
      return { uuid, content, children: [] } as unknown as BlockEntity;
    },
    prependBlockInPage: async () => {
      throw new Error("unexpected page insertion");
    },
    removeBlock: async () => {
      throw new Error("unexpected removal");
    },
  };

  await insertLinewiseBatch(
    editor,
    { uuid: "first", parent: { id: 42 } },
    plan.batch,
    plan.before
  );

  const shapeOf = (uuid: string): unknown => ({
    content: contentOf.get(uuid),
    children: (childrenOf.get(uuid) ?? []).map(shapeOf),
  });

  assert.deepEqual(
    (childrenOf.get("parent") ?? []).map(shapeOf),
    [
      {
        content: "parent",
        children: [
          {
            content: "child",
            children: [{ content: "grandchild", children: [] }],
          },
        ],
      },
      { content: "sibling", children: [] },
    ]
  );
  // Every block created exactly once.
  assert.equal(contentOf.size, 4);
});
