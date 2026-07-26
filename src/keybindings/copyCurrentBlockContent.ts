import { ILSPluginUser } from "@logseq/libs/dist/LSPlugin";
import {
  debug,
  getCurrentBlockUUID,
  getSettings,
  writeClipboard,
  beforeActionExecute,
  beforeActionRegister,
} from "@/common/funcs";
import { useSearchStore } from "@/stores/search";

export const yankCurrentBlockContent = async (): Promise<void> => {
  const searchStore = useSearchStore();
  let copyText = "";
  let wasInVisualMode = false;

  const visualSelection = searchStore.getVisualSelection();
  if (visualSelection?.text) {
    copyText = visualSelection.text;
    wasInVisualMode = true;
  } else {
    const blockUUID = await getCurrentBlockUUID();
    if (blockUUID) {
      const block = await logseq.Editor.getBlock(blockUUID);
      if (block?.content) {
        copyText = block.content;
      }
    }
  }

  if (!copyText) {
    return;
  }

  writeClipboard(
    copyText,
    wasInVisualMode ? "characterwise" : "linewise"
  );
  if (wasInVisualMode) {
    await searchStore.toggleVisualMode();
  }
};

export default (logseq: ILSPluginUser) => {
  // Check if this keybinding is disabled
  if (!beforeActionRegister("copyCurrentBlockContent")) {
    return;
  }

  const settings = getSettings();

  const bindings = Array.isArray(settings.keyBindings.copyCurrentBlockContent)
    ? settings.keyBindings.copyCurrentBlockContent
    : [settings.keyBindings.copyCurrentBlockContent];

  bindings.forEach((binding, index) => {
    logseq.App.registerCommandPalette(
      {
        key: "vim-shortcut-copy-current-block-content-" + index,
        label: "Copy current block content",
      },
      async () => {
        // Check before action hook
        if (!beforeActionExecute()) {
          return;
        }

        debug("Copy current block contents");

        await yankCurrentBlockContent();
      }
    );
  });
};
