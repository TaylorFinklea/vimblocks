export interface KeyboardTokenEvent {
  key: string;
  code: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}

export interface VimblocksKeyTokenApi {
  eventToken(event: KeyboardTokenEvent): string;
  shouldCapture(input: {
    token: string;
    textEntryActive: boolean;
    captureAll: boolean;
    normalModeActive: boolean;
    captureTokens: readonly string[];
    normalModeTokens: readonly string[];
  }): boolean;
}

declare global {
  interface Window {
    __vimblocksKeyToken?: VimblocksKeyTokenApi;
  }
}

export const keyboardEventToken = (event: KeyboardTokenEvent): string =>
  window.__vimblocksKeyToken?.eventToken(event) ?? "";
