import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_OPEN_PDF_SHORTCUT,
  OPEN_PDF_COMMAND_ID,
  commandRegistry,
  openSelectedPdf,
  registerOwnedCommands,
  resolveOpenPdfShortcut,
  type CompanionApi,
} from "../src/command-registry.ts";

type Registration = {
  keybinding: {
    mode: "non-editing";
    binding: string;
  };
  options: {
    key: string;
    label: string;
    desc: string;
  };
  action: () => Promise<void>;
};

type PaletteRegistration = {
  options: {
    key: string;
    label: string;
  };
  action: () => Promise<void>;
};

function createApi(
  overrides: Partial<CompanionApi> = {},
): CompanionApi & {
  registrations: Registration[];
  paletteRegistrations: PaletteRegistration[];
  unregisterCount: () => number;
  openedBlocks: string[];
  messages: Array<[string, "warning" | "error"]>;
} {
  const registrations: Registration[] = [];
  const paletteRegistrations: PaletteRegistration[] = [];
  const openedBlocks: string[] = [];
  const messages: Array<[string, "warning" | "error"]> = [];
  let unregisters = 0;

  return {
    App: {
      registerCommandPalette(options, action) {
        paletteRegistrations.push({ options, action });
        return () => {
          unregisters += 1;
        };
      },
      registerCommandShortcut(keybinding, action, options) {
        registrations.push({ keybinding, options, action });
        return () => {
          unregisters += 1;
        };
      },
    },
    Editor: {
      async getCurrentBlock() {
        return { uuid: "pdf-block" };
      },
      async openPDFViewer(blockId) {
        openedBlocks.push(blockId);
      },
    },
    UI: {
      showMsg(message, status) {
        messages.push([message, status]);
      },
    },
    ...overrides,
    registrations,
    paletteRegistrations,
    unregisterCount: () => unregisters,
    openedBlocks,
    messages,
  };
}

test("the companion owns one discoverable command with a configurable shortcut", () => {
  const api = createApi();
  registerOwnedCommands(api);

  assert.equal(commandRegistry.length, 1);
  assert.equal(api.paletteRegistrations.length, 1);
  assert.equal(
    api.paletteRegistrations[0].options.key,
    `${OPEN_PDF_COMMAND_ID}-palette`,
  );
  assert.equal(
    api.paletteRegistrations[0].options.label,
    "Open selected PDF inline",
  );
  assert.equal(api.registrations.length, 1);
  assert.equal(
    api.registrations[0].options.key,
    `${OPEN_PDF_COMMAND_ID}-shortcut`,
  );
  assert.deepEqual(api.registrations[0].keybinding, {
    mode: "non-editing",
    binding: DEFAULT_OPEN_PDF_SHORTCUT,
  });
});

test("blank shortcut settings keep the command palette-only", () => {
  const api = createApi({ settings: { openPdfShortcut: "  " } });
  registerOwnedCommands(api);

  assert.equal(api.paletteRegistrations.length, 1);
  assert.equal(api.registrations.length, 0);
  assert.equal(resolveOpenPdfShortcut("  "), null);
});

test("custom shortcut settings are trimmed and registered", () => {
  const api = createApi({ settings: { openPdfShortcut: " mod+shift+9 " } });
  registerOwnedCommands(api);

  assert.equal(
    api.registrations[0].keybinding.binding,
    "mod+shift+9",
  );
});

test("the command opens the current block through the public PDF API", async () => {
  const api = createApi();

  await openSelectedPdf(api);

  assert.deepEqual(api.openedBlocks, ["pdf-block"]);
  assert.deepEqual(api.messages, []);
});

test("the command reports a missing current block without invoking the viewer", async () => {
  const api = createApi({
    Editor: {
      async getCurrentBlock() {
        return null;
      },
      async openPDFViewer() {
        throw new Error("must not be called");
      },
    },
  });

  await openSelectedPdf(api);

  assert.deepEqual(api.openedBlocks, []);
  assert.deepEqual(api.messages, [
    ["Select a PDF asset block first.", "warning"],
  ]);
});

test("dispose and reload unregister each registration exactly once", () => {
  const firstApi = createApi();
  const firstDispose = registerOwnedCommands(firstApi);
  firstDispose();
  firstDispose();

  const secondApi = createApi();
  const secondDispose = registerOwnedCommands(secondApi);
  secondDispose();

  assert.equal(firstApi.paletteRegistrations.length, 1);
  assert.equal(firstApi.registrations.length, 1);
  assert.equal(firstApi.unregisterCount(), 2);
  assert.equal(secondApi.paletteRegistrations.length, 1);
  assert.equal(secondApi.registrations.length, 1);
  assert.equal(secondApi.unregisterCount(), 2);
});
