import { resolveCaptureAnchorUUID } from "./runtime/db-task-capture.ts";

export const DB_TASK_CAPTURE_COMMAND_ID = "vimblocks-db-task-capture";
export const DEFAULT_DB_TASK_CAPTURE_SHORTCUT = "mod+shift+space";

type CommandDisposer = void | (() => void);

export interface DbTaskCaptureCommandApi {
  settings?: Record<string, unknown>;
  App: {
    registerCommandPalette(
      options: { key: string; label: string },
      action: () => Promise<void>
    ): CommandDisposer;
    registerCommandShortcut(
      keybinding: { mode: "non-editing"; binding: string },
      action: () => Promise<void>,
      options: { key: string; label: string; desc: string }
    ): CommandDisposer;
  };
  Editor: {
    getCurrentBlock(): Promise<{ uuid: string } | null>;
    exitEditingMode(selectBlock: boolean): Promise<unknown>;
  };
  UI: {
    showMsg(message: string, status: "warning"): unknown;
  };
}

export interface DbTaskCaptureCommandOptions {
  getCursorState(): {
    cursorMode: boolean;
    cursorBlockUUID: string;
  };
  openCapture(anchorUUID: string): void | Promise<void>;
}

const resolveCaptureShortcut = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return DEFAULT_DB_TASK_CAPTURE_SHORTCUT;
  }
  const shortcut = value.trim();
  return shortcut || null;
};

export const registerDbTaskCaptureCommand = (
  api: DbTaskCaptureCommandApi,
  options: DbTaskCaptureCommandOptions
): (() => void) => {
  const action = async (): Promise<void> => {
    const selectedBlock = await api.Editor.getCurrentBlock();
    const cursor = options.getCursorState();
    const anchorUUID = resolveCaptureAnchorUUID(
      selectedBlock?.uuid,
      cursor.cursorMode,
      cursor.cursorBlockUUID
    );
    if (!anchorUUID) {
      api.UI.showMsg(
        "Select a destination block before capturing a task.",
        "warning"
      );
      return;
    }

    await api.Editor.exitEditingMode(true);
    await options.openCapture(anchorUUID);
  };

  const disposers: Array<() => void> = [];
  const paletteDisposer = api.App.registerCommandPalette(
    {
      key: `${DB_TASK_CAPTURE_COMMAND_ID}-palette`,
      label: "Vimblocks: Capture DB task",
    },
    action
  );
  if (paletteDisposer) {
    disposers.push(paletteDisposer);
  }

  const shortcut = resolveCaptureShortcut(
    api.settings?.dbTaskCaptureShortcut
  );
  if (shortcut) {
    const shortcutDisposer = api.App.registerCommandShortcut(
      { mode: "non-editing", binding: shortcut },
      action,
      {
        key: `${DB_TASK_CAPTURE_COMMAND_ID}-shortcut`,
        label: "Vimblocks: Capture DB task",
        desc: "Capture a Logseq DB task from natural language.",
      }
    );
    if (shortcutDisposer) {
      disposers.push(shortcutDisposer);
    }
  }

  let disposed = false;
  return () => {
    if (disposed) return;
    disposed = true;
    for (const dispose of disposers) {
      dispose();
    }
  };
};
