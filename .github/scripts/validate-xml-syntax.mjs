import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { siteConfig, siteUrls } from "./site.config.mjs";
import { listRequiredSiteFiles, listXmlSyntaxFiles, renderSiteFiles } from "./site-files.mjs";
import { validateSiteConfig } from "./validate-config.mjs";

const run = promisify(execFile);
const root = join(fileURLToPath(new URL("../..", import.meta.url)));

validateSiteConfig(siteConfig, siteUrls);
const generatedFiles = renderSiteFiles(siteConfig, siteUrls);
const xmlSyntaxFiles = listXmlSyntaxFiles(listRequiredSiteFiles(generatedFiles));

for (const rootPath of [".", "dist"]) {
  for (const relativePath of xmlSyntaxFiles) {
    try {
      await run("xmllint", ["--noout", join(root, rootPath, relativePath)]);
    } catch (error) {
      if (error?.code === "ENOENT") {
        throw new Error("xmllint is required but not installed");
      }
      throw error;
    }
  }
}

console.log(`Validated XML/SVG syntax for ${xmlSyntaxFiles.length} files in source and dist.`);
