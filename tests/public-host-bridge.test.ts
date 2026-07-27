import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createContext, runInContext } from "node:vm";
import test from "node:test";

test("keeps normal mode active across an immediate character-find target", () => {
  const messages: Record<string, unknown>[] = [];
  const listeners = new Map<string, (event: Record<string, unknown>) => void>();

  class FakeElement {
    id = "";
    isContentEditable = false;
    tagName = "DIV";

    closest() {
      return null;
    }

    getAttribute() {
      return null;
    }

    matches() {
      return false;
    }
  }

  const window = {
    addEventListener(
      type: string,
      listener: (event: Record<string, unknown>) => void
    ) {
      listeners.set(type, listener);
    },
    removeEventListener(type: string) {
      listeners.delete(type);
    },
    postMessage(message: Record<string, unknown>) {
      messages.push(message);
    },
  };
  const document = {
    addEventListener() {},
    removeEventListener() {},
    querySelectorAll() {
      return [];
    },
  };
  class FakeMutationObserver {
    disconnect() {}
    observe() {}
  }

  const context = createContext({
    document,
    Element: FakeElement,
    MutationObserver: FakeMutationObserver,
    window,
  });
  runInContext(
    readFileSync(new URL("../public/key-token.js", import.meta.url), "utf8"),
    context
  );
  runInContext(
    readFileSync(new URL("../public/host-bridge.js", import.meta.url), "utf8"),
    context
  );

  listeners.get("message")?.({
    data: {
      channel: "vimblocks-host-bridge-v1",
      type: "configure",
      tokens: [],
      normalModeTokens: ["t", "a", "shift+4"],
      captureAll: false,
      normalModeActive: true,
    },
  });

  const target = new FakeElement();
  const press = (
    code: string,
    key: string,
    shiftKey = false
  ): boolean => {
    let prevented = false;
    listeners.get("keydown")?.({
      target,
      code,
      key,
      shiftKey,
      ctrlKey: false,
      metaKey: false,
      altKey: false,
      repeat: false,
      isComposing: false,
      preventDefault() {
        prevented = true;
      },
      stopImmediatePropagation() {},
    });
    return prevented;
  };

  assert.equal(press("KeyT", "t"), true);
  assert.equal(press("KeyA", "a"), true);
  assert.equal(press("Digit4", "$", true), true);
  assert.equal(
    messages.filter((message) => message.type === "keydown").length,
    3
  );
});

const setupBridge = () => {
  const selfMessages: Record<string, unknown>[] = [];
  const peerMessages: Record<string, unknown>[] = [];
  const foreignFrameMessages: Record<string, unknown>[] = [];
  const listeners = new Map<string, (event: Record<string, unknown>) => void>();

  class FakeElement {
    id = "";
    isContentEditable = false;
    tagName = "DIV";
    closest() {
      return null;
    }
    getAttribute() {
      return null;
    }
    matches() {
      return false;
    }
  }

  const pluginWindow = {
    postMessage(message: Record<string, unknown>) {
      peerMessages.push(message);
    },
  };
  const attackerWindow = {
    postMessage(message: Record<string, unknown>) {
      foreignFrameMessages.push(message);
    },
  };

  const window = {
    addEventListener(
      type: string,
      listener: (event: Record<string, unknown>) => void
    ) {
      listeners.set(type, listener);
    },
    removeEventListener(type: string) {
      listeners.delete(type);
    },
    postMessage(message: Record<string, unknown>) {
      selfMessages.push(message);
    },
  };
  const document = {
    addEventListener() {},
    removeEventListener() {},
    querySelectorAll(selector: string) {
      return selector === "iframe" ? frames : [];
    },
  };
  let frames: { contentWindow: unknown }[] = [
    { contentWindow: pluginWindow },
    { contentWindow: attackerWindow },
  ];
  const detachPeerFrame = () => {
    frames = frames.filter((frame) => frame.contentWindow !== pluginWindow);
  };
  class FakeMutationObserver {
    disconnect() {}
    observe() {}
  }

  const context = createContext({
    document,
    Element: FakeElement,
    MutationObserver: FakeMutationObserver,
    window,
  });
  runInContext(
    readFileSync(new URL("../public/key-token.js", import.meta.url), "utf8"),
    context
  );
  runInContext(
    readFileSync(new URL("../public/host-bridge.js", import.meta.url), "utf8"),
    context
  );

  const send = (
    data: Record<string, unknown>,
    source: unknown
  ): void => {
    listeners.get("message")?.({
      source,
      data: { channel: "vimblocks-host-bridge-v1", ...data },
    });
  };
  const target = new FakeElement();
  const press = (
    code: string,
    key: string,
    modifiers: {
      ctrlKey?: boolean;
      altKey?: boolean;
      shiftKey?: boolean;
      metaKey?: boolean;
    } = {}
  ): boolean => {
    let prevented = false;
    listeners.get("keydown")?.({
      target,
      code,
      key,
      shiftKey: Boolean(modifiers.shiftKey),
      ctrlKey: Boolean(modifiers.ctrlKey),
      metaKey: Boolean(modifiers.metaKey),
      altKey: Boolean(modifiers.altKey),
      repeat: false,
      isComposing: false,
      preventDefault() {
        prevented = true;
      },
      stopImmediatePropagation() {},
    });
    return prevented;
  };

  return {
    send,
    press,
    detachPeerFrame,
    hostWindow: window,
    pluginWindow,
    attackerWindow,
    selfMessages,
    peerMessages,
    foreignFrameMessages,
  };
};

test("does not bind to the host's own ready broadcast", () => {
  const bridge = setupBridge();

  // The ready handshake is posted to window as well as to child frames, so the
  // host receives it back. Binding to itself there would lock the real plugin
  // frame out permanently.
  bridge.send({ type: "ready" }, bridge.hostWindow);
  bridge.send(
    {
      type: "configure",
      tokens: [],
      normalModeTokens: ["j"],
      captureAll: false,
      normalModeActive: true,
    },
    bridge.pluginWindow
  );

  assert.equal(bridge.press("KeyJ", "j"), true);
  assert.equal(
    bridge.peerMessages.filter((message) => message.type === "keydown").length,
    1
  );
});

test("ignores control messages from a window that is not the bound peer", () => {
  const bridge = setupBridge();

  bridge.send(
    {
      type: "configure",
      tokens: [],
      normalModeTokens: ["j"],
      captureAll: false,
      normalModeActive: true,
    },
    bridge.pluginWindow
  );

  // A third-party iframe embedded in a note must not be able to turn on
  // blanket capture, which would swallow every non-text-entry keystroke.
  bridge.send({ type: "capture-all", value: true }, bridge.attackerWindow);

  assert.equal(bridge.press("KeyQ", "q"), false);
  assert.equal(bridge.press("KeyJ", "j"), true);
});

test("ignores a dispose request from a window that is not the bound peer", () => {
  const bridge = setupBridge();

  bridge.send(
    {
      type: "configure",
      tokens: [],
      normalModeTokens: ["j"],
      captureAll: false,
      normalModeActive: true,
    },
    bridge.pluginWindow
  );
  bridge.send({ type: "dispose" }, bridge.attackerWindow);

  assert.equal(bridge.press("KeyJ", "j"), true);
});

test("delivers captured keystrokes only to the bound peer", () => {
  const bridge = setupBridge();

  bridge.send(
    {
      type: "configure",
      tokens: [],
      normalModeTokens: ["j"],
      captureAll: false,
      normalModeActive: true,
    },
    bridge.pluginWindow
  );
  bridge.press("KeyJ", "j");

  assert.equal(
    bridge.peerMessages.filter((message) => message.type === "keydown").length,
    1
  );
  // Logseq notes can embed third-party iframes. The ready handshake has to be
  // broadcast to find the plugin frame, but it carries no input; nothing after
  // it may reach a frame that is not the bound peer.
  assert.deepEqual(
    bridge.foreignFrameMessages.map((message) => message.type),
    ["ready"]
  );
});

const configurePeer = (bridge: ReturnType<typeof setupBridge>) =>
  bridge.send(
    {
      type: "configure",
      tokens: [],
      normalModeTokens: ["j"],
      captureAll: false,
      normalModeActive: true,
    },
    bridge.pluginWindow
  );

test("stops capturing once the plugin frame is gone", () => {
  const bridge = setupBridge();
  configurePeer(bridge);
  assert.equal(bridge.press("KeyJ", "j"), true);

  // If the plugin iframe dies without a clean teardown, nothing resets the
  // capture set and the bridge would swallow these keys forever.
  bridge.detachPeerFrame();

  assert.equal(bridge.press("KeyJ", "j"), false);
});

test("panic chord releases the keyboard", () => {
  const bridge = setupBridge();
  configurePeer(bridge);
  assert.equal(bridge.press("KeyJ", "j"), true);

  assert.equal(
    bridge.press("KeyV", "v", {
      ctrlKey: true,
      altKey: true,
      shiftKey: true,
    }),
    true
  );

  assert.equal(bridge.press("KeyJ", "j"), false);
});

test("blanket capture also stops once the plugin frame is gone", () => {
  const bridge = setupBridge();
  bridge.send(
    {
      type: "configure",
      tokens: [],
      normalModeTokens: [],
      captureAll: true,
      normalModeActive: false,
    },
    bridge.pluginWindow
  );
  assert.equal(bridge.press("KeyQ", "q"), true);

  bridge.detachPeerFrame();

  assert.equal(bridge.press("KeyQ", "q"), false);
});
