import "@logseq/libs";
import "./style.css";
import "element-plus/dist/index.css";

import { createApp } from "vue";
import App from "./App.vue";

import {
  initSettings,
  loadMarks,
  setHotkeys,
  getCommandFromHistoryBack,
  getCommandFromHistoryForward,
  hideMainUI,
  cancelInputListener,
  getSettings,
  invalidateSettingsCache,
} from "./common/funcs";
import { createPinia } from "pinia";

import { commandList, useCommandStore } from "./stores/command";
import { useEmojiStore } from "@/stores/emoji";
import { useColorStore } from "./stores/color";
import {
  disposeSearchEffects,
  useSearchStore,
} from "./stores/search";
import { useMarkStore } from "./stores/mark";

import { SettingSchemaDesc } from "@logseq/libs/dist/LSPlugin.user";
import { marks } from "./commands/mark";
import { registerOwnedCommands } from "./command-registry";
import { DisposableRegistry } from "./runtime/disposable-registry";
import { disposeOperatorSequences } from "./keybindings/operators";
import {
  registerOpenPdfCommand,
  type OpenPdfApi,
} from "./open-pdf-command";
import {
  addHostKeydownListener,
  addHostNormalModeListener,
  addHostThemeListener,
  installHostBridge,
  requestHostTheme,
  type HostTheme,
  type HostKeydownEvent,
} from "./runtime/host-bridge";
import {
  createModeIndicator,
  resolveModeIndicator,
} from "./runtime/mode-indicator";
import {
  cursorHighlightStyle,
  highlightPseudoStyle,
} from "./runtime/cursor-style";
import { registerDbTaskCaptureCommand } from "./db-task-capture-command";
import { showDbTaskCaptureMainUI } from "./runtime/db-task-capture";
import { useDbTaskCaptureStore } from "./stores/db-task-capture";
import { useModalStore } from "./stores/modal";

const defineSettings: SettingSchemaDesc[] = [
  {
    key: "showRecentEmojis",
    title: "Show recent emojis by default",
    description: "Show recent emojis by default. Needs window reload.",
    default: false,
    type: "boolean",
  },
  {
    key: "openPdfShortcut",
    type: "string",
    default: "mod+alt+p",
    title: "Open selected PDF inline",
    description:
      "Logseq keybinding notation. Leave blank to keep the command palette-only.",
  },
  {
    key: "cursorColor",
    type: "string",
    default: "#ffff00",
    title: "Vim cursor color",
    description:
      "Hex color for the normal-mode character cursor. Reload Logseq after changing it.",
  },
  {
    key: "dbTaskCaptureShortcut",
    type: "string",
    default: "ctrl+shift+t",
    title: "Capture DB task",
    description:
      "Logseq keybinding notation. Leave blank to keep the capture command palette-only.",
  },
  {
    key: "vimBoundaryProfile",
    type: "enum",
    default: "logseq-first",
    title: "Vim block boundary behavior",
    description:
      "Vim-first treats rendered blocks as lines in one buffer; Logseq-first keeps character operations block-local.",
    enumChoices: ["logseq-first", "vim-first"],
    enumPicker: "select",
  },
];

logseq.useSettingsSchema(defineSettings);

async function main() {
  const lifecycle = new DisposableRegistry();
  lifecycle.add(await installHostBridge());
  const applyHostTheme = (theme: HostTheme) => {
    const root = document.documentElement;
    for (const [name, value] of Object.entries(theme.tokens)) {
      if (value) root.style.setProperty(`--vb-${name}`, value);
    }
    if (theme.colorScheme) {
      root.style.setProperty("--vb-color-scheme", theme.colorScheme);
    }
    if (theme.fontFamily) {
      root.style.setProperty("--vb-font-family", theme.fontFamily);
    }
    if (theme.radius) {
      root.style.setProperty("--vb-radius", theme.radius);
    }
  };
  lifecycle.add(addHostThemeListener(applyHostTheme));
  requestHostTheme();

  // settings
  initSettings();

  // Inject CSS for vim-shortcuts-highlight to Logseq main page
  logseq.provideStyle(
    cursorHighlightStyle(getSettings().cursorColor) +
      highlightPseudoStyle(getSettings().cursorColor)
  );

  logseq.provideModel({
    async openMarks() {
      const data1 = await logseq.Editor.getCurrentBlock();
      const data2 = await logseq.Editor.getSelectedBlocks();
      console.log("Current block:", data1);
      console.log("Selected blocks:", data2);
      const commandStore = useCommandStore();
      commandStore.hide();
      logseq.showMainUI({
        autoFocus: false,
      });
      marks();
    },
  });

  // Register toolbar icon for marks
  logseq.App.registerUIItem("toolbar", {
    key: "vim-shortcuts-marks",
    template: `
      <a class="button" data-on-click="openMarks" title="Open Marks" style="font-size: 18px">
        <i class="ti ti-bookmark" style=""></i>
      </a>
    `,
  });

  // setup vue
  const app = createApp(App);
  app.use(createPinia());
  app.mount("#app");
  const modalStore = useModalStore();
  const searchStore = useSearchStore();
  const modeIndicator = createModeIndicator(logseq);
  lifecycle.add(modeIndicator.dispose);
  let hostNormalModeActive = false;
  const syncModeIndicator = () => {
    modeIndicator.setMode(resolveModeIndicator({
      normalModeActive: hostNormalModeActive,
      insertSessionActive: Boolean(searchStore.insertSession),
      visualMode: searchStore.visualMode,
      visualKind: searchStore.visualKind,
    }));
  };
  lifecycle.add(searchStore.$subscribe(syncModeIndicator));
  lifecycle.add(addHostNormalModeListener((active) => {
    hostNormalModeActive = active;
    syncModeIndicator();
  }));
  modalStore.setProfile(getSettings().vimBoundaryProfile);
  lifecycle.add(
    logseq.onSettingsChanged(() => {
      invalidateSettingsCache();
      modalStore.setProfile(getSettings().vimBoundaryProfile);
    })
  );

  const emojiStore = useEmojiStore();
  emojiStore.initPicker();

  registerOwnedCommands(logseq);
  lifecycle.add(
    registerOpenPdfCommand(logseq as unknown as OpenPdfApi)
  );
  const captureStore = useDbTaskCaptureStore();
  lifecycle.add(
    registerDbTaskCaptureCommand(logseq, {
      getCursorState: () => {
        return {
          cursorMode: searchStore.cursorMode,
          cursorBlockUUID: searchStore.cursorBlockUUID,
        };
      },
      openCapture: async (anchorUUID) => {
        requestHostTheme();
        captureStore.show(anchorUUID);
        await showDbTaskCaptureMainUI(logseq, document, window);
        captureStore.requestFocus();
      },
    })
  );

  // load marks
  await loadMarks();
  const markStore = useMarkStore();
  markStore.reload();

  // reload marks when graph changes
  lifecycle.add(logseq.App.onCurrentGraphChanged(async () => {
    modalStore.resetPending();
    useSearchStore().clearCursor();
    await loadMarks();
    markStore.reload();
  }));

  // a cursor left on another page is stale once the route changes
  lifecycle.add(logseq.App.onRouteChanged(() => {
    modalStore.resetPending();
    useSearchStore().clearCursor();
  }));

  // setup ui hotkeys
  lifecycle.add(setHotkeys(logseq));

  const colorStore = useColorStore();

  const $searchInput = document.querySelector(
    ".search-input input"
  ) as HTMLInputElement;

  const $commandInput = document.querySelector(
    ".command-input input"
  ) as HTMLInputElement;
  const $popper = document.querySelector(
    ".el-autocomplete__popper"
  ) as HTMLElement;
  const $run = document.querySelector(".command-run") as HTMLButtonElement;
  const handleCommandClick = (e) => {
    setTimeout(() => {
      $commandInput && $commandInput.focus();
    }, 100);
    e.stopPropagation();
    return false;
  };

  const handleCommandKeyup = async (e) => {
    const commandStore = useCommandStore();
    if (e.keyCode === 38 || e.code === "ArrowUp") {
      if ($popper.style.display === "none") {
        e.stopPropagation();
        const command = getCommandFromHistoryBack();
        commandStore.setInput(command);
      }
    } else if (e.keyCode === 40 || e.code === "ArrowDown") {
      if ($popper.style.display === "none") {
        const command = getCommandFromHistoryForward();
        e.stopPropagation();
        commandStore.setInput(command);
      }
    } else if (e.keyCode === 27 || e.code === "Escape") {
      e.stopPropagation();
      commandStore.emptyInput();
      hideMainUI();
    } else if (e.keyCode === 13 || e.code === "Enter") {
      e.stopPropagation();
      if ($commandInput && $commandInput.value) {
        $run.click();
      }
    }
    // console.log(e);
  };

  const handleCommandKeydown = (e) => {
    const commandStore = useCommandStore();
    if (e.keyCode === 9 || e.code === "Tab") {
      e.preventDefault();
      e.stopPropagation();
      const keyword = commandStore.input;
      const findCommand = commandList.filter((c) => {
        return c.value.toLowerCase().startsWith(keyword.toLowerCase());
      });

      if (findCommand.length > 0) {
        if (findCommand.length === 1) {
          commandStore.setInput(findCommand[0].value);
        }
      } else {
        // not find
        const splitKeyword = keyword.split(" ");
        if (splitKeyword.length > 1) {
          const lastWord = splitKeyword[splitKeyword.length - 1];
          const subKeyword = splitKeyword[0];

          switch (subKeyword) {
            case "bg":
              const findColor = Object.keys(colorStore.namedColors).filter(
                (color) => color.startsWith(lastWord.toLowerCase())
              );
              if (findColor.length > 0) {
                if (findColor.length === 1) {
                  commandStore.setInput(
                    splitKeyword.slice(0, -1).join(" ") + " " + findColor[0]
                  );
                }
              }
              break;

            case "go":
            case "go!":
              const tokens = [
                "@today",
                "@yesterday",
                "@tomorrow",
                "@prev",
                "@next",
                "@back",
                "@forward",
                "@index",
              ];
              const findLastToken = tokens.filter((token) => {
                return token.toLowerCase().startsWith(lastWord.toLowerCase());
              });
              if (findLastToken.length > 0) {
                if (findLastToken.length === 1) {
                  commandStore.setInput(
                    splitKeyword.slice(0, -1).join(" ") + " " + findLastToken[0]
                  );
                }
              }
              break;
          }
        }
      }
    }
  };

  const handleSearchKeyup = async (e) => {
    const searchStore = useSearchStore();
    if (e.keyCode === 27 || e.code === "Escape") {
      e.stopPropagation();
      searchStore.emptyInput();
      hideMainUI();
    } else if (e.keyCode === 13 || e.code === "Enter") {
      e.stopPropagation();
      const searchStore = useSearchStore();
      searchStore.search(true);
    }
    // console.log(e);
  };

  // Global keydown handler for character search (f/t commands)
  const handleGlobalKeydown = async (e: HostKeydownEvent) => {
    const searchStore = useSearchStore();

    if (searchStore.waitingForChar) {
      // The host computes this; a relayed event carries no usable target, so
      // re-deriving it here silently evaluated to false and this branch never
      // ran. Escape is forwarded even from a text field, so it matters.
      if (e.textEntryActive) {
        searchStore.cancelCharSearch();
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      if (e.key === "Escape") {
        searchStore.cancelCharSearch();
        logseq.UI.showMsg("Cancelled", "info");
      } else if (e.key.length === 1) {
        // Single character key
        await searchStore.handleCharInput(e.key);
      }
    }
  };

  lifecycle.add(addHostKeydownListener(handleGlobalKeydown));

  // Global click handler to close UI when clicking outside
  const handleDocumentClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;

    // Check if click is within the plugin's main UI container
    const isClickInPluginUI = target.closest("#app");

    // Check if click is within any of the UI components that should stay open
    const isClickInSettings = target.closest(".settings-dialog");
    const isClickInHelp = target.closest(".help-dialog");
    const isClickInMarks = target.closest(".vim-shortcuts-marks");
    const isClickInCommand = target.closest(".command-input");
    const isClickInSearch = target.closest(".search-input");
    const isClickInColor = target.closest(".color-picker");
    const isClickInEmoji = target.closest(".emoji-picker");

    // Element Plus components
    const isClickInPopper = target.closest(".el-popper");
    const isClickInDialog = target.closest(".el-dialog");
    const isClickInDialogWrapper = target.closest(".el-overlay");
    const isClickInMessageBox = target.closest(".el-message-box");
    const isClickInButton = target.closest(".el-button");
    const isClickInInput = target.closest(".el-input");
    const isClickInCheckbox = target.closest(".el-checkbox");
    const isClickInTag = target.closest(".el-tag");
    const isClickInTabs = target.closest(".el-tabs");
    const isClickInSelect = target.closest(".el-select");
    const isClickInDropdown = target.closest(".el-dropdown");

    // If click is outside all UI components, hide the main UI
    if (
      !isClickInPluginUI &&
      !isClickInSettings &&
      !isClickInHelp &&
      !isClickInMarks &&
      !isClickInCommand &&
      !isClickInSearch &&
      !isClickInColor &&
      !isClickInEmoji &&
      !isClickInPopper &&
      !isClickInDialog &&
      !isClickInDialogWrapper &&
      !isClickInMessageBox &&
      !isClickInButton &&
      !isClickInInput &&
      !isClickInCheckbox &&
      !isClickInTag &&
      !isClickInTabs &&
      !isClickInSelect &&
      !isClickInDropdown
    ) {
      hideMainUI();
    }
  };

  lifecycle.listen(window, "click", handleDocumentClick as EventListener);

  if ($commandInput) {
    lifecycle.listen(
      $commandInput,
      "click",
      handleCommandClick as EventListener
    );
    lifecycle.listen(
      $commandInput,
      "keyup",
      handleCommandKeyup as EventListener
    );
    lifecycle.listen(
      $commandInput,
      "keydown",
      handleCommandKeydown as EventListener
    );
  }

  if ($searchInput) {
    lifecycle.listen(
      $searchInput,
      "keyup",
      handleSearchKeyup as EventListener
    );
  }

  logseq.beforeunload(async () => {
    // Each step is independent, and one throwing must not strand the rest —
    // skipping lifecycle.dispose() would leave the host bridge armed and
    // swallowing keys for the rest of the session.
    const teardown: Array<[string, () => void]> = [
      ["input listener", cancelInputListener],
      ["operator sequences", disposeOperatorSequences],
      ["search effects", disposeSearchEffects],
      ["lifecycle", () => lifecycle.dispose()],
      ["vue app", () => app.unmount()],
    ];
    for (const [label, step] of teardown) {
      try {
        step();
      } catch (error) {
        console.error(`Vimblocks teardown failed: ${label}`, error);
      }
    }
  });
}

logseq.ready(main).catch(console.error);
