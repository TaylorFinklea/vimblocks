import { ILSPluginUser } from "@logseq/libs/dist/LSPlugin";

import {
  beforeActionExecute,
  beforeActionRegister,
  getSettings,
} from "@/common/funcs";
import { firstNonBlankPosition } from "@/runtime/text-objects";
import { useSearchStore } from "@/stores/search";

export default (logseq: ILSPluginUser) => {
  if (!beforeActionRegister("firstNonBlank")) {
    return;
  }

  const settings = getSettings();
  const configured = settings.keyBindings.firstNonBlank;
  const bindings = Array.isArray(configured) ? configured : [configured];

  bindings.forEach((binding, index) => {
    logseq.App.registerCommandPalette(
      {
        key: `vim-shortcut-first-nonblank-${index}`,
        label: "Vim: Move to first nonblank character (^)",
      },
      async () => {
        if (!beforeActionExecute()) {
          return;
        }

        const block = await logseq.Editor.getCurrentBlock();
        if (!block) {
          return;
        }

        await useSearchStore().restoreCursor(
          block.uuid,
          block.content,
          firstNonBlankPosition(block.content)
        );
      }
    );
  });
};
