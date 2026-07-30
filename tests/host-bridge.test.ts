import assert from "node:assert/strict";
import test from "node:test";

import {
  addHostThemeListener,
  addHostKeydownListener,
  addHostNormalModeListener,
  clearHostHighlights,
  configureHostCapture,
  configureHostNormalModeCapture,
  installHostBridge,
  highlightHostRanges,
  requestHostTheme,
  setHostNormalModeActive,
} from "../src/runtime/host-bridge.ts";

test("reports when the host panic chord releases normal-mode capture", async () => {
  const eventListeners = new Map<string, (event: unknown) => void>();
  const parent = { postMessage() {} };
  const foreign = {};
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
    const dispose = await installHostBridge({
      Experiments: { async loadScripts() {} },
    });
    setHostNormalModeActive(true);
    const states: boolean[] = [];
    const removeListener = addHostNormalModeListener((active) => {
      states.push(active);
    });

    eventListeners.get("message")?.({
      source: foreign,
      data: {
        channel: "vimblocks-host-bridge-v1",
        type: "capture-released",
      },
    });
    eventListeners.get("message")?.({
      source: parent,
      data: {
        channel: "vimblocks-host-bridge-v1",
        type: "capture-released",
      },
    });

    assert.deepEqual(states, [true, false]);

    removeListener();
    dispose();
  } finally {
    globalThis.window = originalWindow;
  }
});

test("relays validated host theme values and ignores foreign frames", async () => {
  const messages: unknown[] = [];
  const eventListeners = new Map<string, (event: unknown) => void>();
  const parent = {
    postMessage(message: unknown) {
      messages.push(message);
    },
  };
  const foreign = {};
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
    const dispose = await installHostBridge({
      Experiments: { async loadScripts() {} },
    });
    const received: unknown[] = [];
    const removeTheme = addHostThemeListener((theme) => {
      received.push(theme);
    });
    const data = {
      channel: "vimblocks-host-bridge-v1",
      type: "theme",
      tokens: {
        popover: "30 7% 13%",
        accent: "187 95% 39%",
        "accent-color": "#05a2c2",
        injected: "url(https://example.invalid)",
      },
      colorScheme: "dark",
      fontFamily: '"JetBrains Mono", monospace',
      radius: "0.5rem",
    };

    eventListeners.get("message")?.({ source: foreign, data });
    eventListeners.get("message")?.({ source: parent, data });
    requestHostTheme();

    assert.deepEqual(received, [
      {
        tokens: {
          popover: "30 7% 13%",
          accent: "187 95% 39%",
          "accent-color": "#05a2c2",
        },
        colorScheme: "dark",
        fontFamily: '"JetBrains Mono", monospace',
        radius: "0.5rem",
      },
    ]);
    assert.deepEqual(messages.at(-1), {
      channel: "vimblocks-host-bridge-v1",
      type: "theme-request",
    });

    removeTheme();
    dispose();
  } finally {
    globalThis.window = originalWindow;
  }
});

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
    let viewportBlockUUIDs: string[] = [];
    const removeKeydown = addHostKeydownListener((event) => {
      received = event.key;
      receivedBlockUUID = event.blockUUID;
      visibleBlockUUIDs = event.visibleBlockUUIDs;
      viewportBlockUUIDs = event.viewportBlockUUIDs;
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
        viewportBlockUUIDs: ["block-1"],
      },
    });

    assert.deepEqual(scripts, ["/key-token.js", "/host-bridge.js"]);
    assert.equal(received, "x");
    assert.equal(receivedBlockUUID, "block-1");
    assert.deepEqual(visibleBlockUUIDs, ["block-2", "block-1"]);
    assert.deepEqual(viewportBlockUUIDs, ["block-1"]);
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

    clearHostHighlights(["block-1"]);
    clearHostHighlights();
    assert.deepEqual(messages.slice(-2), [
      {
        channel: "vimblocks-host-bridge-v1",
        type: "clear-highlights",
        uuids: ["block-1"],
      },
      {
        channel: "vimblocks-host-bridge-v1",
        type: "clear-highlights",
      },
    ]);

    highlightHostRanges([
      {
        uuid: "block-1",
        renderedOffset: 2,
        renderedLength: 4,
        role: "visual",
      },
    ]);
    assert.deepEqual(messages.at(-1), {
      channel: "vimblocks-host-bridge-v1",
      type: "highlight-ranges",
      ranges: [{
        uuid: "block-1",
        renderedOffset: 2,
        renderedLength: 4,
        role: "visual",
      }],
    });

    setHostNormalModeActive(false);
    removeKeydown();
    dispose();
    assert.deepEqual(messages.slice(-3), [
      {
        channel: "vimblocks-host-bridge-v1",
        type: "capture-all",
        value: false,
      },
      {
        channel: "vimblocks-host-bridge-v1",
        type: "normal-mode",
        value: false,
      },
      {
        channel: "vimblocks-host-bridge-v1",
        type: "dispose",
      },
    ]);
  } finally {
    globalThis.window = originalWindow;
  }
});

test("reinstalling after dispose leaves exactly one host listener", async () => {
  // A Map-keyed fake cannot see double registration, so track every call.
  const added: string[] = [];
  const removed: string[] = [];
  const messageListeners: ((event: unknown) => void)[] = [];
  const parent = { postMessage() {} };
  const originalWindow = globalThis.window;
  globalThis.window = {
    parent,
    addEventListener(type: string, listener: (event: unknown) => void) {
      added.push(type);
      if (type === "message") messageListeners.push(listener);
    },
    removeEventListener(type: string, listener: (event: unknown) => void) {
      removed.push(type);
      const index = messageListeners.indexOf(listener);
      if (index >= 0) messageListeners.splice(index, 1);
    },
  } as unknown as Window & typeof globalThis;

  const api = {
    Experiments: {
      async loadScripts() {},
    },
  };

  try {
    const disposeFirst = await installHostBridge(api);
    assert.equal(messageListeners.length, 1);
    disposeFirst();
    assert.equal(messageListeners.length, 0);

    const disposeSecond = await installHostBridge(api);
    assert.equal(messageListeners.length, 1);

    let deliveries = 0;
    const removeKeydown = addHostKeydownListener(() => {
      deliveries += 1;
    });
    for (const listener of [...messageListeners]) {
      listener({
        source: parent,
        data: {
          channel: "vimblocks-host-bridge-v1",
          type: "keydown",
          key: "x",
          code: "KeyX",
          visibleBlockUUIDs: [],
          viewportBlockUUIDs: [],
        },
      });
    }
    assert.equal(deliveries, 1);

    removeKeydown();
    disposeSecond();
    assert.equal(messageListeners.length, 0);
  } finally {
    globalThis.window = originalWindow;
  }
});

test("a disposed bridge delivers nothing", async () => {
  const messageListeners: ((event: unknown) => void)[] = [];
  const parent = { postMessage() {} };
  const originalWindow = globalThis.window;
  globalThis.window = {
    parent,
    addEventListener(type: string, listener: (event: unknown) => void) {
      if (type === "message") messageListeners.push(listener);
    },
    removeEventListener() {},
  } as unknown as Window & typeof globalThis;

  try {
    const dispose = await installHostBridge({
      Experiments: { async loadScripts() {} },
    });
    let deliveries = 0;
    addHostKeydownListener(() => {
      deliveries += 1;
    });
    dispose();

    // Even if the host somehow still posts, the plugin must be inert: dispose
    // clears the listener set, so a stale message cannot drive the modal engine.
    messageListeners[0]?.({
      source: parent,
      data: {
        channel: "vimblocks-host-bridge-v1",
        type: "keydown",
        key: "x",
        code: "KeyX",
        visibleBlockUUIDs: [],
        viewportBlockUUIDs: [],
      },
    });
    assert.equal(deliveries, 0);
  } finally {
    globalThis.window = originalWindow;
  }
});
