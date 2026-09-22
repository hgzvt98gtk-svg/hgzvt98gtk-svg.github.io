import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { siteConfig } from "./site.config.mjs";
import { listXmlSyntaxFiles } from "./site-validation.mjs";
import { runAcrossValidationRoots } from "./validation-roots.mjs";

const execFileAsync = promisify(execFile);
const root = fileURLToPath(new URL("../..", import.meta.url));

async function validateRoot(rootInfo) {
  const xmlPaths = listXmlSyntaxFiles(siteConfig).map((relativePath) => join(rootInfo.path, relativePath));
  await execFileAsync("xmllint", ["--noout", ...xmlPaths]);
}

await runAcrossValidationRoots(root, validateRoot);

console.log("Validated XML/SVG syntax for source and dist.");
