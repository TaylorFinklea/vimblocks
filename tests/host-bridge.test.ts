import assert from "node:assert/strict";
import test from "node:test";

import {
  addHostKeydownListener,
  configureHostCapture,
  configureHostNormalModeCapture,
  installHostBridge,
  setHostNormalModeActive,
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
    let receivedBlockUUID: string | undefined;
    let visibleBlockUUIDs: string[] = [];
    const removeKeydown = addHostKeydownListener((event) => {
      received = event.key;
      receivedBlockUUID = event.blockUUID;
      visibleBlockUUIDs = event.visibleBlockUUIDs;
    });

    configureHostCapture(["x", "d"]);
    configureHostNormalModeCapture(["h", "j", "k", "l"]);
    setHostNormalModeActive(true);
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
        blockEditorActive: false,
        blockUUID: "block-1",
        visibleBlockUUIDs: ["block-2", "block-1"],
      },
    });

    assert.deepEqual(scripts, ["./host-bridge.js"]);
    assert.equal(received, "x");
    assert.equal(receivedBlockUUID, "block-1");
    assert.deepEqual(visibleBlockUUIDs, ["block-2", "block-1"]);
    assert.deepEqual(messages, [
      {
        channel: "vimblocks-host-bridge-v1",
        type: "configure",
        tokens: ["x", "d"],
        normalModeTokens: [],
        captureAll: false,
        normalModeActive: false,
      },
      {
        channel: "vimblocks-host-bridge-v1",
        type: "configure",
        tokens: ["x", "d"],
        normalModeTokens: ["h", "j", "k", "l"],
        captureAll: false,
        normalModeActive: false,
      },
      {
        channel: "vimblocks-host-bridge-v1",
        type: "normal-mode",
        value: true,
      },
      {
        channel: "vimblocks-host-bridge-v1",
        type: "configure",
        tokens: ["x", "d"],
        normalModeTokens: ["h", "j", "k", "l"],
        captureAll: false,
        normalModeActive: true,
      },
    ]);

    setHostNormalModeActive(false);
    removeKeydown();
    dispose();
  } finally {
    globalThis.window = originalWindow;
  }
});
