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
  if (!beforeActionRegister("insertBefore")) {
    return;
  }

  const settings = getSettings();

  const bindings = Array.isArray(settings.keyBindings.insertBefore)
    ? settings.keyBindings.insertBefore
    : [settings.keyBindings.insertBefore];

  bindings.forEach((binding, index) => {
    // Determine if this binding has shift modifier (uppercase)
    const isUpperCase = binding.toLowerCase().includes("shift+");
    const key = binding; // Use the actual binding as the key

    logseq.App.registerCommandPalette(
      {
        key: "vim-shortcut-insert-before-" + index,
        label: isUpperCase
          ? `Enter insert mode at line start (${binding})`
          : `Enter insert mode before cursor (${binding}) or match start if searching`,
      },
      async () => {
        // Check before action hook
        if (!beforeActionExecute()) {
          return;
        }

        debug(`Insert before (${key})`);
        await useSearchStore().beginInsert(isUpperCase ? "I" : "i");
      }
    );
  });
};
