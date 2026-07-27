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
