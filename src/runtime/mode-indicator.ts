export type ModeIndicatorValue =
  | "normal"
  | "insert"
  | "visual"
  | "visual-line"
  | null;

export interface ModeIndicatorState {
  normalModeActive: boolean;
  insertSessionActive: boolean;
  visualMode: boolean;
  visualKind: "characterwise" | "linewise" | null;
}

interface ModeIndicatorApi {
  provideStyle(style: string): unknown;
  provideUI(options: {
    key: string;
    path: string;
    replace: boolean;
    template: string | null;
  }): unknown;
}

const labels: Record<Exclude<ModeIndicatorValue, null>, string> = {
  normal: "NORMAL",
  insert: "INSERT",
  visual: "VISUAL",
  "visual-line": "V-LINE",
};

export const resolveModeIndicator = (
  state: ModeIndicatorState
): ModeIndicatorValue => {
  if (state.insertSessionActive) return "insert";
  if (!state.normalModeActive) return null;
  if (state.visualMode) {
    return state.visualKind === "linewise" ? "visual-line" : "visual";
  }
  return "normal";
};

export const createModeIndicator = (api: ModeIndicatorApi) => {
  api.provideStyle(`
    .vimblocks-mode-indicator {
      position: fixed;
      left: 50%;
      bottom: 12px;
      z-index: 40;
      transform: translateX(-50%);
      border: 1px solid var(--ls-border-color, hsl(var(--border)));
      border-radius: var(--ls-border-radius-low, 4px);
      background: var(--ls-primary-background-color, hsl(var(--background)));
      color: var(--ls-secondary-text-color, hsl(var(--muted-foreground)));
      padding: 4px 7px 3px;
      font-family: inherit;
      font-size: 10px;
      font-weight: 650;
      line-height: 1;
      letter-spacing: 0.08em;
      opacity: 0.88;
      pointer-events: none;
      transition:
        color 120ms ease,
        border-color 120ms ease,
        opacity 120ms ease;
    }

    .vimblocks-mode-indicator:not([data-mode="normal"]) {
      border-color: var(--lx-accent-08, var(--ls-link-text-color));
      color: var(--lx-accent-11, var(--ls-link-text-color));
      opacity: 1;
    }
  `);

  let currentMode: ModeIndicatorValue = null;
  const setMode = (mode: ModeIndicatorValue): void => {
    if (mode === currentMode) return;
    currentMode = mode;
    api.provideUI({
      key: "vimblocks-mode-indicator",
      path: "body",
      replace: true,
      template: mode
        ? `<div class="vimblocks-mode-indicator" data-mode="${mode}" role="status" aria-live="polite">${labels[mode]}</div>`
        : null,
    });
  };

  return {
    setMode,
    dispose: () => setMode(null),
  };
};
