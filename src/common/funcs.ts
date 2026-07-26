import "@logseq/libs";
import {
  BlockEntity,
  BlockPageName,
  BlockUUID,
  ILSPluginUser,
  PageEntity,
} from "@logseq/libs/dist/LSPlugin";
import { TempCache } from "./type";
import { schemaVersion } from "../../package.json";
import hotkeys from "hotkeys-js";
import { useCommandStore } from "@/stores/command";
import { useColorStore } from "@/stores/color";
import { useSearchStore } from "@/stores/search";
import { useDbTaskCaptureStore } from "@/stores/db-task-capture";
import {
  getActiveTextEntryTarget,
  shouldBlockTextEntryAction,
  type TextEntryGuardOptions,
} from "@/runtime/context-guard";
import { isMissingStorageItemError } from "@/runtime/storage-errors";
import { resolveCurrentBlockUUID } from "@/runtime/cursor-block";
import {
  unnamedRegister,
  type VimRegisterKind,
  type VimRegisterValue,
} from "@/runtime/vim-register";
import { clearHostHighlights } from "@/runtime/host-bridge";
import {
  appendModalCountDigit,
  getModalCountDigits,
  resetModalCountDigits,
} from "@/runtime/modal-count";

export const clearBlocksHighlight = async (blocks: BlockEntity[]) => {
  const uuids: string[] = [];
  const collect = (items: BlockEntity[]) => {
    for (const block of items) {
      uuids.push(block.uuid);
      if (block.children && block.children.length > 0) {
        collect(block.children as BlockEntity[]);
      }
    }
  };
  collect(blocks);
  clearHostHighlights(uuids);
};

export const clearCurrentPageBlocksHighlight = async () => {
  clearHostHighlights();
};

export async function createPageIfNotExists(pageName): Promise<PageEntity> {
  let page = await logseq.Editor.getPage(pageName);
  if (!page) {
    page = await logseq.Editor.createPage(
      pageName,
      {},
      {
        createFirstBlock: true,
        redirect: false,
      }
    );
  }

  return page;
}

export function setHotkeys(_logseq: ILSPluginUser): () => void {
  const escapeHandler = () => {
    hideMainUI();
    return false;
  };

  const commandKeys = "command+shift+;, ctrl+shift+;, shift+;";
  const commandHandler = () => {
    const $input = document.querySelector(
      ".command-input input"
    ) as HTMLInputElement;
    $input && $input.focus();
    return false;
  };

  hotkeys("esc", escapeHandler);
  hotkeys(commandKeys, commandHandler);

  return () => {
    hotkeys.unbind("esc", escapeHandler);
    hotkeys.unbind(commandKeys, commandHandler);
  };
}

export async function getGraphKey(key: string): Promise<string> {
  const graph = await logseq.App.getCurrentGraph();
  return (
    "logseq-plugin-vim-shortcuts:" +
    key +
    ":" +
    schemaVersion +
    ":" +
    (graph?.path ?? "nograph")
  );
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const tempCache: TempCache = {
  lastPage: "",
};

export const writeClipboard = (
  content: string,
  kind: VimRegisterKind = "characterwise"
) => {
  unnamedRegister.write(
    kind === "characterwise"
      ? { kind, text: content }
      : {
          kind,
          blocks: [{ content, children: [] }],
        }
  );
};

export const readVimRegister = (): VimRegisterValue =>
  unnamedRegister.read();

export const resetNumber = () => {
  resetModalCountDigits();
};

export const getNumber = (): number => {
  const digits = getModalCountDigits();
  return digits ? Number.parseInt(digits, 10) : 1;
};

export const hasExplicitNumber = (): boolean => {
  return getModalCountDigits().length > 0;
};

export const setNumber = (n: number) => {
  if (n !== 0 || hasExplicitNumber()) appendModalCountDigit(n);
};

let commandHistory: string[] = [];
let commandCursor = 0;

export const pushCommandHistory = (command: string) => {
  commandHistory.unshift(command);
  commandCursor = 0;
  if (commandHistory.length > 1000) {
    commandHistory.pop();
  }
};

export const getCommandFromHistoryBack = (): string => {
  commandCursor = commandCursor % commandHistory.length;
  const command = commandHistory[commandCursor] || "";
  commandCursor++;
  return command;
};

export const getCommandFromHistoryForward = (): string => {
  commandCursor =
    commandCursor < 0 ? commandCursor + commandHistory.length : commandCursor;
  const command = commandHistory[commandCursor] || "";
  commandCursor--;
  return command;
};

export const resetCommandCursor = () => {
  commandCursor = 0;
};

export const showMainUI = (inputVisible) => {
  const commandStore = useCommandStore();
  commandStore.setVisible(inputVisible);
  logseq.showMainUI({
    autoFocus: true,
  });
};

export const hideMainUI = () => {
  const commandStore = useCommandStore();
  commandStore.emptyInput();
  commandStore.hide();

  const searchStore = useSearchStore();
  searchStore.hide();

  const colorStore = useColorStore();
  colorStore.hide();

  const captureStore = useDbTaskCaptureStore();
  captureStore.hide();

  logseq.hideMainUI({
    restoreEditingCursor: true,
  });
  logseq.Editor.restoreEditingCursor();
  resetCommandCursor();
};

let blockMarkCache: {
  [key: string]: {
    page: string;
    block: BlockUUID;
    note?: string;
  };
} = {};

let pageMarkCache: {
  [key: string]: {
    page: string;
    note?: string;
  };
} = {};

/**
 * Extract plain text from block content by removing special chars, HTML tags, and Markdown syntax
 * @param content - The block content string
 * @returns Plain text string, max 20 chars
 */
export const extractPlainText = (content: string): string => {
  try {
    if (!content || typeof content !== "string") return "";

    let text = content;

    // Remove Logseq properties (key:: value)
    text = text.replace(/^[\w\-]+::\s*.+$/gm, "");
    text = text.replace(/[\w\-]+::\s*[^\n]+/g, "");

    // Remove HTML tags
    text = text.replace(/<[^>]*>/g, "");

    // Extract content from Logseq page references [[xyz]] -> xyz
    text = text.replace(/\[\[(.+?)\]\]/g, "$1");

    // Extract content from Logseq block references ((xyz)) -> xyz
    text = text.replace(/\(\((.+?)\)\)/g, "$1");

    // Remove Markdown syntax
    text = text.replace(/\*\*(.+?)\*\*/g, "$1"); // Bold
    text = text.replace(/__(.+?)__/g, "$1");
    text = text.replace(/\*(.+?)\*/g, "$1"); // Italic
    text = text.replace(/_(.+?)_/g, "$1");
    text = text.replace(/~~(.+?)~~/g, "$1"); // Strikethrough
    text = text.replace(/`(.+?)`/g, "$1"); // Inline code
    text = text.replace(/==(.+?)==/g, "$1"); // Highlight
    text = text.replace(/\[(.+?)\]\((.+?)\)/g, "$1"); // Links
    text = text.replace(/^#{1,6}\s+/gm, ""); // Headers
    text = text.replace(/^[-*]\s+\[([ x])\]\s+/gm, ""); // Task list
    text = text.replace(/^[-*]\s+/gm, ""); // Unordered list
    text = text.replace(/^>\s+/gm, ""); // Block quotes
    text = text.replace(/^\d+\.\s+/gm, ""); // Ordered list

    // Remove extra whitespace and newlines
    text = text.replace(/\s+/g, " ").trim();

    // Limit to 20 characters
    return text.substring(0, 20);
  } catch (error) {
    console.error("Error extracting plain text:", error);
    return "";
  }
};

export const setMark = async (
  number: number,
  page: BlockPageName,
  block: BlockUUID | undefined = undefined
) => {
  try {
    const storage = logseq.Assets.makeSandboxStorage();

    if (block) {
      // Block mark - extract note from block content
      let note = "";
      try {
        const blockEntity = await logseq.Editor.getBlock(block);
        if (blockEntity && blockEntity.content) {
          note = extractPlainText(blockEntity.content);
        }
      } catch (error) {
        console.error("Failed to extract note from block:", error);
        // Continue with empty note
      }

      blockMarkCache[number] = {
        page,
        block,
        note,
      };

      await storage.setItem("block-marks.json", JSON.stringify(blockMarkCache));
    } else {
      // Page mark - use empty note initially
      pageMarkCache[number] = {
        page,
        note: "",
      };

      await storage.setItem("page-marks.json", JSON.stringify(pageMarkCache));
    }
  } catch (error) {
    console.error("Failed to set mark:", error);
    throw error;
  }
};

export const loadMarks = async () => {
  try {
    const storage = logseq.Assets.makeSandboxStorage();

    // Load block marks
    let blockMarkCacheStr: string | null = null;
    try {
      blockMarkCacheStr = await storage.getItem("block-marks.json");
    } catch (error) {
      if (!isMissingStorageItemError(error)) {
        throw error;
      }
    }
    if (blockMarkCacheStr) {
      const loaded = JSON.parse(blockMarkCacheStr as string) || {};
      // Ensure all entries have the note field for backward compatibility
      blockMarkCache = {};
      Object.keys(loaded).forEach((key) => {
        blockMarkCache[key] = {
          ...loaded[key],
          note: loaded[key].note || "", // Add empty note if missing
        };
      });
    } else {
      blockMarkCache = {};
    }

    // Load page marks
    let pageMarkCacheStr: string | null = null;
    try {
      pageMarkCacheStr = await storage.getItem("page-marks.json");
    } catch (error) {
      if (!isMissingStorageItemError(error)) {
        throw error;
      }
    }
    if (pageMarkCacheStr) {
      const loaded = JSON.parse(pageMarkCacheStr as string) || {};
      // Ensure all entries have the note field for backward compatibility
      pageMarkCache = {};
      Object.keys(loaded).forEach((key) => {
        pageMarkCache[key] = {
          ...loaded[key],
          note: loaded[key].note || "", // Add empty note if missing
        };
      });
    } else {
      pageMarkCache = {};
    }
  } catch (error) {
    console.error("Failed to load marks:", error);
    blockMarkCache = {};
    pageMarkCache = {};
  }
};

export const getMark = (
  number: number,
  isPageMark: boolean = false
): { page: string; block: BlockUUID } | { page: string } | undefined => {
  if (isPageMark) {
    return pageMarkCache[number] || undefined;
  } else {
    return blockMarkCache[number] || undefined;
  }
};

export const getBlockMark = (number: number) => {
  return blockMarkCache[number] || undefined;
};

export const getPageMark = (number: number) => {
  return pageMarkCache[number] || undefined;
};

export const getMarks = () => {
  // Merge both caches for backward compatibility
  const merged = {};
  Object.keys(blockMarkCache).forEach((key) => {
    merged[key] = blockMarkCache[key];
  });
  Object.keys(pageMarkCache).forEach((key) => {
    merged[key] = pageMarkCache[key];
  });
  return merged;
};

export const getBlockMarks = () => {
  return blockMarkCache;
};

export const getPageMarks = () => {
  return pageMarkCache;
};

export const delMark = async (number: string, isPageMark: boolean = false) => {
  const storage = logseq.Assets.makeSandboxStorage();

  if (isPageMark) {
    delete pageMarkCache[number];
    await storage.setItem("page-marks.json", JSON.stringify(pageMarkCache));
  } else {
    delete blockMarkCache[number];
    await storage.setItem("block-marks.json", JSON.stringify(blockMarkCache));
  }
};

export const clearMarks = async () => {
  const storage = logseq.Assets.makeSandboxStorage();
  blockMarkCache = {};
  pageMarkCache = {};
  await storage.setItem("block-marks.json", JSON.stringify(blockMarkCache));
  await storage.setItem("page-marks.json", JSON.stringify(pageMarkCache));
};

export const clearBlockMarks = async () => {
  const storage = logseq.Assets.makeSandboxStorage();
  blockMarkCache = {};
  await storage.setItem("block-marks.json", JSON.stringify(blockMarkCache));
};

export const clearPageMarks = async () => {
  const storage = logseq.Assets.makeSandboxStorage();
  pageMarkCache = {};
  await storage.setItem("page-marks.json", JSON.stringify(pageMarkCache));
};

/**
 * Update the note for a block mark
 */
export const updateBlockMarkNote = async (number: string, note: string) => {
  if (blockMarkCache[number]) {
    blockMarkCache[number].note = note;
    const storage = logseq.Assets.makeSandboxStorage();
    await storage.setItem("block-marks.json", JSON.stringify(blockMarkCache));
  }
};

/**
 * Update the note for a page mark
 */
export const updatePageMarkNote = async (number: string, note: string) => {
  if (pageMarkCache[number]) {
    pageMarkCache[number].note = note;
    const storage = logseq.Assets.makeSandboxStorage();
    await storage.setItem("page-marks.json", JSON.stringify(pageMarkCache));
  }
};

const debugMode = false;
export const debug = (msg: any, status = "success") => {
  if (debugMode) {
    // logseq.UI.showMsg(msg, status);
    console.log(msg);
  }
};

const settingsVersion = "v6";
export const defaultSettings = {
  keyBindings: {
    bottom: "shift+g",
    changeCase: "mod+shift+u",
    changeCaseUpper: "g shift+u",
    changeCaseLower: "g u",
    changeCurrentBlock: "d c",
    changeInnerWord: "c i",
    deleteInnerWord: "d i",
    yankInnerWord: "y i",
    changeAroundWord: "c a",
    deleteAroundWord: "d a",
    yankAroundWord: "y a",
    changeWord: "c w",
    deleteWord: "d w",
    yankWord: "y w",
    changeWordEnd: "c e",
    deleteWordEnd: "d e",
    yankWordEnd: "y e",
    changeLineEnd: ["c shift+4", "shift+c"],
    deleteLineEnd: ["d shift+4", "shift+d"],
    yankLineEnd: "y shift+4",
    changeLine: ["c c", "shift+s"],
    collapse: "z c",
    collapseAll: "z shift+c",
    copyCurrentBlockContent: "y y",
    copyCurrentBlockRef: "shift+y",
    deleteCurrentBlock: "d d",
    deleteCurrentAndNextSiblingBlocks: "d j",
    deleteCurrentAndPrevSiblingBlocks: "d k",
    down: "j",
    extend: "z o",
    extendAll: "z shift+o",
    highlightFocusIn: "shift+l",
    highlightFocusOut: "shift+h",
    indent: ["shift+."],
    insert: ["shift+a", "a"],
    insertBefore: ["shift+i", "i"],
    left: "h",
    right: "l",
    wordForward: "w",
    halfPageDown: "ctrl+d",
    halfPageUp: "ctrl+u",
    wordBackward: "b",
    wordEnd: "e",
    lineEnd: "shift+4",
    lineStart: "0",
    firstNonBlank: "shift+6",
    findChar: "f",
    findCharBackward: "shift+f",
    tillChar: "t",
    tillCharBackward: "shift+t",
    repeatCharSearch: ";",
    repeatCharSearchReverse: ",",
    nextNewBlock: "o",
    nextSibling: "shift+j",
    outdent: ["shift+,"],
    pasteNext: "p",
    pastePrev: "shift+p",
    prevNewBlock: "shift+o",
    prevSibling: "shift+k",
    redo: "ctrl+r",
    repeatChange: ".",
    search: "/",
    searchPrev: "shift+n",
    searchNext: "n",
    searchCleanup: "s q",
    searchBaidu: "s b",
    searchGithub: "s h",
    searchGoogle: "s g",
    searchStackoverflow: "s s",
    searchWikipedia: "s e",
    searchYoutube: "s y",
    top: "g g",
    undo: "u",
    up: "k",
    exitEditing: ["mod+j mod+j", "ctrl+["],
    jumpInto: "mod+shift+enter",
    joinNextLine: "mod+alt+j",
    toggleVisualMode: "v",
    visualLineMode: "shift+v",
    markSave: "m",
    markPageSave: "shift+m",
    markJump: "'",
    markPageJump: "shift+'",
    markJumpSidebar: "mod+'",
    markPageJumpSidebar: "mod+shift+'",
    increase: "ctrl+a",
    decrease: "ctrl+x",
    cut: "x",
    cutWord: "shift+x",
    replace: "r",
    command: ["mod+alt+;", "mod+shift+;"],
    emoji: "mod+/",
    openSettings: "",
  },
  disabledKeyBindings: [] as string[],
  settingsVersion,
  disabled: false,
  showRecentEmojis: false,
  openPdfShortcut: "mod+alt+p",
  cursorColor: "#ffff00",
  vimBoundaryProfile: "logseq-first" as "logseq-first" | "vim-first",
};

export type DefaultSettingsType = typeof defaultSettings;

export const initSettings = () => {
  const existingSettings = structuredClone(logseq.settings ?? {}) as {
    settingsVersion?: unknown;
    keyBindings?: Record<string, unknown>;
  };
  const existingBindings = (
    existingSettings as { keyBindings?: Record<string, unknown> }
  ).keyBindings;
  if (
    existingSettings.settingsVersion === "v5" &&
    existingBindings?.top === "shift+t"
  ) {
    existingBindings.top = "g g";
  }
  const settings = deepAssign(
    structuredClone(defaultSettings),
    existingSettings as Partial<DefaultSettingsType>,
    { settingsVersion }
  );
  logseq.updateSettings(settings);
  invalidateSettingsCache();
};

export function deepAssign<T extends object>(
  target: T,
  ...sources: Array<Partial<T> | null | undefined>
): T {
  const validSources = sources.filter((s): s is Partial<T> => s != null);

  for (const source of validSources) {
    for (const key of Object.keys(source)) {
      const targetVal = (target as Record<string, unknown>)[key];
      const sourceVal = (source as Record<string, unknown>)[key];

      if (isPlainObject(targetVal) && isPlainObject(sourceVal)) {
        // Recursively merge nested objects
        deepAssign(targetVal as object, sourceVal);
      } else if (sourceVal !== undefined) {
        // Only assign if source value is defined
        (target as Record<string, unknown>)[key] = sourceVal;
      }
    }
  }

  return target;
}

function isPlainObject(val: unknown): val is object {
  return (
    val !== null &&
    typeof val === "object" &&
    !Array.isArray(val) &&
    Object.getPrototypeOf(val) === Object.prototype
  );
}

// Cache for merged settings to avoid repeated deep cloning
let settingsCache: DefaultSettingsType | null = null;
let lastSettingsVersion: string | null = null;

export const invalidateSettingsCache = (): void => {
  settingsCache = null;
  lastSettingsVersion = null;
};

export const getSettings = (): DefaultSettingsType => {
  const settings = logseq.settings;
  const currentVersion =
    typeof settings?.settingsVersion === "string"
      ? settings.settingsVersion
      : null;

  // Return cached settings if version hasn't changed
  if (settingsCache && lastSettingsVersion === currentVersion) {
    return settingsCache;
  }

  // Deep clone defaultSettings to avoid mutation
  const clonedDefaults = JSON.parse(
    JSON.stringify(defaultSettings)
  ) as DefaultSettingsType;

  // Merge user settings into cloned defaults
  const merged = deepAssign(clonedDefaults, settings);

  // Update cache
  settingsCache = merged;
  lastSettingsVersion = currentVersion;

  return merged;
};

export const isKeyBindingEnabled = (key: string): boolean => {
  const settings = getSettings();
  const disabledKeys = settings.disabledKeyBindings || [];
  return !disabledKeys.includes(key);
};

// State for tracking input listening mode (e.g., when waiting for replace character)
let isWaitingForInput = false;
let inputListenerCleanup: (() => void) | null = null;

/**
 * Set the input listening state
 * @param waiting - Whether we're waiting for input
 * @param cleanup - Optional cleanup function to call when cancelled
 */
export const setWaitingForInput = (waiting: boolean, cleanup?: () => void) => {
  isWaitingForInput = waiting;

  if (cleanup) {
    inputListenerCleanup = cleanup;
  } else if (!waiting && inputListenerCleanup) {
    // Clear cleanup function when no longer waiting
    inputListenerCleanup = null;
  }
};

/**
 * Cancel any pending input listener
 */
export const cancelInputListener = () => {
  if (inputListenerCleanup) {
    inputListenerCleanup();
    inputListenerCleanup = null;
  }
  isWaitingForInput = false;
};

/**
 * Check if currently waiting for input
 */
export const isInInputListeningMode = (): boolean => {
  return isWaitingForInput;
};

/**
 * Hook called before registering a keybinding
 * Checks if the keybinding should be registered based on settings
 *
 * @param key - The keybinding key identifier
 * @returns true if keybinding should be registered, false otherwise
 */
export const beforeActionRegister = (key: string): boolean => {
  // Check if keybinding is disabled in settings
  return isKeyBindingEnabled(key);
};

/**
 * Hook called before executing any action
 * Returns true if the action should continue, false if it should be blocked
 *
 * @param options - Context allowances for deliberately global commands
 * @returns true if action should continue, false otherwise
 */
export type BeforeActionOptions = TextEntryGuardOptions;

export const beforeActionExecute = (
  options: BeforeActionOptions = {}
): boolean => {
  // Check if we're currently waiting for input (e.g., replace character)
  // In this case, block all other actions
  if (isWaitingForInput) {
    return false;
  }

  if (shouldBlockTextEntryAction(getActiveTextEntryTarget(), options)) {
    return false;
  }

  return true;
};

export const scrollToBlockInPage = (
  pageName: BlockPageName,
  blockId: BlockUUID
) => {
  logseq.Editor.scrollToBlockInPage(pageName, blockId);
};

export const getCurrentBlockUUID = async (): Promise<BlockUUID | undefined> => {
  const block = await logseq.Editor.getCurrentBlock();
  const searchStore = useSearchStore();
  return resolveCurrentBlockUUID(
    block?.uuid,
    searchStore.cursorMode,
    searchStore.cursorBlockUUID
  );
};

export const getCurrentPage = async () => {
  let page = await logseq.Editor.getCurrentPage();

  // if (!page) {
  //   let blockUUID = await getCurrentBlockUUID();
  //   if (blockUUID) {
  //     let block = await logseq.Editor.getBlock(blockUUID);
  //     if (block?.page.id) {
  //       page = await logseq.Editor.getPage(block.page.id);
  //     }
  //   }
  // }

  if (page?.name) {
    tempCache.lastPage = page.name as string;
  }
  return page;
};

export function hexToRgb(hex) {
  const hexCode = hex.charAt(0) === "#" ? hex.substr(1, 6) : hex;

  const hexR = parseInt(hexCode.substr(0, 2), 16);
  const hexG = parseInt(hexCode.substr(2, 2), 16);
  const hexB = parseInt(hexCode.substr(4, 2), 16);

  return [hexR, hexG, hexB];
}

export function filterDarkColor(hexColor) {
  const [r, g, b] = hexToRgb(hexColor);
  return r * 0.299 + g * 0.587 + b * 0.114 < 150;
}

export {
  findDuplicateKeyBindings,
  normalizeKeyBinding,
  validateKeyBinding,
} from "@/runtime/keybindings";
