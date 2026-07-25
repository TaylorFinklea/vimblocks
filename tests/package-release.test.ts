import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { stageRelease } from "../scripts/package-release.mjs";

test("stages one loadable plugin and installation instructions", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "vimblocks-package-"));
  await mkdir(path.join(root, "dist"), { recursive: true });
  await writeFile(
    path.join(root, "package.json"),
    JSON.stringify({ name: "vimblocks", version: "9.8.7" })
  );
  await writeFile(path.join(root, "dist", "index.html"), "modal");
  await writeFile(
    path.join(root, "dist", "package.json"),
    JSON.stringify({
      name: "vimblocks",
      version: "9.8.7",
      effect: true,
      logseq: { id: "logseq-plugin-vim-shortcuts" },
    })
  );
  await writeFile(path.join(root, "dist", "LICENSE"), "AGPL-3.0-only");
  await writeFile(
    path.join(root, "dist", "UPSTREAM-LICENSE-MIT"),
    "MIT upstream"
  );
  const result = await stageRelease({
    root,
    outputRoot: path.join(root, "release"),
    archive: false,
  });

  assert.equal(
    await readFile(path.join(result.stagePath, "index.html"), "utf8"),
    "modal"
  );
  assert.equal(
    await readFile(path.join(result.stagePath, "LICENSE"), "utf8"),
    "AGPL-3.0-only"
  );
  assert.equal(
    await readFile(path.join(result.stagePath, "UPSTREAM-LICENSE-MIT"), "utf8"),
    "MIT upstream"
  );
  assert.equal(
    JSON.parse(
      await readFile(path.join(result.stagePath, "package.json"), "utf8")
    ).effect,
    true
  );
  assert.deepEqual((await readdir(result.stagePath)).sort(), [
    "INSTALL.txt",
    "LICENSE",
    "UPSTREAM-LICENSE-MIT",
    "index.html",
    "package.json",
  ]);
  assert.match(
    await readFile(path.join(result.stagePath, "INSTALL.txt"), "utf8"),
    /Select the extracted vimblocks-9\.8\.7 folder/
  );
  assert.match(
    await readFile(path.join(result.stagePath, "INSTALL.txt"), "utf8"),
    /remove the separate Vimblocks Companion plugin/
  );
  assert.equal(path.basename(result.stagePath), "vimblocks-9.8.7");
});
