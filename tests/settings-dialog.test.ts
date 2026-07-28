import assert from "node:assert/strict";
import test from "node:test";

import { closeSettingsDialog } from "../src/runtime/settings-dialog.ts";

test("closing Vimblocks settings hides the plugin frame and restores Logseq focus", () => {
  const calls: string[] = [];
  const settingsStore = {
    hide() {
      calls.push("store.hide");
    },
  };
  const api = {
    hideMainUI(options: { restoreEditingCursor: boolean }) {
      calls.push(`hideMainUI:${options.restoreEditingCursor}`);
    },
    Editor: {
      restoreEditingCursor() {
        calls.push("restoreEditingCursor");
      },
    },
  };

  closeSettingsDialog(settingsStore, api);

  assert.deepEqual(calls, [
    "store.hide",
    "hideMainUI:true",
    "restoreEditingCursor",
  ]);
});
