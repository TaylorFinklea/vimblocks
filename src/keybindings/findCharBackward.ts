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
  if (!beforeActionRegister("findCharBackward")) {
    return;
  }

  const settings = getSettings();

  const bindings = Array.isArray(settings.keyBindings.findCharBackward)
    ? settings.keyBindings.findCharBackward
    : [settings.keyBindings.findCharBackward];

  bindings.forEach((binding, index) => {
    logseq.App.registerCommandPalette(
      {
        key: "vim-shortcut-find-char-backward-" + index,
        label: "Find character backward (F)",
      },
      async () => {
        // Check before action hook
        if (!beforeActionExecute()) {
          return;
        }

        debug("Find character backward");
        const searchStore = useSearchStore();
        searchStore.startCharSearch("F");
      }
    );
  });

  const tillBindings = Array.isArray(settings.keyBindings.tillCharBackward)
    ? settings.keyBindings.tillCharBackward
    : [settings.keyBindings.tillCharBackward];
  tillBindings.forEach((_binding, index) => {
    logseq.App.registerCommandPalette(
      {
        key: "vim-shortcut-till-char-backward-" + index,
        label: "Till character backward (T)",
      },
      async () => {
        if (!beforeActionExecute()) return;
        debug("Till character backward");
        useSearchStore().startCharSearch("T");
      }
    );
  });
};
