import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { siteConfig, siteUrls } from "./site.config.mjs";
import { listRequiredSiteFiles, listSiteContentChecks, renderSiteFiles, toRelativeAssetPath } from "./site-files.mjs";
import { validateSiteConfig } from "./validate-config.mjs";

const root = join(fileURLToPath(new URL("../..", import.meta.url)));
validateSiteConfig(siteConfig, siteUrls);
const generatedFiles = renderSiteFiles(siteConfig, siteUrls);
const requiredFiles = listRequiredSiteFiles(generatedFiles);
const contentChecks = listSiteContentChecks(siteConfig, siteUrls);
const pathsToRead = [...new Set([
  ...contentChecks.map((check) => check.file),
  toRelativeAssetPath(siteConfig.assetPaths.agentCard),
  toRelativeAssetPath(siteConfig.assetPaths.apiCatalog),
  toRelativeAssetPath(siteConfig.assetPaths.mtaSts)
])];

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

function runContentCheck(content, check, rootPath) {
  const message = `${rootPath}: ${check.message}`;
  if (check.type === "attribute") {
    assert(includesAttribute(content, check.attribute, check.value), message);
    return;
  }

  if (check.type === "includes") {
    assert(content.includes(check.value), message);
    return;
  }

  if (check.type === "notRegex") {
    assert(!check.value.test(content), message);
    return;
  }

  throw new Error(`${rootPath}: unknown check type ${check.type}`);
}

async function validateRoot(rootPath, { expectGeneratedSource } = {}) {
  await Promise.all(requiredFiles.map((relativePath) => mustExist(join(rootPath, relativePath))));

  if (expectGeneratedSource) {
    await Promise.all([...generatedFiles].map(async ([relativePath, expectedContents]) => {
      const actualContents = await read(rootPath, relativePath);
      assert(
        equivalentGeneratedContents(relativePath, actualContents, expectedContents),
        `${rootPath}: ${relativePath} is out of date; run npm run generate`
      );
    }));
  }

  const contentByPath = new Map(await Promise.all(pathsToRead.map(async (relativePath) => [relativePath, await read(rootPath, relativePath)])));

  for (const check of contentChecks) {
    runContentCheck(contentByPath.get(check.file) ?? "", check, rootPath);
  }

  const agentCard = JSON.parse(contentByPath.get(toRelativeAssetPath(siteConfig.assetPaths.agentCard)) ?? "");
  const apiCatalog = JSON.parse(contentByPath.get(toRelativeAssetPath(siteConfig.assetPaths.apiCatalog)) ?? "");
  assert(agentCard.name === siteConfig.personName, `${rootPath}: unexpected agent-card name`);
  assert(agentCard.url === siteUrls.home, `${rootPath}: unexpected agent-card url`);
  assert(agentCard.status === siteConfig.siteStatus, `${rootPath}: unexpected agent-card status`);
  assert(apiCatalog.site === siteUrls.home, `${rootPath}: unexpected api-catalog site`);
  assert(Array.isArray(apiCatalog.apis), `${rootPath}: api-catalog apis must be an array`);

  const lines = (contentByPath.get(toRelativeAssetPath(siteConfig.assetPaths.mtaSts)) ?? "").trim().split("\n");
  assert(lines[0] === `version: ${siteConfig.mtaSts.version}`, `${rootPath}: invalid MTA-STS version`);
  assert(lines[1] === `mode: ${siteConfig.mtaSts.mode}`, `${rootPath}: invalid MTA-STS mode`);
  assert(lines.at(-1) === `max_age: ${siteConfig.mtaSts.maxAge}`, `${rootPath}: invalid MTA-STS max_age`);
  assert(lines.filter((line) => line.startsWith("mx: ")).length === siteConfig.mtaSts.mx.length, `${rootPath}: invalid MTA-STS mx count`);
}

await validateRoot(root, { expectGeneratedSource: true });
await validateRoot(join(root, "dist"));

console.log("Validated source and dist site references.");
