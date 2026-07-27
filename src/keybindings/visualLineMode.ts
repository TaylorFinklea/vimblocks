import { ILSPluginUser } from "@logseq/libs/dist/LSPlugin";
import {
  debug,
  getSettings,
  beforeActionExecute,
  beforeActionRegister,
  clearCurrentPageBlocksHighlight,
} from "@/common/funcs";
import { useSearchStore } from "@/stores/search";

export default (logseq: ILSPluginUser) => {
  // Check if this keybinding is disabled
  if (!beforeActionRegister("visualLineMode")) {
    return;
  }

  const settings = getSettings();

  const bindings = Array.isArray(settings.keyBindings.visualLineMode)
    ? settings.keyBindings.visualLineMode
    : [settings.keyBindings.visualLineMode];

  bindings.forEach((_binding, index) => {
    logseq.App.registerCommandPalette(
      {
        key: "vim-shortcut-visual-line-mode-" + index,
        label: "Visual line selection mode (select entire line)",
      },
      async () => {
        // Check before action hook
        if (!beforeActionExecute()) {
          return;
        }

        debug("Visual line selection mode");

        const searchStore = useSearchStore();

        // Must be in cursor mode to enter visual mode
        if (!searchStore.cursorMode) {
          logseq.UI.showMsg("Visual line mode requires cursor mode", "warning");
          return;
        }

        if (
          searchStore.visualMode &&
          searchStore.visualKind === "linewise"
        ) {
          // Exit visual mode and restore to single cursor
          searchStore.exitVisualMode();

          // Clear highlight
          await clearCurrentPageBlocksHighlight();
          await searchStore.moveCursorRight();
          await searchStore.moveCursorLeft();
        } else {
          await searchStore.enterVisualMode(
            "linewise",
            searchStore.renderedBlockUUIDs
          );
        }
      }
    );
  });
};
