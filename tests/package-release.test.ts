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

const fixture = async (
  distManifest: Record<string, unknown> = {
    name: "vimblocks",
    version: "9.8.7",
    effect: true,
    logseq: { id: "vimblocks" },
  }
) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "vimblocks-package-"));
  await mkdir(path.join(root, "dist"), { recursive: true });
  await writeFile(
    path.join(root, "package.json"),
    JSON.stringify({ name: "vimblocks", version: "9.8.7" })
  );
  await writeFile(path.join(root, "dist", "index.html"), "modal");
  await writeFile(
    path.join(root, "dist", "package.json"),
    JSON.stringify(distManifest)
  );
  await writeFile(path.join(root, "dist", "LICENSE"), "AGPL-3.0-only");
  await writeFile(
    path.join(root, "dist", "UPSTREAM-LICENSE-MIT"),
    "MIT upstream"
  );
  return root;
};

test("stages one loadable plugin and installation instructions", async () => {
  const root = await fixture();
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
  assert.deepEqual((await readdir(result.stagePath)).sort(), [
    "INSTALL.txt",
    "LICENSE",
    "UPSTREAM-LICENSE-MIT",
    "index.html",
    "package.json",
  ]);
  assert.match(
    await readFile(path.join(result.stagePath, "INSTALL.txt"), "utf8"),
    /remove the separate Vimblocks Companion plugin/
  );
});

test("names the extracted folder without the version", async () => {
  // Logseq derives plugin AND settings identity from the installed directory
  // name. A versioned folder means every upgrade looks like a different plugin
  // and silently resets the user's keybindings, cursor colour, and profile.
  const root = await fixture();
  const result = await stageRelease({
    root,
    outputRoot: path.join(root, "release"),
    archive: false,
  });

  assert.equal(path.basename(result.stagePath), "vimblocks");
  assert.match(
    await readFile(path.join(result.stagePath, "INSTALL.txt"), "utf8"),
    /Select the extracted vimblocks folder/
  );
  // The version still identifies the download itself.
  assert.equal(path.basename(result.archivePath), "vimblocks-9.8.7.zip");
});

test("pins the published plugin id", async () => {
  // Nothing else guards this, and a bad merge reverting it would silently
  // collide with the upstream plugin and orphan every user's settings.
  const root = await fixture();
  const result = await stageRelease({
    root,
    outputRoot: path.join(root, "release"),
    archive: false,
  });

  const staged = JSON.parse(
    await readFile(path.join(result.stagePath, "package.json"), "utf8")
  );
  assert.equal(staged.logseq.id, "vimblocks");
  assert.equal(staged.effect, true);
});

test("refuses to stage a manifest with the wrong plugin id", async () => {
  const root = await fixture({
    name: "vimblocks",
    version: "9.8.7",
    effect: true,
    logseq: { id: "logseq-plugin-vim-shortcuts" },
  });

  await assert.rejects(
    stageRelease({
      root,
      outputRoot: path.join(root, "release"),
      archive: false,
    }),
    /plugin id/i
  );
});

test("ships a runtime-only manifest", async () => {
  // Logseq reads only id, main, entry, title, mode, themes, icon and effect
  // (LSPluginPkgConfig). Build tooling has no business in a published artifact.
  const root = await fixture({
    name: "vimblocks",
    version: "9.8.7",
    effect: true,
    license: "AGPL-3.0-only",
    main: "index.html",
    description: "Vim editing for Logseq",
    logseq: { id: "vimblocks", title: "Vimblocks" },
    packageManager: "pnpm@11.13.1",
    scripts: { build: "vite build" },
    devDependencies: { typescript: "^5.9.3" },
    dependencies: { vue: "^3.5.26" },
  });
  const result = await stageRelease({
    root,
    outputRoot: path.join(root, "release"),
    archive: false,
  });

  const staged = JSON.parse(
    await readFile(path.join(result.stagePath, "package.json"), "utf8")
  );
  assert.deepEqual(Object.keys(staged).sort(), [
    "description",
    "effect",
    "license",
    "logseq",
    "main",
    "name",
    "version",
  ]);
  assert.equal(staged.logseq.title, "Vimblocks");
});
