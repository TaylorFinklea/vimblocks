import { ILSPluginUser } from "@logseq/libs/dist/LSPlugin";
import {
  debug,
  getCurrentBlockUUID,
  getSettings,
  readClipboard,
  beforeActionExecute,
  beforeActionRegister,
} from "@/common/funcs";

export const pasteNextBlock = async (): Promise<void> => {
  const blockUUID = await getCurrentBlockUUID();
  if (!blockUUID) {
    return;
  }

  const block = await logseq.Editor.getBlock(blockUUID);
  const content = readClipboard();
  if (block?.uuid && content) {
    await logseq.Editor.insertBlock(block.uuid, content, {
      before: false,
      sibling: true,
    });
  }
};

export default (logseq: ILSPluginUser) => {
  // Check if this keybinding is disabled
  if (!beforeActionRegister("pasteNext")) {
    return;
  }

  const settings = getSettings();

  const bindings = Array.isArray(settings.keyBindings.pasteNext)
    ? settings.keyBindings.pasteNext
    : [settings.keyBindings.pasteNext];

  bindings.forEach((binding, index) => {
    logseq.App.registerCommandPalette(
      {
        key: "vim-shortcut-paste-next-" + index,
        label: "Paste to next block",
        keybinding: {
          mode: "non-editing",
          binding,
        },
      },
      async () => {
        // Check before action hook
        if (!beforeActionExecute()) {
          return;
        }

        debug("Paste to next block");

        await pasteNextBlock();
      }
    );
  });
};
