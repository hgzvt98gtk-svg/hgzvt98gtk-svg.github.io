import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { siteConfig } from "./site.config.mjs";
import { listXmlSyntaxFiles } from "./site-files.mjs";

const execFileAsync = promisify(execFile);
const root = fileURLToPath(new URL("../..", import.meta.url));
const roots = [".", "dist"];

async function mustExist(path) {
  await access(path, constants.F_OK);
}

for (const relativeRoot of roots) {
  const rootPath = join(root, relativeRoot);
  for (const relativePath of listXmlSyntaxFiles(siteConfig)) {
    const path = join(rootPath, relativePath);
    await mustExist(path);
    await execFileAsync("xmllint", ["--noout", path]);
  }
}

console.log("Validated XML/SVG syntax for source and dist.");
