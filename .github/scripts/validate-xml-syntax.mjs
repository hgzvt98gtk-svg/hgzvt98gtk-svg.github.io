import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { siteConfig } from "./site.config.mjs";
import { listXmlSyntaxFiles } from "./site-validation.mjs";
import { runAcrossValidationRoots } from "./validation-roots.mjs";

const execFileAsync = promisify(execFile);
const root = fileURLToPath(new URL("../..", import.meta.url));

async function mustExist(path) {
  await access(path, constants.F_OK);
}

async function validateRoot(rootInfo) {
  await Promise.all(listXmlSyntaxFiles(siteConfig).map(async (relativePath) => {
    const path = join(rootInfo.path, relativePath);
    await mustExist(path);
    await execFileAsync("xmllint", ["--noout", path]);
  }));
}

await runAcrossValidationRoots(root, validateRoot);

console.log("Validated XML/SVG syntax for source and dist.");
