import assert from "node:assert/strict";
import test from "node:test";

const loadCommandModule = async () =>
  import("../src/db-task-capture-command.ts").catch(() => null);

type Action = () => Promise<void>;

const createApi = (
  shortcut: string | undefined = undefined,
  selectedBlockUUID = "selected-block"
) => {
  const palette: Array<{ options: Record<string, unknown>; action: Action }> =
    [];
  const shortcuts: Array<{
    keybinding: Record<string, unknown>;
    options: Record<string, unknown>;
    action: Action;
  }> = [];
  const messages: Array<[string, string]> = [];
  let exits = 0;
  let unregisters = 0;

  return {
    settings:
      shortcut === undefined ? {} : { dbTaskCaptureShortcut: shortcut },
    App: {
      registerCommandPalette(options, action) {
        palette.push({ options, action });
        return () => {
          unregisters += 1;
        };
      },
      registerCommandShortcut(keybinding, action, options) {
        shortcuts.push({ keybinding, options, action });
        return () => {
          unregisters += 1;
        };
      },
    },
    Editor: {
      async getCurrentBlock() {
        return selectedBlockUUID ? { uuid: selectedBlockUUID } : null;
      },
      async exitEditingMode() {
        exits += 1;
      },
    },
    UI: {
      showMsg(message, status) {
        messages.push([message, status]);
      },
    },
    palette,
    shortcuts,
    messages,
    exits: () => exits,
    unregisters: () => unregisters,
  };
};

test("registers a palette command and configurable non-editing shortcut", async () => {
  const command = await loadCommandModule();
  assert.ok(command, "DB task capture command module should exist");
  if (!command) return;
  const api = createApi();
  const dispose = command.registerDbTaskCaptureCommand(api, {
    getCursorState: () => ({ cursorMode: false, cursorBlockUUID: "" }),
    openCapture: () => undefined,
  });

  assert.equal(api.palette.length, 1);
  assert.equal(
    api.palette[0].options.key,
    `${command.DB_TASK_CAPTURE_COMMAND_ID}-palette`
  );
  assert.equal(api.shortcuts.length, 1);
  assert.deepEqual(api.shortcuts[0].keybinding, {
    mode: "non-editing",
    binding: command.DEFAULT_DB_TASK_CAPTURE_SHORTCUT,
  });

  dispose();
  dispose();
  assert.equal(api.unregisters(), 2);
});

test("blank shortcut keeps DB capture command palette-only", async () => {
  const command = await loadCommandModule();
  assert.ok(command, "DB task capture command module should exist");
  if (!command) return;
  const api = createApi("  ");
  command.registerDbTaskCaptureCommand(api, {
    getCursorState: () => ({ cursorMode: false, cursorBlockUUID: "" }),
    openCapture: () => undefined,
  });

  assert.equal(api.palette.length, 1);
  assert.equal(api.shortcuts.length, 0);
});

test("opens capture from the Vim-owned block before clearing selection", async () => {
  const command = await loadCommandModule();
  assert.ok(command, "DB task capture command module should exist");
  if (!command) return;
  const api = createApi();
  const anchors: string[] = [];
  command.registerDbTaskCaptureCommand(api, {
    getCursorState: () => ({
      cursorMode: true,
      cursorBlockUUID: "vim-owned-block",
    }),
    openCapture: (anchorUUID) => {
      anchors.push(anchorUUID);
    },
  });

  await api.palette[0].action();

  assert.deepEqual(anchors, ["vim-owned-block"]);
  assert.equal(api.exits(), 1);
  assert.deepEqual(api.messages, []);
});

test("warns without opening when no selected or Vim-owned block exists", async () => {
  const command = await loadCommandModule();
  assert.ok(command, "DB task capture command module should exist");
  if (!command) return;
  const api = createApi(undefined, "");
  let opened = 0;
  command.registerDbTaskCaptureCommand(api, {
    getCursorState: () => ({ cursorMode: false, cursorBlockUUID: "" }),
    openCapture: () => {
      opened += 1;
    },
  });

  await api.palette[0].action();

  assert.equal(opened, 0);
  assert.equal(api.exits(), 0);
  assert.deepEqual(api.messages, [
    ["Select a destination block before capturing a task.", "warning"],
  ]);
});
