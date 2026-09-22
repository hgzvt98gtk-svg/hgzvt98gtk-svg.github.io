import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { siteConfig, siteUrls } from "./site.config.mjs";
import { renderSiteFiles } from "./site-files.mjs";
import { listRequiredSiteFiles, listSiteContentChecks } from "./site-validation.mjs";
import { validateSiteConfig } from "./validate-config.mjs";

const root = join(fileURLToPath(new URL("../..", import.meta.url)));
validateSiteConfig(siteConfig, siteUrls);
const generatedFiles = renderSiteFiles(siteConfig, siteUrls);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function includesAttribute(contents, attribute, value) {
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`${attribute}\\s*=\\s*["']${escaped}["']`);
  return pattern.test(contents);
}

function normalizeWhitespace(contents) {
  return contents.replace(/\s+/g, " ").trim();
}

function equivalentGeneratedContents(relativePath, actualContents, expectedContents) {
  if (relativePath === ".well-known/agent-card.json" || relativePath === ".well-known/api-catalog") {
    return JSON.stringify(JSON.parse(actualContents)) === JSON.stringify(JSON.parse(expectedContents));
  }

  return normalizeWhitespace(actualContents) === normalizeWhitespace(expectedContents);
}

async function mustExist(path) {
  await access(path, constants.F_OK);
}

async function read(rootPath, relativePath) {
  return readFile(join(rootPath, relativePath), "utf8");
}

async function validateRoot(rootPath, { expectGeneratedSource } = {}) {
  const required = listRequiredSiteFiles(siteConfig, generatedFiles);

  await Promise.all(required.map((relativePath) => mustExist(join(rootPath, relativePath))));

  if (expectGeneratedSource) {
    await Promise.all([...generatedFiles].map(async ([relativePath, expectedContents]) => {
      const actualContents = await read(rootPath, relativePath);
      assert(
        equivalentGeneratedContents(relativePath, actualContents, expectedContents),
        `${rootPath}: ${relativePath} is out of date; run npm run generate`
      );
    }));
  }

  const contentChecks = listSiteContentChecks(siteConfig, siteUrls);
  const contentByFile = new Map(await Promise.all([...new Set(contentChecks.map(({ file }) => file))].map(async (file) => [file, await read(rootPath, file)])));

  for (const check of contentChecks) {
    const contents = contentByFile.get(check.file);
    if (check.type === "attribute") {
      assert(includesAttribute(contents, check.attribute, check.value), `${rootPath}: ${check.message}`);
      continue;
    }
    if (check.type === "contains") {
      assert(contents.includes(check.value), `${rootPath}: ${check.message}`);
      continue;
    }
    if (check.type === "regex") {
      assert(new RegExp(check.pattern).test(contents), `${rootPath}: ${check.message}`);
    }
  }

  const [index, privacy, sitemap, llms, agentCardText, apiCatalogText, mtaSts] = await Promise.all([
    read(rootPath, "index.html"),
    read(rootPath, "Privacy.html"),
    read(rootPath, "sitemap.xml"),
    read(rootPath, "llms.txt"),
    read(rootPath, ".well-known/agent-card.json"),
    read(rootPath, ".well-known/api-catalog"),
    read(rootPath, ".well-known/mta-sts.txt")
  ]);
  assert(!/(social-preview\.png|https:\/\/hussamfaroug\.com\/Privacy[^.])/.test(`${index}\n${privacy}\n${sitemap}\n${llms}`), `${rootPath}: found outdated URL references`);

  const agentCard = JSON.parse(agentCardText);
  const apiCatalog = JSON.parse(apiCatalogText);
  assert(agentCard.name === siteConfig.personName, `${rootPath}: unexpected agent-card name`);
  assert(agentCard.url === siteUrls.home, `${rootPath}: unexpected agent-card url`);
  assert(agentCard.status === siteConfig.siteStatus, `${rootPath}: unexpected agent-card status`);
  assert(apiCatalog.site === siteUrls.home, `${rootPath}: unexpected api-catalog site`);
  assert(Array.isArray(apiCatalog.apis), `${rootPath}: api-catalog apis must be an array`);

  const lines = mtaSts.trim().split("\n");
  assert(lines[0] === `version: ${siteConfig.mtaSts.version}`, `${rootPath}: invalid MTA-STS version`);
  assert(lines[1] === `mode: ${siteConfig.mtaSts.mode}`, `${rootPath}: invalid MTA-STS mode`);
  assert(lines.at(-1) === `max_age: ${siteConfig.mtaSts.maxAge}`, `${rootPath}: invalid MTA-STS max_age`);
  assert(lines.filter((line) => line.startsWith("mx: ")).length === siteConfig.mtaSts.mx.length, `${rootPath}: invalid MTA-STS mx count`);
}

await validateRoot(root, { expectGeneratedSource: true });
await validateRoot(join(root, "dist"));

console.log("Validated source and dist site references.");
