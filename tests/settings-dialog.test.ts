import assert from "node:assert/strict";
import test from "node:test";

import { closeSettingsDialog } from "../src/runtime/settings-dialog.ts";

test("closing Vimblocks settings asks Logseq to restore focus exactly once", () => {
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
  ]);
});
