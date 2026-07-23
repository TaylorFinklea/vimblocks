export const OPEN_PDF_COMMAND_ID = "open-selected-pdf-inline";
export const DEFAULT_OPEN_PDF_SHORTCUT = "mod+alt+p";

type CommandUnregister = () => void;

export type CurrentBlock = {
  uuid: string;
};

export type CompanionApi = {
  App: {
    registerCommandPalette(
      options: {
        key: string;
        label: string;
      },
      action: () => Promise<void>,
    ): CommandUnregister | false | void;
    registerCommandShortcut(
      keybinding: {
        mode: "non-editing";
        binding: string;
      },
      action: () => Promise<void>,
      options: {
        key: string;
        label: string;
        desc: string;
      },
    ): CommandUnregister | false | void;
  };
  Editor: {
    getCurrentBlock(): Promise<CurrentBlock | null>;
    openPDFViewer(blockId: string): Promise<void>;
  };
  UI: {
    showMsg(message: string, status: "warning" | "error"): void;
  };
  settings?: {
    openPdfShortcut?: unknown;
  };
};

type CommandDefinition = {
  id: string;
  title: string;
  description: string;
  register(api: CompanionApi): CommandUnregister | false;
};

export function resolveOpenPdfShortcut(value: unknown): string | null {
  if (typeof value !== "string") {
    return DEFAULT_OPEN_PDF_SHORTCUT;
  }

  const shortcut = value.trim();
  return shortcut.length > 0 ? shortcut : null;
}

export async function openSelectedPdf(api: CompanionApi): Promise<void> {
  const block = await api.Editor.getCurrentBlock();
  if (!block?.uuid) {
    api.UI.showMsg("Select a PDF asset block first.", "warning");
    return;
  }

  try {
    await api.Editor.openPDFViewer(block.uuid);
  } catch {
    api.UI.showMsg("The selected block could not be opened as a PDF.", "error");
  }
}

export const commandRegistry: ReadonlyArray<CommandDefinition> = [
  {
    id: OPEN_PDF_COMMAND_ID,
    title: "Open selected PDF inline",
    description: "Open the selected PDF asset in Logseq's built-in viewer.",
    register(api) {
      const shortcut = resolveOpenPdfShortcut(api.settings?.openPdfShortcut);
      const action = () => openSelectedPdf(api);
      const unregisterCommands = [
        api.App.registerCommandPalette(
          {
            key: `${this.id}-palette`,
            label: this.title,
          },
          action,
        ),
      ];

      if (shortcut) {
        unregisterCommands.push(
          api.App.registerCommandShortcut(
            {
              mode: "non-editing",
              binding: shortcut,
            },
            action,
            {
              key: `${this.id}-shortcut`,
              label: this.title,
              desc: this.description,
            },
          ),
        );
      }

      const unregister = unregisterCommands.filter(
        (candidate): candidate is CommandUnregister =>
          typeof candidate === "function",
      );

      return () => {
        for (const dispose of unregister.reverse()) {
          dispose();
        }
      };
    },
  },
];

export function registerOwnedCommands(api: CompanionApi): CommandUnregister {
  const unregisterCommands = commandRegistry.flatMap((command) => {
    const unregister = command.register(api);
    return unregister ? [unregister] : [];
  });

  let disposed = false;
  return () => {
    if (disposed) {
      return;
    }
    disposed = true;

    for (const unregister of unregisterCommands.reverse()) {
      unregister();
    }
  };
}
