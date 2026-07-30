const CHANNEL = "vimblocks-host-bridge-v1";

export interface HostBridgeApi {
  Experiments: {
    loadScripts(...scripts: string[]): Promise<void>;
  };
}

export interface HostKeydownEvent {
  key: string;
  code: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  repeat: boolean;
  isComposing: boolean;
  textEntryActive: boolean;
  contentEditable: boolean;
  blockEditorActive: boolean;
  blockUUID?: string;
  visibleBlockUUIDs: string[];
  viewportBlockUUIDs: string[];
  target?: unknown;
  composedPath(): unknown[];
  preventDefault(): void;
  stopPropagation(): void;
  stopImmediatePropagation(): void;
}

export interface HostHighlightRange {
  uuid: string;
  renderedOffset: number;
  renderedLength: number;
  role: "cursor" | "visual";
}

type HostKeydownListener = (event: HostKeydownEvent) => void | Promise<void>;
type HostNormalModeListener = (active: boolean) => void;
const hostThemeTokenNames = [
  "background",
  "foreground",
  "popover",
  "popover-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "border",
  "input",
  "ring",
  "accent-soft-color",
  "accent-color",
  "accent-hover-color",
] as const;
type HostThemeTokenName = (typeof hostThemeTokenNames)[number];

export interface HostTheme {
  tokens: Partial<Record<HostThemeTokenName, string>>;
  colorScheme?: string;
  fontFamily?: string;
  radius?: string;
}

type HostThemeListener = (theme: HostTheme) => void;

const listeners = new Set<HostKeydownListener>();
const normalModeListeners = new Set<HostNormalModeListener>();
const themeListeners = new Set<HostThemeListener>();
let installed = false;
let textEntryActive = false;
let currentTheme: HostTheme | undefined;
let configuredTokens: string[] = [];
let normalModeTokens: string[] = [];
let captureAll = false;
let normalModeActive = false;

const postHostMessage = (message: Record<string, unknown>): void => {
  window.parent.postMessage({ channel: CHANNEL, ...message }, "*");
};

const safeThemeValue = (
  value: unknown,
  maximumLength = 128
): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (
    !trimmed ||
    trimmed.length > maximumLength ||
    /[;{}]|url\s*\(/i.test(trimmed)
  ) {
    return undefined;
  }
  return trimmed;
};

const parseHostTheme = (data: Record<string, unknown>): HostTheme => {
  const source =
    data.tokens && typeof data.tokens === "object"
      ? data.tokens as Record<string, unknown>
      : {};
  const tokens: HostTheme["tokens"] = {};
  for (const name of hostThemeTokenNames) {
    const value = safeThemeValue(source[name]);
    if (value) tokens[name] = value;
  }
  return {
    tokens,
    ...(safeThemeValue(data.colorScheme)
      ? { colorScheme: safeThemeValue(data.colorScheme) }
      : {}),
    ...(safeThemeValue(data.fontFamily, 512)
      ? { fontFamily: safeThemeValue(data.fontFamily, 512) }
      : {}),
    ...(safeThemeValue(data.radius)
      ? { radius: safeThemeValue(data.radius) }
      : {}),
  };
};

const updateHostNormalModeState = (value: boolean): void => {
  normalModeActive = value;
  for (const listener of normalModeListeners) listener(normalModeActive);
};

const onMessage = (event: MessageEvent): void => {
  if (event.source !== window.parent) return;
  const data = event.data;
  if (!data || data.channel !== CHANNEL) return;
  if (data.type === "ready") {
    postHostMessage({
      type: "configure",
      tokens: configuredTokens,
      normalModeTokens,
      captureAll,
      normalModeActive,
    });
    return;
  }
  if (data.type === "theme") {
    currentTheme = parseHostTheme(data);
    for (const listener of themeListeners) listener(currentTheme);
    return;
  }
  if (data.type === "capture-released") {
    updateHostNormalModeState(false);
    return;
  }
  if (data.type !== "keydown") return;

  textEntryActive = Boolean(data.textEntryActive);
  const hostEvent: HostKeydownEvent = {
    key: data.key,
    code: data.code,
    ctrlKey: Boolean(data.ctrlKey),
    metaKey: Boolean(data.metaKey),
    altKey: Boolean(data.altKey),
    shiftKey: Boolean(data.shiftKey),
    repeat: Boolean(data.repeat),
    isComposing: Boolean(data.isComposing),
    textEntryActive,
    contentEditable: Boolean(data.contentEditable),
    blockEditorActive: Boolean(data.blockEditorActive),
    blockUUID:
      typeof data.blockUUID === "string" ? data.blockUUID : undefined,
    visibleBlockUUIDs: Array.isArray(data.visibleBlockUUIDs)
      ? data.visibleBlockUUIDs.filter(
          (uuid: unknown): uuid is string => typeof uuid === "string"
        )
      : [],
    viewportBlockUUIDs: Array.isArray(data.viewportBlockUUIDs)
      ? data.viewportBlockUUIDs.filter(
          (uuid: unknown): uuid is string => typeof uuid === "string"
        )
      : [],
    composedPath: () => [],
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
    stopImmediatePropagation: () => undefined,
  };

  for (const listener of listeners) {
    void listener(hostEvent);
  }
};

export const installHostBridge = async (
  api: HostBridgeApi = logseq as unknown as HostBridgeApi
): Promise<() => void> => {
  if (!installed) {
    window.addEventListener("message", onMessage);
    installed = true;
  }
  await api.Experiments.loadScripts("/key-token.js", "/host-bridge.js");
  return () => {
    setHostCaptureAll(false);
    setHostNormalModeActive(false);
    postHostMessage({ type: "dispose" });
    listeners.clear();
    normalModeListeners.clear();
    themeListeners.clear();
    currentTheme = undefined;
    if (installed) {
      window.removeEventListener("message", onMessage);
      installed = false;
    }
  };
};

export const addHostKeydownListener = (
  listener: HostKeydownListener
): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const addHostNormalModeListener = (
  listener: HostNormalModeListener
): (() => void) => {
  normalModeListeners.add(listener);
  listener(normalModeActive);
  return () => normalModeListeners.delete(listener);
};

export const addHostThemeListener = (
  listener: HostThemeListener
): (() => void) => {
  themeListeners.add(listener);
  if (currentTheme) listener(currentTheme);
  return () => themeListeners.delete(listener);
};

export const requestHostTheme = (): void => {
  postHostMessage({ type: "theme-request" });
};

export const configureHostCapture = (tokens: readonly string[]): void => {
  configuredTokens = [...new Set(tokens)];
  postHostMessage({
    type: "configure",
    tokens: configuredTokens,
    normalModeTokens,
    captureAll,
    normalModeActive,
  });
};

export const configureHostNormalModeCapture = (
  tokens: readonly string[]
): void => {
  normalModeTokens = [...new Set(tokens)];
  postHostMessage({
    type: "configure",
    tokens: configuredTokens,
    normalModeTokens,
    captureAll,
    normalModeActive,
  });
};

export const setHostCaptureAll = (value: boolean): void => {
  captureAll = value;
  postHostMessage({ type: "capture-all", value: captureAll });
};

export const setHostNormalModeActive = (value: boolean): void => {
  updateHostNormalModeState(value);
  postHostMessage({ type: "normal-mode", value: normalModeActive });
};

export const isHostTextEntryActive = (): boolean => textEntryActive;

export const clearHostHighlights = (uuids?: readonly string[]): void => {
  postHostMessage({
    type: "clear-highlights",
    ...(uuids ? { uuids } : {}),
  });
};

export const highlightHostText = (options: {
  uuid: string;
  offset?: number;
  length: number;
  text?: string;
}): void => {
  postHostMessage({ type: "highlight", ...options });
};

export const highlightHostRanges = (
  ranges: readonly HostHighlightRange[]
): void => {
  postHostMessage({
    type: "highlight-ranges",
    ranges: ranges.filter(
      (range) =>
        range.uuid &&
        Number.isFinite(range.renderedOffset) &&
        Number.isFinite(range.renderedLength) &&
        range.renderedLength > 0
    ),
  });
};
