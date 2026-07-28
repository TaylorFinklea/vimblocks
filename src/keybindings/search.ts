import { BlockEntity, ILSPluginUser } from "@logseq/libs/dist/LSPlugin";
import {
  clearCurrentPageBlocksHighlight,
  debug,
  getSettings,
  beforeActionExecute,
  beforeActionRegister,
} from "@/common/funcs";
import { useSearchStore } from "@/stores/search";

export default (logseq: ILSPluginUser) => {
  // Check if this keybinding is disabled
  if (!beforeActionRegister("search")) {
    return;
  }

  const settings = getSettings();

  // Search Prev
  const searchCleanupBindings = Array.isArray(
    settings.keyBindings.searchCleanup
  )
    ? settings.keyBindings.searchCleanup
    : [settings.keyBindings.searchCleanup];

  searchCleanupBindings.forEach((binding, index) => {
    logseq.App.registerCommandPalette(
      {
        key: "vim-shortcut-search-cleanup-" + index,
        label: "Search Cleanup",
        // `s` is not a host-captured token, so this is the only route to
        // `s q`. The parity wave stripped keybindings from this module for
        // `/`, which the modal engine took over, and took this one with it.
        keybinding: {
          mode: "non-editing",
          binding,
        },
      },
      async () => {
        // Check before action hook
        if (!beforeActionExecute()) {
          return;
        }

        debug("Search Cleanup");
        await clearCurrentPageBlocksHighlight();
        // Clear cursor mode as well
        const searchStore = useSearchStore();
        searchStore.clearCursor();
      }
    );
  });

  const searchBindings = Array.isArray(settings.keyBindings.search)
    ? settings.keyBindings.search
    : [settings.keyBindings.search];

  searchBindings.forEach((binding, index) => {
    logseq.App.registerCommandPalette(
      {
        key: "vim-shortcut-search-" + index,
        label: "Search",
      },
      async () => {
        // Check before action hook
        if (!beforeActionExecute()) {
          return;
        }

        debug("Search");
        const searchStore = useSearchStore();
        searchStore.emptyInput();
        searchStore.show();
        logseq.showMainUI({
          autoFocus: true,
        });

        await clearCurrentPageBlocksHighlight();

        const $input = document.querySelector(
          ".search-input input"
        ) as HTMLInputElement;
        setTimeout(() => {
          $input && $input.focus();
        }, 500);
      }
    );
  });

  // Search Next
  const searchNextBindings = Array.isArray(settings.keyBindings.searchNext)
    ? settings.keyBindings.searchNext
    : [settings.keyBindings.searchNext];

  searchNextBindings.forEach((binding, index) => {
    logseq.App.registerCommandPalette(
      {
        key: "vim-shortcut-search-next-" + index,
        label: "Search Next",
      },
      async () => {
        // Check before action hook
        if (!beforeActionExecute()) {
          return;
        }

        debug("Search Next");
        await clearCurrentPageBlocksHighlight();
        const searchStore = useSearchStore();
        searchStore.searchNext();
      }
    );
  });

  // Search Prev
  const searchPrevBindings = Array.isArray(settings.keyBindings.searchPrev)
    ? settings.keyBindings.searchPrev
    : [settings.keyBindings.searchPrev];

  searchPrevBindings.forEach((binding, index) => {
    logseq.App.registerCommandPalette(
      {
        key: "vim-shortcut-search-prev-" + index,
        label: "Search Prev",
      },
      async () => {
        // Check before action hook
        if (!beforeActionExecute()) {
          return;
        }

        debug("Search Prev");
        await clearCurrentPageBlocksHighlight();
        const searchStore = useSearchStore();
        searchStore.searchPrev();
      }
    );
  });
};
