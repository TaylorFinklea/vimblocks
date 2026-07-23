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

export async function stageRelease({
  root = repositoryRoot,
  outputRoot = path.join(root, "release"),
  archive = true,
} = {}) {
  const manifest = JSON.parse(
    await readFile(path.join(root, "package.json"), "utf8")
  );
  const version = manifest.version;
  const stageName = `vimblocks-${version}`;
  const stagePath = path.join(outputRoot, stageName);
  const archivePath = path.join(outputRoot, `${stageName}.zip`);

  await rm(stagePath, { recursive: true, force: true });
  await rm(archivePath, { force: true });
  await mkdir(stagePath, { recursive: true });
  await cp(path.join(root, "dist"), path.join(stagePath, "vimblocks"), {
    recursive: true,
  });
  await cp(
    path.join(root, "companion", "dist"),
    path.join(stagePath, "vimblocks-companion"),
    { recursive: true }
  );
  await writeFile(
    path.join(stagePath, "INSTALL.txt"),
    [
      "Vimblocks for Logseq 2.0.1",
      "",
      "1. Extract this archive to a permanent local folder.",
      "2. In Logseq, open the command palette and run: Go to plugins dashboard.",
      "3. Choose Load unpacked plugin.",
      "4. Select the extracted vimblocks folder.",
      "5. Repeat Load unpacked plugin and select vimblocks-companion.",
      "6. Confirm Vimblocks and Vimblocks Companion are enabled.",
      "",
      "Keep the extracted folder in place. Logseq loads the plugins from it.",
      "",
    ].join("\n")
  );

  if (archive) {
    execFileSync("zip", ["-qr", archivePath, stageName], {
      cwd: outputRoot,
      stdio: "inherit",
    });
  }

  return { archivePath, stagePath, version };
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  const result = await stageRelease();
  console.log(`Created ${result.archivePath}`);
}
