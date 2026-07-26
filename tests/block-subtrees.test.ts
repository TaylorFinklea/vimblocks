import assert from "node:assert/strict";
import test from "node:test";

import {
  canonicalizeSubtreeRoots,
  collectSubtreeUUIDs,
  firstSurvivingUUID,
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
