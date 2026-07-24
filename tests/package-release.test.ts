import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { stageRelease } from "../scripts/package-release.mjs";

test("stages both loadable plugins and installation instructions", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "vimblocks-package-"));
  await mkdir(path.join(root, "dist"), { recursive: true });
  await mkdir(path.join(root, "companion", "dist"), { recursive: true });
  await writeFile(
    path.join(root, "package.json"),
    JSON.stringify({ name: "vimblocks", version: "9.8.7" })
  );
  await writeFile(path.join(root, "dist", "index.html"), "modal");
  await writeFile(path.join(root, "dist", "LICENSE"), "AGPL-3.0-only");
  await writeFile(
    path.join(root, "dist", "UPSTREAM-LICENSE-MIT"),
    "MIT upstream"
  );
  await writeFile(
    path.join(root, "companion", "dist", "index.html"),
    "companion"
  );
  await writeFile(
    path.join(root, "companion", "dist", "LICENSE"),
    "AGPL-3.0-only"
  );
  await writeFile(
    path.join(root, "companion", "dist", "UPSTREAM-LICENSE-MIT"),
    "MIT upstream"
  );

  const result = await stageRelease({
    root,
    outputRoot: path.join(root, "release"),
    archive: false,
  });

  assert.equal(
    await readFile(path.join(result.stagePath, "vimblocks", "index.html"), "utf8"),
    "modal"
  );
  assert.equal(
    await readFile(
      path.join(result.stagePath, "vimblocks-companion", "index.html"),
      "utf8"
    ),
    "companion"
  );
  for (const plugin of ["vimblocks", "vimblocks-companion"]) {
    assert.equal(
      await readFile(path.join(result.stagePath, plugin, "LICENSE"), "utf8"),
      "AGPL-3.0-only"
    );
    assert.equal(
      await readFile(
        path.join(result.stagePath, plugin, "UPSTREAM-LICENSE-MIT"),
        "utf8"
      ),
      "MIT upstream"
    );
  }
  assert.match(
    await readFile(path.join(result.stagePath, "INSTALL.txt"), "utf8"),
    /Load unpacked plugin/
  );
  assert.equal(path.basename(result.stagePath), "vimblocks-9.8.7");
});
