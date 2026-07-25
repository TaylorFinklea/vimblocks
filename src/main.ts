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
import { isTextEntryTarget } from "./runtime/context-guard";
import { DisposableRegistry } from "./runtime/disposable-registry";
import { disposeOperatorSequences } from "./keybindings/operators";
import {
  registerOpenPdfCommand,
  type OpenPdfApi,
} from "./open-pdf-command";
import {
  addHostKeydownListener,
  installHostBridge,
  type HostKeydownEvent,
} from "./runtime/host-bridge";

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
];

logseq.useSettingsSchema(defineSettings);

async function main() {
  const lifecycle = new DisposableRegistry();
  lifecycle.add(await installHostBridge());

  // settings
  initSettings();

  // Inject CSS for vim-shortcuts-highlight to Logseq main page
  logseq.provideStyle(`
    mark.vim-shortcuts-highlight {
      padding-left: 0 !important;
      padding-right: 0 !important;
    }
  `);

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

  const emojiStore = useEmojiStore();
  emojiStore.initPicker();

  registerOwnedCommands(logseq);
  lifecycle.add(
    registerOpenPdfCommand(logseq as unknown as OpenPdfApi)
  );

  // load marks
  await loadMarks();
  const markStore = useMarkStore();
  markStore.reload();

  // reload marks when graph changes
  lifecycle.add(logseq.App.onCurrentGraphChanged(async () => {
    await loadMarks();
    markStore.reload();
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
      if (isTextEntryTarget(e.target as HTMLElement)) {
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
    cancelInputListener();
    disposeOperatorSequences();
    disposeSearchEffects();
    lifecycle.dispose();
    app.unmount();
  });
}

logseq.ready(main).catch(console.error);
