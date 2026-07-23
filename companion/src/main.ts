import "@logseq/libs";

import {
  DEFAULT_OPEN_PDF_SHORTCUT,
  registerOwnedCommands,
  type CompanionApi,
} from "./command-registry";

logseq.useSettingsSchema([
  {
    key: "openPdfShortcut",
    type: "string",
    default: DEFAULT_OPEN_PDF_SHORTCUT,
    title: "Open selected PDF inline",
    description:
      "Logseq keybinding notation. Leave blank to keep the command palette-only.",
  },
]);

logseq.ready(() => {
  const dispose = registerOwnedCommands(logseq as unknown as CompanionApi);
  logseq.beforeunload(async () => {
    dispose();
  });
});
