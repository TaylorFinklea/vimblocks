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

test("runs every disposer even when an earlier one throws", () => {
  // The host bridge's disposer is registered first and so runs last. A single
  // throwing disposer used to abort the loop and leave the bridge armed,
  // swallowing keys for the rest of the session.
  const ran: string[] = [];
  const errors: unknown[] = [];
  const lifecycle = new DisposableRegistry();
  lifecycle.add(() => ran.push("host-bridge"));
  lifecycle.add(() => {
    throw new Error("disposer failed");
  });
  lifecycle.add(() => ran.push("last-registered"));

  lifecycle.dispose({ onError: (error) => errors.push(error) });

  assert.deepEqual(ran, ["last-registered", "host-bridge"]);
  assert.equal(errors.length, 1);
});

test("clears disposers after a failing dispose", () => {
  const lifecycle = new DisposableRegistry();
  lifecycle.add(() => {
    throw new Error("disposer failed");
  });
  lifecycle.dispose({ onError: () => {} });

  let ranImmediately = false;
  lifecycle.add(() => {
    ranImmediately = true;
  });
  assert.equal(ranImmediately, true);
});

test("a failing disposer does not propagate out of dispose", () => {
  const lifecycle = new DisposableRegistry();
  lifecycle.add(() => {
    throw new Error("disposer failed");
  });

  assert.doesNotThrow(() => lifecycle.dispose({ onError: () => {} }));
});
