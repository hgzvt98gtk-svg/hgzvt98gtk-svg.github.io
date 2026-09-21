import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { siteConfig, siteUrls } from "./site.config.mjs";
import { renderSiteFiles } from "./site-files.mjs";
import { validateSiteConfig } from "./validate-config.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
validateSiteConfig(siteConfig, siteUrls);
const files = renderSiteFiles(siteConfig, siteUrls);

for (const [relativePath, contents] of files) {
  const path = join(root, relativePath);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, contents);
}

console.log(`Generated ${files.size} site files from shared config.`);
