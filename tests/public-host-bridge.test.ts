import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createContext, runInContext } from "node:vm";
import test from "node:test";

import { isTextEntryTarget } from "../src/runtime/context-guard.ts";

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
    activeElement: null as FakeElement | null,
    documentElement: new FakeElement(),
    body: new FakeElement(),
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
    getComputedStyle() {
      const values: Record<string, string> = {
        "--background": "30 7% 11%",
        "--foreground": "40 8% 90%",
        "--popover": "30 7% 13%",
        "--popover-foreground": "40 8% 90%",
        "--muted": "30 6% 18%",
        "--muted-foreground": "35 6% 63%",
        "--accent": "187 95% 39%",
        "--accent-foreground": "30 7% 11%",
        "--border": "30 6% 25%",
        "--input": "30 6% 25%",
        "--ring": "187 95% 39%",
        "--radius": "0.5rem",
        "--lx-accent-04-alpha": "rgba(5, 162, 194, 0.16)",
        "--lx-accent-09": "#05a2c2",
        "--lx-accent-10": "#0894b3",
      };
      return {
        colorScheme: "dark",
        fontFamily: '"JetBrains Mono", monospace',
        getPropertyValue(name: string) {
          return values[name] ?? "";
        },
      };
    },
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
    activeElement: null as FakeElement | null,
    documentElement: new FakeElement(),
    body: new FakeElement(),
    addEventListener() {},
    removeEventListener() {},
    querySelectorAll(selector: string) {
      return selector === "iframe" ? frames : [];
    },
    getElementById() {
      return new FakeElement();
    },
    createElement() {
      throw new Error("unexpected DOM mutation");
    },
    createTextNode() {
      throw new Error("unexpected DOM mutation");
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
    getComputedStyle() {
      const values: Record<string, string> = {
        "--background": "30 7% 11%",
        "--foreground": "40 8% 90%",
        "--popover": "30 7% 13%",
        "--popover-foreground": "40 8% 90%",
        "--muted": "30 6% 18%",
        "--muted-foreground": "35 6% 63%",
        "--accent": "187 95% 39%",
        "--accent-foreground": "30 7% 11%",
        "--border": "30 6% 25%",
        "--input": "30 6% 25%",
        "--ring": "187 95% 39%",
        "--radius": "0.5rem",
        "--lx-accent-04-alpha": "rgba(5, 162, 194, 0.16)",
        "--lx-accent-09": "#05a2c2",
        "--lx-accent-10": "#0894b3",
      };
      return {
        colorScheme: "dark",
        fontFamily: '"JetBrains Mono", monospace',
        getPropertyValue(name: string) {
          return values[name] ?? "";
        },
      };
    },
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

  const editableTarget = new FakeElement();
  editableTarget.isContentEditable = true;
  const focusTextEntry = (): void => {
    document.activeElement = editableTarget;
  };
  const pressEscapeInEditor = (): void => {
    listeners.get("keydown")?.({
      target: editableTarget,
      code: "Escape",
      key: "Escape",
      shiftKey: false,
      ctrlKey: false,
      metaKey: false,
      altKey: false,
      repeat: false,
      isComposing: false,
      preventDefault() {},
      stopImmediatePropagation() {},
    });
  };

  return {
    send,
    press,
    pressEscapeInEditor,
    focusTextEntry,
    detachPeerFrame,
    // The context's `Element` is this class, so targets built from its
    // prototype satisfy the bridge's `instanceof Element` check.
    elementPrototype: FakeElement.prototype,
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

test("delivers the host theme only to the bound peer", () => {
  const bridge = setupBridge();

  configurePeer(bridge);

  const themeMessages = JSON.parse(JSON.stringify(
    bridge.peerMessages.filter((message) => message.type === "theme")
  ));
  assert.deepEqual(themeMessages, [
    {
      channel: "vimblocks-host-bridge-v1",
      type: "theme",
      tokens: {
        background: "30 7% 11%",
        foreground: "40 8% 90%",
        popover: "30 7% 13%",
        "popover-foreground": "40 8% 90%",
        muted: "30 6% 18%",
        "muted-foreground": "35 6% 63%",
        accent: "187 95% 39%",
        "accent-foreground": "30 7% 11%",
        border: "30 6% 25%",
        input: "30 6% 25%",
        ring: "187 95% 39%",
        "accent-soft-color": "rgba(5, 162, 194, 0.16)",
        "accent-color": "#05a2c2",
        "accent-hover-color": "#0894b3",
      },
      colorScheme: "dark",
      fontFamily: '"JetBrains Mono", monospace',
      radius: "0.5rem",
    },
  ]);
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
  assert.equal(
    bridge.peerMessages.filter(
      (message) => message.type === "capture-released"
    ).length,
    1
  );
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

test("never mutates rendered block DOM to paint highlights", () => {
  const bridge = setupBridge();
  configurePeer(bridge);

  // Without the CSS Custom Highlight API the bridge used to fall back to
  // wrapping text nodes in <mark>, mutating Logseq's React-rendered DOM. That
  // leaked markup into block content, which is why search.ts still strips it.
  assert.doesNotThrow(() =>
    bridge.send(
      {
        type: "highlight-ranges",
        ranges: [
          {
            uuid: "block-a",
            renderedOffset: 0,
            renderedLength: 3,
            role: "cursor",
          },
        ],
      },
      bridge.pluginWindow
    )
  );

  assert.doesNotThrow(() =>
    bridge.send(
      { type: "highlight", uuid: "block-a", length: 3, text: "abc" },
      bridge.pluginWindow
    )
  );
});

test("captures an operator typed before the plugin confirms normal mode", () => {
  const bridge = setupBridge();
  bridge.send(
    {
      type: "configure",
      tokens: ["d"],
      normalModeTokens: ["j"],
      captureAll: false,
      normalModeActive: false,
    },
    bridge.pluginWindow
  );

  // Escape from a block editor puts the host into an optimistic normal mode.
  // A fast typist can land the next key before the plugin confirms it, and
  // that key must still be captured or it types into the block instead.
  bridge.pressEscapeInEditor();

  assert.equal(bridge.press("KeyD", "d"), true);
});

test("does not capture normal-mode keys while a host text field owns focus", () => {
  const bridge = setupBridge();
  bridge.send(
    {
      type: "configure",
      tokens: ["d"],
      normalModeTokens: ["j"],
      captureAll: false,
      normalModeActive: true,
    },
    bridge.pluginWindow
  );

  // Logseq can retarget a newly opened global-search keydown at the old block
  // even after the search input becomes document.activeElement. The focused
  // host field owns the keystroke.
  bridge.focusTextEntry();

  assert.equal(bridge.press("KeyD", "d"), false);
  assert.equal(
    bridge.peerMessages.filter((message) => message.type === "keydown").length,
    0
  );
});

test("host and plugin text-entry guards classify targets identically", () => {
  const bridge = setupBridge();
  const hostGuard = (
    bridge.hostWindow as unknown as {
      __vimblocksHostBridge: { isTextEntry(target: unknown): boolean };
    }
  ).__vimblocksHostBridge.isTextEntry;

  const target = (overrides: Record<string, unknown>) =>
    Object.assign(Object.create(bridge.elementPrototype), {
      tagName: "DIV",
      isContentEditable: false,
      role: null,
      getAttribute(name: string) {
        return name === "role" ? (this as { role: string | null }).role : null;
      },
      ...overrides,
    });

  const cases: [string, Record<string, unknown>, boolean][] = [
    ["plain div", {}, false],
    ["contenteditable", { isContentEditable: true }, true],
    ["input", { tagName: "INPUT" }, true],
    ["textarea", { tagName: "TEXTAREA" }, true],
    ["select", { tagName: "SELECT" }, true],
    ["lowercase input tag", { tagName: "input" }, true],
    ["combobox role", { role: "combobox" }, true],
    ["searchbox role", { role: "searchbox" }, true],
    ["textbox role", { role: "textbox" }, true],
    ["uppercase role", { role: "TEXTBOX" }, true],
    // A dialog is a container, not an input. Suppressing keys while a modal is
    // open is a separate concern from "focus is in a text field", and
    // tests/context-guard.test.ts pins this deliberately.
    ["dialog role", { role: "dialog" }, false],
    ["listbox role", { role: "listbox" }, false],
    ["button role", { role: "button" }, false],
  ];

  for (const [label, overrides, expected] of cases) {
    const element = target(overrides);
    assert.equal(hostGuard(element), expected, `host guard: ${label}`);
    assert.equal(
      isTextEntryTarget(element),
      expected,
      `plugin guard: ${label}`
    );
  }
});
