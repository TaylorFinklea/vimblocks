import { ILSPluginUser } from "@logseq/libs/dist/LSPlugin";
import {
  debug,
  getCurrentBlockUUID,
  getSettings,
  writeClipboard,
  beforeActionExecute,
  beforeActionRegister,
} from "@/common/funcs";
import {
  applyTextOperator,
  firstNonBlankPosition,
} from "@/runtime/text-objects";
import { useSearchStore } from "@/stores/search";
import { persistNormalModeContent } from "@/runtime/normal-mode-mutation";

const deleteTextAndCopy = async (
  blockUUID: string,
  deleteStart: number,
  deleteLength: number,
  forceCursorRestore = false
): Promise<void> => {
  const block = await logseq.Editor.getBlock(blockUUID);
  if (block) {
    const deleteEnd = deleteStart + deleteLength;
    const result = applyTextOperator(
      block.content,
      { start: deleteStart, end: deleteEnd },
      "delete"
    );
    writeClipboard(result.selected);

    const searchStore = useSearchStore();
    const restoreNormalCursor =
      forceCursorRestore ||
      (searchStore.cursorMode &&
        searchStore.cursorBlockUUID === blockUUID);
    if (restoreNormalCursor) {
      await persistNormalModeContent({
        editor: logseq.Editor,
        blockUUID,
        content: result.content,
        cursor: result.cursor,
        restoreCursor: (uuid, content, position) =>
          searchStore.restoreCursor(uuid, content, position),
      });
    } else {
      await logseq.Editor.updateBlock(blockUUID, result.content);
    }
  }
};

export const cutAtNormalCursor = async (): Promise<void> => {
  const blockUUID = await getCurrentBlockUUID();
  if (!blockUUID) {
    return;
  }

  const block = await logseq.Editor.getBlock(blockUUID);
  if (!block?.content) {
    return;
  }

  const searchStore = useSearchStore();
  const cursor =
    searchStore.cursorMode &&
    searchStore.cursorBlockUUID === blockUUID
      ? searchStore.cursorPosition
      : firstNonBlankPosition(block.content);
  if (cursor < block.content.length) {
    await deleteTextAndCopy(blockUUID, cursor, 1, true);
  }
};

export default (logseq: ILSPluginUser) => {
  // Check if this keybinding is disabled
  if (!beforeActionRegister("cut")) {
    return;
  }

  const settings = getSettings();

  const bindings = Array.isArray(settings.keyBindings.cut)
    ? settings.keyBindings.cut
    : [settings.keyBindings.cut];

  bindings.forEach((binding, index) => {
    logseq.App.registerCommandPalette(
      {
        key: "vim-shortcut-cut-" + index,
        label: "Cut",
      },
      async () => {
        // Check before action hook
        if (!beforeActionExecute()) {
          return;
        }

        debug("cut");

        const blockUUID = await getCurrentBlockUUID();
        if (blockUUID) {
          const searchStore = useSearchStore();
          const currentMatch = searchStore.getCurrentMatch();

          // Priority 1: Visual mode selection
          if (
            searchStore.visualMode &&
            searchStore.cursorBlockUUID === blockUUID
          ) {
            const selection = searchStore.getVisualSelection();
            if (selection) {
              const length = selection.end - selection.start + 1;
              await deleteTextAndCopy(blockUUID, selection.start, length);
              searchStore.exitVisualMode();
              return;
            }
          }

          // Priority 2: Search mode - cut the search match
          if (
            currentMatch &&
            currentMatch.uuid === blockUUID &&
            searchStore.input
          ) {
            await deleteTextAndCopy(
              blockUUID,
              currentMatch.matchOffset,
              searchStore.input.length
            );
            return;
          }

          // Priority 3: Cursor mode - cut single character at cursor position
          if (
            searchStore.cursorMode &&
            searchStore.cursorBlockUUID === blockUUID
          ) {
            const pos = searchStore.cursorPosition;
            const block = await logseq.Editor.getBlock(blockUUID);
            if (block && pos >= 0 && pos < block.content.length) {
              await deleteTextAndCopy(blockUUID, pos, 1);
              return;
            }
          }
        }

        // Priority 4: Original behavior - cut first character of block(s)
        const selected = await logseq.Editor.getSelectedBlocks();
        if (selected.length > 1) {
          for (let block of selected) {
            if (block.content.length > 0) {
              const content = block.content.substring(1);
              writeClipboard(block.content.charAt(0));
              await logseq.Editor.updateBlock(block.uuid, content);
            }
          }
        } else {
          const block = await logseq.Editor.getCurrentBlock();
          if (block && block.content.length > 0) {
            const content = block.content.substring(1);
            writeClipboard(block.content.charAt(0));
            await logseq.Editor.updateBlock(block.uuid, content);
          }
        }
      }
    );
  });
};
