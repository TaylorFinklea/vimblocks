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
  if (!beforeActionRegister("prevNewBlock")) {
    return;
  }

  const settings = getSettings();

  const bindings = Array.isArray(settings.keyBindings.prevNewBlock)
    ? settings.keyBindings.prevNewBlock
    : [settings.keyBindings.prevNewBlock];

  bindings.forEach((binding, index) => {
    logseq.App.registerCommandPalette(
      {
        key: "vim-shortcut-prev-new-block-" + index,
        label: "Create new prev block",
      },
      async () => {
        // Check before action hook
        if (!beforeActionExecute()) {
          return;
        }

        debug("Create new prev block");
        await useSearchStore().beginInsert("O");
      }
    );
  });
};
