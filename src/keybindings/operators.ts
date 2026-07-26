import { ILSPluginUser } from "@logseq/libs/dist/LSPlugin";

import {
  beforeActionExecute,
  beforeActionRegister,
  getCurrentBlockUUID,
  getNumber,
  getSettings,
  resetNumber,
  writeClipboard,
} from "@/common/funcs";
import type { DefaultSettingsType } from "@/common/funcs";
import {
  advanceOperatorSequence,
  expandOperatorBinding,
  shouldCaptureNormalModeKey,
} from "@/runtime/operator-sequence";
import type { OperatorSequence } from "@/runtime/operator-sequence";
import {
  applyTextOperator,
  aroundWordRange,
  deferTrailingWhitespace,
  firstNonBlankPosition,
  innerWordRange,
  lineEndRange,
  lineRange,
  wordEndRange,
  wordForwardRange,
} from "@/runtime/text-objects";
import type {
  TextOperator,
  TextRange,
} from "@/runtime/text-objects";
import { useSearchStore } from "@/stores/search";
import { putVimRegister } from "@/keybindings/pasteNext";
import { cutAtNormalCursor } from "@/keybindings/cut";
import { yankCurrentBlockContent } from "@/keybindings/copyCurrentBlockContent";
import { deleteCurrentBlock } from "@/keybindings/deleteCurrentBlock";
import {
  isTextEntryEvent,
} from "@/runtime/context-guard";
import { persistNormalModeContent } from "@/runtime/normal-mode-mutation";
import {
  addHostKeydownListener,
  configureHostCapture,
  configureHostNormalModeCapture,
  setHostCaptureAll,
  setHostNormalModeActive,
  type HostKeydownEvent,
} from "@/runtime/host-bridge";
import { keyboardEventToken } from "@/runtime/key-token";
import { useModalStore } from "@/stores/modal";
import { setModalCountDigits } from "@/runtime/modal-count";

type OperatorObject =
  | "inner-word"
  | "around-word"
  | "word-forward"
  | "word-end"
  | "line-end"
  | "line";

export interface OperatorCommandDefinition {
  id: string;
  label: string;
  settingKey: keyof DefaultSettingsType["keyBindings"];
  operator: TextOperator;
  object: OperatorObject;
}

export const OPERATOR_COMMANDS: readonly OperatorCommandDefinition[] = [
  {
    id: "change-inner-word",
    label: "Vim: Change inner word (ciw)",
    settingKey: "changeInnerWord",
    operator: "change",
    object: "inner-word",
  },
  {
    id: "delete-inner-word",
    label: "Vim: Delete inner word (diw)",
    settingKey: "deleteInnerWord",
    operator: "delete",
    object: "inner-word",
  },
  {
    id: "yank-inner-word",
    label: "Vim: Yank inner word (yiw)",
    settingKey: "yankInnerWord",
    operator: "yank",
    object: "inner-word",
  },
  {
    id: "change-around-word",
    label: "Vim: Change around word (caw)",
    settingKey: "changeAroundWord",
    operator: "change",
    object: "around-word",
  },
  {
    id: "delete-around-word",
    label: "Vim: Delete around word (daw)",
    settingKey: "deleteAroundWord",
    operator: "delete",
    object: "around-word",
  },
  {
    id: "yank-around-word",
    label: "Vim: Yank around word (yaw)",
    settingKey: "yankAroundWord",
    operator: "yank",
    object: "around-word",
  },
  {
    id: "change-word",
    label: "Vim: Change word (cw)",
    settingKey: "changeWord",
    operator: "change",
    object: "word-end",
  },
  {
    id: "delete-word",
    label: "Vim: Delete word (dw)",
    settingKey: "deleteWord",
    operator: "delete",
    object: "word-forward",
  },
  {
    id: "yank-word",
    label: "Vim: Yank word (yw)",
    settingKey: "yankWord",
    operator: "yank",
    object: "word-forward",
  },
  {
    id: "change-word-end",
    label: "Vim: Change to word end (ce)",
    settingKey: "changeWordEnd",
    operator: "change",
    object: "word-end",
  },
  {
    id: "delete-word-end",
    label: "Vim: Delete to word end (de)",
    settingKey: "deleteWordEnd",
    operator: "delete",
    object: "word-end",
  },
  {
    id: "yank-word-end",
    label: "Vim: Yank to word end (ye)",
    settingKey: "yankWordEnd",
    operator: "yank",
    object: "word-end",
  },
  {
    id: "change-line-end",
    label: "Vim: Change to line end (c$ / C)",
    settingKey: "changeLineEnd",
    operator: "change",
    object: "line-end",
  },
  {
    id: "delete-line-end",
    label: "Vim: Delete to line end (d$ / D)",
    settingKey: "deleteLineEnd",
    operator: "delete",
    object: "line-end",
  },
  {
    id: "yank-line-end",
    label: "Vim: Yank to line end (y$)",
    settingKey: "yankLineEnd",
    operator: "yank",
    object: "line-end",
  },
  {
    id: "change-line",
    label: "Vim: Change line (cc / S)",
    settingKey: "changeLine",
    operator: "change",
    object: "line",
  },
];

const resolveOnce = (
  content: string,
  cursor: number,
  object: OperatorObject
): TextRange => {
  switch (object) {
    case "inner-word":
      return innerWordRange(content, cursor);
    case "around-word":
      return aroundWordRange(content, cursor);
    case "word-forward":
      return wordForwardRange(content, cursor);
    case "word-end":
      return wordEndRange(content, cursor);
    case "line-end":
      return lineEndRange(content, cursor);
    case "line":
      return lineRange(content);
  }
};

export const resolveOperatorRange = (
  content: string,
  cursor: number,
  object: OperatorObject,
  count = 1
): TextRange => {
  const first = resolveOnce(content, cursor, object);
  if (count <= 1 || object === "line" || object === "line-end") {
    return first;
  }

  let end = first.end;
  for (let index = 1; index < count && end < content.length; index += 1) {
    end = resolveOnce(content, end, object).end;
  }
  return { start: first.start, end };
};

const executeOperator = async (
  command: OperatorCommandDefinition
): Promise<void> => {
  const searchStore = useSearchStore();
  const blockUUID =
    searchStore.cursorMode && searchStore.cursorBlockUUID
      ? searchStore.cursorBlockUUID
      : await getCurrentBlockUUID();
  if (!blockUUID) {
    resetNumber();
    return;
  }

  const block = await logseq.Editor.getBlock(blockUUID);
  if (!block) {
    resetNumber();
    return;
  }

  const cursor =
    searchStore.cursorMode && searchStore.cursorBlockUUID === blockUUID
      ? searchStore.cursorPosition
      : firstNonBlankPosition(block.content);
  const range = resolveOperatorRange(
    block.content,
    cursor,
    command.object,
    getNumber()
  );
  resetNumber();

  const result = applyTextOperator(
    block.content,
    range,
    command.operator
  );
  if (result.selected.length === 0) {
    return;
  }

  writeClipboard(result.selected);
  if (command.operator === "yank") {
    return;
  }

  if (command.operator === "change") {
    const changeContent =
      range.end === block.content.length
        ? deferTrailingWhitespace(result.content)
        : {
            persistedContent: result.content,
            deferredWhitespace: "",
          };
    await logseq.Editor.updateBlock(
      blockUUID,
      changeContent.persistedContent
    );
    searchStore.clearCursor();
    await logseq.Editor.editBlock(blockUUID, {
      pos: Math.min(range.start, changeContent.persistedContent.length),
    });
    if (changeContent.deferredWhitespace) {
      await logseq.Editor.insertAtEditingCursor(
        changeContent.deferredWhitespace
      );
    }
    return;
  }

  await persistNormalModeContent({
    editor: logseq.Editor,
    blockUUID,
    content: result.content,
    cursor: result.cursor,
    restoreCursor: (uuid, content, position) =>
      searchStore.restoreCursor(uuid, content, position),
  });
};

let disposeOperatorSequenceListener: (() => void) | null = null;

export const disposeOperatorSequences = (): void => {
  disposeOperatorSequenceListener?.();
  disposeOperatorSequenceListener = null;
};

export default (logseq: ILSPluginUser) => {
  const settings = getSettings();
  const sequences: OperatorSequence[] = [];
  const normalModeSequences: OperatorSequence[] = [];
  const commandsById = new Map(
    OPERATOR_COMMANDS.map((command) => [command.id, command])
  );

  for (const command of OPERATOR_COMMANDS) {
    if (!beforeActionRegister(command.settingKey)) {
      continue;
    }

    const configured = settings.keyBindings[command.settingKey];
    const bindings = Array.isArray(configured) ? configured : [configured];

    bindings.forEach((binding) => {
      sequences.push({
        commandId: command.id,
        tokens: expandOperatorBinding(
          binding,
          command.object === "inner-word" ||
            command.object === "around-word"
        ),
      });
    });

    logseq.App.registerCommandPalette(
      {
        key: `vim-shortcut-${command.id}`,
        label: command.label,
      },
      async () => {
        if (beforeActionExecute()) {
          await executeOperator(command);
        }
      }
    );
  }

  if (beforeActionRegister("pasteNext")) {
    const configuredPaste = settings.keyBindings.pasteNext;
    const pasteBindings = Array.isArray(configuredPaste)
      ? configuredPaste
      : [configuredPaste];
    pasteBindings.forEach((binding) => {
      sequences.push({
        commandId: "paste-next",
        tokens: expandOperatorBinding(binding, false),
      });
    });
  }
  if (beforeActionRegister("pastePrev")) {
    const configuredPaste = settings.keyBindings.pastePrev;
    const pasteBindings = Array.isArray(configuredPaste)
      ? configuredPaste
      : [configuredPaste];
    pasteBindings.forEach((binding) => {
      sequences.push({
        commandId: "paste-previous",
        tokens: expandOperatorBinding(binding, false),
      });
    });
  }
  if (beforeActionRegister("cut")) {
    const configuredCut = settings.keyBindings.cut;
    const cutBindings = Array.isArray(configuredCut)
      ? configuredCut
      : [configuredCut];
    cutBindings.forEach((binding) => {
      sequences.push({
        commandId: "cut-character",
        tokens: expandOperatorBinding(binding, false),
      });
    });
  }
  if (beforeActionRegister("copyCurrentBlockContent")) {
    const configuredYankLine =
      settings.keyBindings.copyCurrentBlockContent;
    const yankLineBindings = Array.isArray(configuredYankLine)
      ? configuredYankLine
      : [configuredYankLine];
    yankLineBindings.forEach((binding) => {
      sequences.push({
        commandId: "yank-line",
        tokens: expandOperatorBinding(binding, false),
      });
    });
  }
  if (beforeActionRegister("deleteCurrentBlock")) {
    const configuredDeleteLine =
      settings.keyBindings.deleteCurrentBlock;
    const deleteLineBindings = Array.isArray(configuredDeleteLine)
      ? configuredDeleteLine
      : [configuredDeleteLine];
    deleteLineBindings.forEach((binding) => {
      sequences.push({
        commandId: "delete-line",
        tokens: expandOperatorBinding(binding, false),
      });
    });
  }

  const motionBindings = [
    ["move-left", "left"],
    ["move-down", "down"],
    ["move-up", "up"],
    ["move-right", "right"],
    ["move-word-forward", "wordForward"],
    ["move-word-backward", "wordBackward"],
    ["move-word-end", "wordEnd"],
    ["move-line-end", "lineEnd"],
    ["move-first-nonblank", "firstNonBlank"],
    ["move-half-page-down", "halfPageDown"],
    ["move-half-page-up", "halfPageUp"],
  ] as const;
  for (const [commandId, settingKey] of motionBindings) {
    if (!beforeActionRegister(settingKey)) continue;
    const configured = settings.keyBindings[settingKey];
    const bindings = Array.isArray(configured) ? configured : [configured];
    bindings.forEach((binding) => {
      normalModeSequences.push({
        commandId,
        tokens: expandOperatorBinding(binding, false),
      });
    });
  }

  disposeOperatorSequences();
  configureHostCapture([
    ...sequences.flatMap((sequence) => sequence.tokens),
    ..."0123456789",
  ]);
  configureHostNormalModeCapture(
    normalModeSequences.flatMap((sequence) => sequence.tokens)
  );

  let pendingTokens: string[] = [];
  let pendingMotionTokens: string[] = [];
  const clearPending = () => {
    pendingTokens = [];
    pendingMotionTokens = [];
  };
  const withCount = async (
    count: number,
    action: () => Promise<void>
  ): Promise<void> => {
    setModalCountDigits(count > 1 ? String(count) : "");
    try {
      await action();
    } finally {
      resetNumber();
    }
  };
  const dispatchModalCommand = async (
    command: ReturnType<ReturnType<typeof useModalStore>["step"]>["command"],
    event: HostKeydownEvent
  ): Promise<void> => {
    if (!command) return;
    const searchStore = useSearchStore();
    if (command.kind === "escape") {
      const entered = await searchStore.enterNormalMode(event.blockUUID);
      if (!entered) setHostNormalModeActive(false);
      return;
    }
    if (command.kind === "motion") {
      for (let index = 0; index < command.count; index += 1) {
        if (command.motion === "h") await searchStore.moveCursorLeft();
        else if (command.motion === "l") await searchStore.moveCursorRight();
        else if (command.motion === "j") await searchStore.moveCursorDown(event.visibleBlockUUIDs);
        else if (command.motion === "k") await searchStore.moveCursorUp(event.visibleBlockUUIDs);
        else if (command.motion === "w") await searchStore.moveWordForward();
        else if (command.motion === "b") await searchStore.moveWordBackward();
        else if (command.motion === "e") await searchStore.moveWordEnd();
        else if (command.motion === "0") await searchStore.moveLineStart();
        else if (command.motion === "$") await searchStore.moveLineEnd();
        else if (command.motion === "^" && searchStore.cursorBlockUUID) {
          await searchStore.restoreCursor(
            searchStore.cursorBlockUUID,
            searchStore.cursorBlockContent,
            firstNonBlankPosition(searchStore.cursorBlockContent)
          );
        } else if (command.motion === "ctrl+d" || command.motion === "ctrl+u") {
          await searchStore.moveCursorHalfPage(
            event.visibleBlockUUIDs,
            event.viewportBlockUUIDs,
            command.motion === "ctrl+d" ? "down" : "up"
          );
        }
      }
      return;
    }
    if (command.kind === "delete-char") {
      await withCount(command.count, cutAtNormalCursor);
      return;
    }
    if (command.kind === "put") {
      await withCount(command.count, () => putVimRegister(command.before));
      return;
    }
    if (command.kind === "operator") {
      const object =
        command.motion === "iw" ? "inner-word" :
        command.motion === "aw" ? "around-word" :
        command.motion === "w" ? (command.operator === "change" ? "word-end" : "word-forward") :
        command.motion === "e" ? "word-end" :
        command.motion === "$" ? "line-end" :
        command.motion === "line" ? "line" : null;
      const definition = object
        ? OPERATOR_COMMANDS.find(
            (item) => item.operator === command.operator && item.object === object
          )
        : undefined;
      if (definition) await withCount(command.count, () => executeOperator(definition));
    }
  };
  const handleKeydown = async (event: HostKeydownEvent) => {
    const searchStore = useSearchStore();
    const modalStore = useModalStore();
    const step = modalStore.step(keyboardEventToken(event));
    const pending =
      step.state.mode === "operator-pending" ||
      step.state.mode === "char-pending";
    setHostCaptureAll(pending);
    if (step.command) {
      clearPending();
      await dispatchModalCommand(step.command, event);
      return;
    }
    if (pending || step.state.countDigits || step.state.pendingPrefix) return;

    if (
      pendingTokens.length === 0 &&
      !event.isComposing &&
      !event.repeat &&
      !isTextEntryEvent(event) &&
      !event.textEntryActive
    ) {
      const motionResult = advanceOperatorSequence(
        normalModeSequences,
        pendingMotionTokens,
        keyboardEventToken(event)
      );
      pendingMotionTokens = motionResult.pendingTokens;
      if (motionResult.status === "pending") {
        return;
      }
      if (motionResult.status === "matched") {
        pendingMotionTokens = [];
        if (motionResult.commandId === "move-left") {
          await searchStore.moveCursorLeft();
        } else if (motionResult.commandId === "move-down") {
          await searchStore.moveCursorDown(event.visibleBlockUUIDs);
        } else if (motionResult.commandId === "move-up") {
          await searchStore.moveCursorUp(event.visibleBlockUUIDs);
        } else if (motionResult.commandId === "move-right") {
          await searchStore.moveCursorRight();
        } else if (motionResult.commandId === "move-word-forward") {
          await searchStore.moveWordForward();
        } else if (motionResult.commandId === "move-half-page-down") {
          await searchStore.moveCursorHalfPage(
            event.visibleBlockUUIDs,
            event.viewportBlockUUIDs,
            "down"
          );
        } else if (motionResult.commandId === "move-half-page-up") {
          await searchStore.moveCursorHalfPage(
            event.visibleBlockUUIDs,
            event.viewportBlockUUIDs,
            "up"
          );
        }
        return;
      }
      pendingMotionTokens = [];
    }

    if (!shouldCaptureNormalModeKey({
      composing: event.isComposing,
      repeat: event.repeat,
      visualMode: searchStore.visualMode,
      textEntryActive: isTextEntryEvent(event) || event.textEntryActive,
    })) {
      clearPending();
      return;
    }

    if (!beforeActionExecute()) {
      clearPending();
      return;
    }

    const result = advanceOperatorSequence(
      sequences,
      pendingTokens,
      keyboardEventToken(event)
    );
    if (result.consume) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }

    pendingTokens = result.pendingTokens;
    if (result.status === "pending") {
      return;
    }
    clearPending();

    if (result.status === "matched" && result.commandId) {
      if (result.commandId === "paste-next") {
        await putVimRegister(false);
        return;
      }
      if (result.commandId === "paste-previous") {
        await putVimRegister(true);
        return;
      }
      if (result.commandId === "cut-character") {
        await cutAtNormalCursor();
        return;
      }
      if (result.commandId === "yank-line") {
        await yankCurrentBlockContent();
        return;
      }
      if (result.commandId === "delete-line") {
        const count = getNumber();
        resetNumber();
        await deleteCurrentBlock(count);
        return;
      }
      const command = commandsById.get(result.commandId);
      if (command) {
        await executeOperator(command);
      }
    }
  };

  const removeListener = addHostKeydownListener(handleKeydown);
  disposeOperatorSequenceListener = () => {
    clearPending();
    removeListener();
  };
};
