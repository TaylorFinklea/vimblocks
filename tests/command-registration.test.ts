import assert from "node:assert/strict";
import test from "node:test";

import { registerCommandRegistrars } from "../src/runtime/command-registration.ts";
import type { CommandRegistrar } from "../src/runtime/command-registration.ts";

interface FakeHost {
  commands: string[];
}

const registrar = (id: string): CommandRegistrar<FakeHost> => ({
  id,
  register: (host) => host.commands.push(id),
});

test("registers each owned command group exactly once in registry order", () => {
  const host: FakeHost = { commands: [] };
  registerCommandRegistrars(host, [
    registrar("move"),
    registrar("edit"),
    registrar("search"),
  ]);

  assert.deepEqual(host.commands, ["move", "edit", "search"]);
});

test("rejects duplicate registrar ids before registering anything", () => {
  const host: FakeHost = { commands: [] };

  assert.throws(
    () => registerCommandRegistrars(host, [
      registrar("move"),
      registrar("move"),
    ]),
    /Duplicate command registrar: move/
  );
  assert.deepEqual(host.commands, []);
});
