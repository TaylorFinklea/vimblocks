import assert from "node:assert/strict";
import test from "node:test";

import {
  describeUnnamedRegister,
  planLinewisePut,
  planRegisterPut,
  VimRegisterStore,
} from "../src/runtime/vim-register.ts";

test("the unnamed register records discriminated values defensively", () => {
  const store = new VimRegisterStore();
  store.write({ text: "alpha", kind: "characterwise" });
  assert.deepEqual(store.read(), {
    text: "alpha",
    kind: "characterwise",
  });

  const blocks = [
    {
      content: "whole block",
      children: [{ content: "child", children: [] }],
    },
  ];
  store.write({ blocks, kind: "linewise" });
  blocks[0].content = "mutated outside";
  assert.deepEqual(store.read(), {
    kind: "linewise",
    blocks: [
      {
        content: "whole block",
        children: [{ content: "child", children: [] }],
      },
    ],
  });
});

test("p and P put characterwise text after or before the cursor", () => {
  const register = { text: "XY", kind: "characterwise" as const };
  assert.deepEqual(planRegisterPut("abcd", 1, register, false), {
    kind: "characterwise",
    content: "abXYcd",
    cursor: 3,
  });
  assert.deepEqual(planRegisterPut("abcd", 1, register, true), {
    kind: "characterwise",
    content: "aXYbcd",
    cursor: 2,
  });
});

test("linewise puts preserve nested sibling batches", () => {
  const blocks = [
    {
      content: "whole block",
      children: [{ content: "child", children: [] }],
    },
  ];
  assert.deepEqual(
    planLinewisePut({ blocks, kind: "linewise" }, "anchor", false),
    {
      batch: [
        {
          content: "whole block",
          children: [{ content: "child" }],
        },
      ],
      sibling: true,
      before: false,
    }
  );
});

test("register display exposes type and escaped content", () => {
  assert.equal(
    describeUnnamedRegister({
      text: "alpha\nbeta",
      kind: "characterwise",
    }),
    'Unnamed register (characterwise): "alpha\\nbeta"'
  );
});
