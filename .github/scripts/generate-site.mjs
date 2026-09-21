import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { getGeneratedFiles } from "./site-files.mjs";

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

for (const [relativePath, contents] of getGeneratedFiles()) {
  const destination = join(repositoryRoot, relativePath);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, contents, "utf8");
}

console.log("Generated site metadata and runtime files.");
