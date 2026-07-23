import { ILSPluginUser } from "@logseq/libs/dist/LSPlugin";

import {
  beforeActionExecute,
  beforeActionRegister,
  getCurrentBlockUUID,
  getNumber,
  getSettings,
  resetNumber,
  setWaitingForInput,
  writeClipboard,
} from "@/common/funcs";
import type { DefaultSettingsType } from "@/common/funcs";
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
  const blockUUID = await getCurrentBlockUUID();
  if (!blockUUID) {
    resetNumber();
    return;
  }

  const block = await logseq.Editor.getBlock(blockUUID);
  if (!block) {
    resetNumber();
    return;
  }

  const searchStore = useSearchStore();
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

  await logseq.Editor.updateBlock(blockUUID, result.content);
  await logseq.Editor.selectBlock(blockUUID);
  await searchStore.restoreCursor(
    blockUUID,
    result.content,
    result.cursor
  );
};

const waitForWordObject = (
  command: OperatorCommandDefinition
): void => {
  const handleKeyPress = async (event: KeyboardEvent) => {
    if (event.key.length > 1 && event.key !== "Escape") {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    top!.document.removeEventListener("keydown", handleKeyPress, true);
    setWaitingForInput(false);

    if (event.key === "Escape") {
      resetNumber();
      return;
    }
    if (event.key.toLowerCase() !== "w") {
      resetNumber();
      logseq.UI.showMsg(`Unsupported text object: ${event.key}`, "warning");
      return;
    }

    await executeOperator(command);
  };

  const cleanup = () => {
    top!.document.removeEventListener("keydown", handleKeyPress, true);
  };
  setWaitingForInput(true, cleanup);
  top!.document.addEventListener("keydown", handleKeyPress, true);
};

export default (logseq: ILSPluginUser) => {
  const settings = getSettings();

  for (const command of OPERATOR_COMMANDS) {
    if (!beforeActionRegister(command.settingKey)) {
      continue;
    }

    const configured = settings.keyBindings[command.settingKey];
    const bindings = Array.isArray(configured) ? configured : [configured];

    bindings.forEach((binding, index) => {
      logseq.App.registerCommandPalette(
        {
          key: `vim-shortcut-${command.id}-${index}`,
          label: command.label,
          keybinding: {
            mode: "non-editing",
            binding,
          },
        },
        async () => {
          if (!beforeActionExecute()) {
            return;
          }

          if (
            command.object === "inner-word" ||
            command.object === "around-word"
          ) {
            waitForWordObject(command);
            return;
          }

          await executeOperator(command);
        }
      );
    });
  }
};
