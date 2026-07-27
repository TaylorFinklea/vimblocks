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
  if (!beforeActionRegister("findChar")) {
    return;
  }

  const settings = getSettings();

  const bindings = Array.isArray(settings.keyBindings.findChar)
    ? settings.keyBindings.findChar
    : [settings.keyBindings.findChar];

  bindings.forEach((binding, index) => {
    logseq.App.registerCommandPalette(
      {
        key: "vim-shortcut-find-char-" + index,
        label: "Find character (f)",
      },
      async () => {
        // Check before action hook
        if (!beforeActionExecute()) {
          return;
        }

        debug("Find character");
        const searchStore = useSearchStore();
        searchStore.startCharSearch("f");
      }
    );
  });

  const tillBindings = Array.isArray(settings.keyBindings.tillChar)
    ? settings.keyBindings.tillChar
    : [settings.keyBindings.tillChar];
  tillBindings.forEach((_binding, index) => {
    logseq.App.registerCommandPalette(
      {
        key: "vim-shortcut-till-char-" + index,
        label: "Till character (t)",
      },
      async () => {
        if (!beforeActionExecute()) return;
        debug("Till character");
        useSearchStore().startCharSearch("t");
      }
    );
  });
};
