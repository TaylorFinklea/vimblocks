import assert from "node:assert/strict";
import test from "node:test";

import { isMissingStorageItemError } from "../src/runtime/storage-errors.ts";

test("recognizes Logseq's fresh-sandbox missing-file response", () => {
  assert.equal(
    isMissingStorageItemError(new Error("file not existed")),
    true
  );
  assert.equal(
    isMissingStorageItemError(new Error("permission denied")),
    false
  );
});
