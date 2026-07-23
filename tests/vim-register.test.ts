import assert from "node:assert/strict";
import test from "node:test";

const loadRegisterModule = async () =>
  import("../src/runtime/vim-register.ts").catch(() => null);

test("the unnamed register records characterwise and linewise values", async () => {
  const registerModule = await loadRegisterModule();
  assert.ok(registerModule, "Vim register module should exist");
  if (!registerModule) {
    return;
  }

  const store = new registerModule.VimRegisterStore();
  store.write("alpha", "characterwise");
  assert.deepEqual(store.read(), {
    text: "alpha",
    kind: "characterwise",
  });

  store.write("whole block", "linewise");
  assert.deepEqual(store.read(), {
    text: "whole block",
    kind: "linewise",
  });
});

test("p and P put characterwise text after or before the cursor", async () => {
  const registerModule = await loadRegisterModule();
  assert.ok(registerModule, "Vim register module should exist");
  if (!registerModule) {
    return;
  }

  const register = { text: "XY", kind: "characterwise" as const };
  assert.deepEqual(
    registerModule.planRegisterPut("abcd", 1, register, false),
    {
      kind: "characterwise",
      content: "abXYcd",
      cursor: 3,
    }
  );
  assert.deepEqual(
    registerModule.planRegisterPut("abcd", 1, register, true),
    {
      kind: "characterwise",
      content: "aXYbcd",
      cursor: 2,
    }
  );
});

test("linewise puts remain sibling-block operations", async () => {
  const registerModule = await loadRegisterModule();
  assert.ok(registerModule, "Vim register module should exist");
  if (!registerModule) {
    return;
  }

  assert.deepEqual(
    registerModule.planRegisterPut(
      "current",
      0,
      { text: "whole block", kind: "linewise" },
      false
    ),
    {
      kind: "linewise",
      text: "whole block",
      before: false,
    }
  );
});

test("register display exposes type and escaped content", async () => {
  const registerModule = await loadRegisterModule();
  assert.ok(registerModule, "Vim register module should exist");
  if (!registerModule) {
    return;
  }

  assert.equal(
    registerModule.describeUnnamedRegister({
      text: "alpha\nbeta",
      kind: "characterwise",
    }),
    'Unnamed register (characterwise): "alpha\\nbeta"'
  );
});
