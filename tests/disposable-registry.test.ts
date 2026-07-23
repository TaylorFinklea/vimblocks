import assert from "node:assert/strict";
import test from "node:test";

import { DisposableRegistry } from "../src/runtime/disposable-registry.ts";

test("removes listeners on unload and stays idempotent", () => {
  const target = new EventTarget();
  const lifecycle = new DisposableRegistry();
  let executions = 0;
  const listener = () => {
    executions += 1;
  };

  lifecycle.listen(target, "vim-action", listener);
  target.dispatchEvent(new Event("vim-action"));
  lifecycle.dispose();
  lifecycle.dispose();
  target.dispatchEvent(new Event("vim-action"));

  assert.equal(executions, 1);
});

test("unload followed by reload leaves one live handler", () => {
  const target = new EventTarget();
  let executions = 0;
  const listener = () => {
    executions += 1;
  };

  const firstLoad = new DisposableRegistry();
  firstLoad.listen(target, "vim-action", listener);
  firstLoad.dispose();

  const secondLoad = new DisposableRegistry();
  secondLoad.listen(target, "vim-action", listener);
  target.dispatchEvent(new Event("vim-action"));
  secondLoad.dispose();

  assert.equal(executions, 1);
});

test("a disposer added after unload runs immediately", () => {
  const lifecycle = new DisposableRegistry();
  let disposed = 0;
  lifecycle.dispose();
  lifecycle.add(() => {
    disposed += 1;
  });

  assert.equal(disposed, 1);
});
