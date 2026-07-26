import { ILSPluginUser } from "@logseq/libs/dist/LSPlugin";
import {
  debug,
  getSettings,
  beforeActionExecute,
  beforeActionRegister,
} from "@/common/funcs";
import { useSearchStore } from "@/stores/search";

export default (logseq: ILSPluginUser) => {
  // Check if this keybinding is disabled
  if (!beforeActionRegister("nextNewBlock")) {
    return;
  }

  const settings = getSettings();

  const bindings = Array.isArray(settings.keyBindings.nextNewBlock)
    ? settings.keyBindings.nextNewBlock
    : [settings.keyBindings.nextNewBlock];

  bindings.forEach((binding, index) => {
    logseq.App.registerCommandPalette(
      {
        key: "vim-shortcut-next-new-block-" + index,
        label: "Create new next block",
      },
      async () => {
        // Check before action hook
        if (!beforeActionExecute()) {
          return;
        }

        debug("create new next block");
        await useSearchStore().beginInsert("o");
      }
    );
  });
};
