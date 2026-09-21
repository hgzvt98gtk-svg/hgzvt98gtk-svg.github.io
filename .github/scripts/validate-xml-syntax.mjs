import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { siteConfig, siteUrls } from "./site.config.mjs";
import { listXmlSyntaxFiles } from "./site-files.mjs";
import { validateSiteConfig } from "./validate-config.mjs";

const root = join(fileURLToPath(new URL("../..", import.meta.url)));
const run = promisify(execFile);

validateSiteConfig(siteConfig, siteUrls);

async function mustExist(path) {
  await access(path, constants.F_OK);
}

async function validateXmllint(path) {
  await run("xmllint", ["--noout", path]);
}

const xmlTargets = listXmlSyntaxFiles(siteConfig, siteUrls);
for (const rootPath of [root, join(root, "dist")]) {
  await Promise.all(xmlTargets.map(async (relativePath) => {
    const fullPath = join(rootPath, relativePath);
    await mustExist(fullPath);
    await validateXmllint(fullPath);
  }));
}

console.log("Validated XML/SVG syntax in source and dist.");
