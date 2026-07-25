import assert from "node:assert/strict";
import test from "node:test";

import {
  addHostKeydownListener,
  configureHostCapture,
  installHostBridge,
} from "../src/runtime/host-bridge.ts";

test("loads the host script and relays validated key events", async () => {
  const messages: unknown[] = [];
  const eventListeners = new Map<string, (event: unknown) => void>();
  const parent = {
    postMessage(message: unknown) {
      messages.push(message);
    },
  };
  const originalWindow = globalThis.window;
  globalThis.window = {
    parent,
    addEventListener(type: string, listener: (event: unknown) => void) {
      eventListeners.set(type, listener);
    },
    removeEventListener(type: string) {
      eventListeners.delete(type);
    },
  } as unknown as Window & typeof globalThis;

  try {
    const scripts: string[] = [];
    const dispose = await installHostBridge({
      Experiments: {
        async loadScripts(...paths: string[]) {
          scripts.push(...paths);
        },
      },
    });
    let received = "";
    const removeKeydown = addHostKeydownListener((event) => {
      received = event.key;
    });

    configureHostCapture(["x", "d"]);
    eventListeners.get("message")?.({
      source: parent,
      data: {
        channel: "vimblocks-host-bridge-v1",
        type: "ready",
      },
    });
    eventListeners.get("message")?.({
      source: parent,
      data: {
        channel: "vimblocks-host-bridge-v1",
        type: "keydown",
        key: "x",
        code: "KeyX",
      },
    });

    assert.deepEqual(scripts, ["./host-bridge.js"]);
    assert.equal(received, "x");
    assert.deepEqual(messages, [
      {
        channel: "vimblocks-host-bridge-v1",
        type: "configure",
        tokens: ["x", "d"],
        captureAll: false,
      },
      {
        channel: "vimblocks-host-bridge-v1",
        type: "configure",
        tokens: ["x", "d"],
        captureAll: false,
      },
    ]);

    removeKeydown();
    dispose();
  } finally {
    globalThis.window = originalWindow;
  }
});
