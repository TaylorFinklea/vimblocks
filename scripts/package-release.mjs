import { execFileSync } from "node:child_process";
import {
  cp,
  mkdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const repositoryRoot = path.resolve(path.dirname(scriptPath), "..");

export const PLUGIN_ID = "vimblocks";

// Logseq derives plugin and settings identity from the installed directory
// name, so this must not carry the version: a versioned folder makes every
// upgrade look like a different plugin and silently resets user settings.
const STAGE_NAME = PLUGIN_ID;

// Everything Logseq actually reads (LSPluginPkgConfig) plus the provenance a
// published artifact should carry. Build tooling is deliberately excluded.
const RUNTIME_MANIFEST_FIELDS = [
  "name",
  "version",
  "schemaVersion",
  "description",
  "author",
  "license",
  "repository",
  "homepage",
  "keywords",
  "main",
  "effect",
  "logseq",
];

export async function stageRelease({
  root = repositoryRoot,
  outputRoot = path.join(root, "release"),
  archive = true,
} = {}) {
  const manifest = JSON.parse(
    await readFile(path.join(root, "package.json"), "utf8")
  );
  const version = manifest.version;
  const stagePath = path.join(outputRoot, STAGE_NAME);
  const archivePath = path.join(outputRoot, `${STAGE_NAME}-${version}.zip`);

  await rm(stagePath, { recursive: true, force: true });
  await rm(archivePath, { force: true });
  await mkdir(stagePath, { recursive: true });
  await cp(path.join(root, "dist"), stagePath, {
    recursive: true,
  });

  const distManifest = JSON.parse(
    await readFile(path.join(root, "dist", "package.json"), "utf8")
  );
  if (distManifest.logseq?.id !== PLUGIN_ID) {
    throw new Error(
      `Refusing to stage: plugin id is ${
        distManifest.logseq?.id ?? "missing"
      }, expected ${PLUGIN_ID}.`
    );
  }
  const runtimeManifest = Object.fromEntries(
    RUNTIME_MANIFEST_FIELDS.filter((field) => field in distManifest).map(
      (field) => [field, distManifest[field]]
    )
  );
  await writeFile(
    path.join(stagePath, "package.json"),
    `${JSON.stringify(runtimeManifest, null, 2)}\n`
  );

  await writeFile(
    path.join(stagePath, "INSTALL.txt"),
    [
      `Vimblocks ${version} for Logseq 2.0.1`,
      "",
      "1. Extract this archive to a permanent local folder.",
      "2. In Logseq, open the command palette and run: Go to plugins dashboard.",
      "3. Choose Load unpacked plugin.",
      `4. Select the extracted ${STAGE_NAME} folder.`,
      "5. Confirm Vimblocks is enabled.",
      "6. If upgrading from 0.3.1 or earlier, remove the separate Vimblocks Companion plugin.",
      "",
      `Keep the folder named ${STAGE_NAME}. Logseq identifies the plugin and`,
      "its settings by that folder name, so renaming it or using a",
      "version-numbered folder resets your configuration.",
      "",
    ].join("\n")
  );

  if (archive) {
    execFileSync("zip", ["-qr", archivePath, STAGE_NAME], {
      cwd: outputRoot,
      stdio: "inherit",
    });
  }

  return { archivePath, stagePath, version };
}

// Real-build checks only. stageRelease itself stays hermetic so it can be
// exercised against a synthetic fixture.
async function assertBuiltBundle(root) {
  for (const asset of ["host-bridge.js", "key-token.js"]) {
    await readFile(path.join(root, "dist", asset), "utf8").catch(() => {
      throw new Error(
        `Refusing to stage: dist/${asset} is missing. The host bridge ships via Vite's public dir, so a build-config change can drop it silently.`
      );
    });
  }
  const entry = await readFile(path.join(root, "dist", "index.html"), "utf8");
  if (!/key-token\.js/.test(entry)) {
    throw new Error(
      "Refusing to stage: dist/index.html does not load key-token.js."
    );
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  await assertBuiltBundle(repositoryRoot);
  const result = await stageRelease();
  console.log(`Created ${result.archivePath}`);
}
