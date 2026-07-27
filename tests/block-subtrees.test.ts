import assert from "node:assert/strict";
import test from "node:test";

import {
  canonicalizeSubtreeRoots,
  collectSubtreeUUIDs,
  firstSurvivingUUID,
  resolveLinewiseTargets,
  serializeSubtrees,
  type BlockNode,
} from "../src/runtime/block-subtrees.ts";
import { planLinewisePut } from "../src/runtime/vim-register.ts";

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
