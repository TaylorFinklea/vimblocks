export const OPEN_PDF_COMMAND_ID = "open-selected-pdf-inline";
export const DEFAULT_OPEN_PDF_SHORTCUT = "mod+alt+p";

type CommandUnregister = () => void;

export type CurrentBlock = {
  uuid: string;
  content?: string;
};

export type OpenPdfApi = {
  App: {
    registerCommandPalette(
      options: {
        key: string;
        label: string;
      },
      action: () => Promise<void>
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
      }
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

export function resolveOpenPdfShortcut(value: unknown): string | null {
  if (typeof value !== "string") {
    return DEFAULT_OPEN_PDF_SHORTCUT;
  }

  const shortcut = value.trim();
  return shortcut.length > 0 ? shortcut : null;
}

const DB_ASSET_PDF_UUID =
  /\/assets\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.pdf(?:[?#][^)\s]*)?(?=[)\s]|$)/i;

const resolvePdfViewerTarget = (block: CurrentBlock): string =>
  block.content?.match(DB_ASSET_PDF_UUID)?.[1] ?? block.uuid;

export async function openSelectedPdf(api: OpenPdfApi): Promise<void> {
  const block = await api.Editor.getCurrentBlock();
  if (!block?.uuid) {
    api.UI.showMsg("Select a PDF asset block first.", "warning");
    return;
  }

  try {
    await api.Editor.openPDFViewer(resolvePdfViewerTarget(block));
  } catch {
    api.UI.showMsg("The selected block could not be opened as a PDF.", "error");
  }
}

export function registerOpenPdfCommand(api: OpenPdfApi): CommandUnregister {
  const shortcut = resolveOpenPdfShortcut(api.settings?.openPdfShortcut);
  const action = () => openSelectedPdf(api);
  const unregisterCommands = [
    api.App.registerCommandPalette(
      {
        key: `${OPEN_PDF_COMMAND_ID}-palette`,
        label: "Open selected PDF inline",
      },
      action
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
          key: `${OPEN_PDF_COMMAND_ID}-shortcut`,
          label: "Open selected PDF inline",
          desc: "Open the selected PDF asset in Logseq's built-in viewer.",
        }
      )
    );
  }

  const unregister = unregisterCommands.filter(
    (candidate): candidate is CommandUnregister =>
      typeof candidate === "function"
  );
  let disposed = false;

  return () => {
    if (disposed) {
      return;
    }
    disposed = true;

    for (const dispose of unregister.reverse()) {
      dispose();
    }
  };
}
