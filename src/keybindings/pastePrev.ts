import { ILSPluginUser } from "@logseq/libs/dist/LSPlugin";
import {
  debug,
  getSettings,
  beforeActionExecute,
  beforeActionRegister,
} from "@/common/funcs";
import { putVimRegister } from "@/keybindings/pasteNext";

export default (logseq: ILSPluginUser) => {
  // Check if this keybinding is disabled
  if (!beforeActionRegister("pastePrev")) {
    return;
  }

  const settings = getSettings();

  const bindings = Array.isArray(settings.keyBindings.pastePrev)
    ? settings.keyBindings.pastePrev
    : [settings.keyBindings.pastePrev];

  bindings.forEach((binding, index) => {
    logseq.App.registerCommandPalette(
      {
        key: "vim-shortcut-paste-prev-" + index,
        label: "Paste to prev block",
      },
      async () => {
        // Check before action hook
        if (!beforeActionExecute()) {
          return;
        }

        debug("Paste to prev block");
        await putVimRegister(true);
      }
    );
  });
};
