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
  if (!beforeActionRegister("insert")) {
    return;
  }

  const settings = getSettings();

  const bindings = Array.isArray(settings.keyBindings.insert)
    ? settings.keyBindings.insert
    : [settings.keyBindings.insert];

  bindings.forEach((binding, index) => {
    // Determine if this binding has shift modifier (uppercase)
    const isUpperCase = binding.toLowerCase().includes("shift+");
    const key = binding; // Use the actual binding as the key

    logseq.App.registerCommandPalette(
      {
        key: "vim-shortcut-insert-" + index,
        label: isUpperCase
          ? `Enter insert mode at line end (${binding})`
          : `Enter insert mode after cursor (${binding}) or match end if searching`,
      },
      async () => {
        // Check before action hook
        if (!beforeActionExecute()) {
          return;
        }

        debug(`Insert (${key})`);
        await useSearchStore().beginInsert(isUpperCase ? "A" : "a");
      }
    );
  });
};
