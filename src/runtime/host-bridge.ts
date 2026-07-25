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
  target?: unknown;
  composedPath(): unknown[];
  preventDefault(): void;
  stopPropagation(): void;
  stopImmediatePropagation(): void;
}

type HostKeydownListener = (event: HostKeydownEvent) => void | Promise<void>;

const listeners = new Set<HostKeydownListener>();
let installed = false;
let textEntryActive = false;
let configuredTokens: string[] = [];
let captureAll = false;

const postHostMessage = (message: Record<string, unknown>): void => {
  window.parent.postMessage({ channel: CHANNEL, ...message }, "*");
};

const onMessage = (event: MessageEvent): void => {
  if (event.source !== window.parent) return;
  const data = event.data;
  if (!data || data.channel !== CHANNEL) return;
  if (data.type === "ready") {
    postHostMessage({
      type: "configure",
      tokens: configuredTokens,
      captureAll,
    });
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
  await api.Experiments.loadScripts("./host-bridge.js");
  return () => {
    listeners.clear();
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

export const configureHostCapture = (tokens: readonly string[]): void => {
  configuredTokens = [...new Set(tokens)];
  postHostMessage({ type: "configure", tokens: configuredTokens, captureAll });
};

export const setHostCaptureAll = (value: boolean): void => {
  captureAll = value;
  postHostMessage({ type: "capture-all", value: captureAll });
};

export const isHostTextEntryActive = (): boolean => textEntryActive;

export const clearHostHighlights = (uuids: readonly string[]): void => {
  postHostMessage({ type: "clear-highlights", uuids });
};

export const highlightHostText = (options: {
  uuid: string;
  offset?: number;
  length: number;
  text?: string;
}): void => {
  postHostMessage({ type: "highlight", ...options });
};
