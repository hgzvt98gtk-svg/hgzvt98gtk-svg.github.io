import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { XMLValidator } from "fast-xml-parser";
import { siteConfig } from "./site.config.mjs";
import { listXmlSyntaxFiles } from "./site-validation.mjs";
import { runAcrossValidationRoots } from "./validation-roots.mjs";

const root = fileURLToPath(new URL("../..", import.meta.url));

async function validateRoot(rootInfo) {
  const xmlPaths = listXmlSyntaxFiles(siteConfig).map((relativePath) => join(rootInfo.path, relativePath));

  await Promise.all(xmlPaths.map(async (path) => {
    const contents = await readFile(path, "utf8");
    const result = XMLValidator.validate(contents);
    if (result !== true) {
      const { err } = result;
      const location = Number.isInteger(err?.line) && Number.isInteger(err?.col)
        ? `:${err.line}:${err.col}`
        : "";
      throw new Error(`Invalid XML syntax in ${path}${location}: ${err?.msg ?? "unknown parse error"}`);
    }
  }));
}

await runAcrossValidationRoots(root, validateRoot);

console.log("Validated XML/SVG syntax for source and dist.");
