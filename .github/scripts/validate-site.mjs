import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { siteConfig } from "./site.config.mjs";
import { renderSiteFiles } from "./site-files.mjs";
import { siteUrls } from "./site-urls.mjs";
import { listRequiredSiteFiles, listSiteContentChecks } from "./site-validation.mjs";
import { validateSiteConfig } from "./validate-config.mjs";
import { runAcrossValidationRoots } from "./validation-roots.mjs";
import {
  assertNoOutdatedReferences,
  equivalentGeneratedContents,
  includesAttribute,
  manualReadTargets,
  validateAgentCard,
  validateApiCatalog,
  validateRuntimeAppScript,
  validateMtaStsDocument
} from "./validate-site-helpers.mjs";

const root = join(fileURLToPath(new URL("../..", import.meta.url)));
validateSiteConfig(siteConfig, siteUrls);
const generatedFiles = renderSiteFiles(siteConfig, siteUrls);
const generatedVerbatimFiles = new Map(
  [...generatedFiles].filter(([relativePath]) => ![".html", ".htm", ".css", ".js", ".mjs"].includes(extname(relativePath).toLowerCase()))
);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function mustExist(path) {
  await access(path, constants.F_OK);
}

function createRootReader(rootPath) {
  const cache = new Map();
  return async function read(relativePath) {
    if (!cache.has(relativePath)) {
      cache.set(relativePath, readFile(join(rootPath, relativePath), "utf8"));
    }
    return cache.get(relativePath);
  };
}

async function validateGeneratedSource(rootPath, read, filesToValidate) {
  await Promise.all([...filesToValidate].map(async ([relativePath, expectedContents]) => {
    const actualContents = await read(relativePath);
    assert(
      equivalentGeneratedContents(relativePath, actualContents, expectedContents),
      `${rootPath}: ${relativePath} is out of date; run npm run generate`
    );
  }));
}

async function validateContentChecks(rootPath, read) {
  const contentChecks = listSiteContentChecks(siteConfig, siteUrls);
  const uniqueFiles = [...new Set(contentChecks.map(({ file }) => file))];
  const contentByFile = new Map(await Promise.all(uniqueFiles.map(async (file) => [file, await read(file)])));

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
      continue;
    }
    if (check.type === "runtimeScript") {
      assert(validateRuntimeAppScript(contents, siteConfig), `${rootPath}: ${check.message}`);
    }
  }
}

async function validateSpecialCases(rootPath, read) {
  const manualTargetContents = Object.fromEntries(await Promise.all(
    Object.entries(manualReadTargets).map(async ([key, relativePath]) => [key, await read(relativePath)])
  ));
  const { index, privacy, sitemap, llms, agentCard: agentCardText, apiCatalog: apiCatalogText, mtaSts: mtaStsText } = manualTargetContents;

  assert(assertNoOutdatedReferences(index, privacy, sitemap, llms), `${rootPath}: found outdated URL references`);

  const agentCard = JSON.parse(agentCardText);
  const apiCatalog = JSON.parse(apiCatalogText);
  assert(validateAgentCard(agentCard, siteConfig, siteUrls), `${rootPath}: invalid agent-card metadata`);
  assert(validateApiCatalog(apiCatalog, siteUrls), `${rootPath}: invalid api-catalog metadata`);
  assert(validateMtaStsDocument(mtaStsText, siteConfig), `${rootPath}: invalid MTA-STS document`);
}

async function validateRoot(rootInfo) {
  const required = listRequiredSiteFiles(siteConfig, generatedFiles);
  await Promise.all(required.map((relativePath) => mustExist(join(rootInfo.path, relativePath))));
  const read = createRootReader(rootInfo.path);

  if (rootInfo.name === ".") {
    await validateGeneratedSource(rootInfo.path, read, generatedFiles);
  } else {
    await validateGeneratedSource(rootInfo.path, read, generatedVerbatimFiles);
  }

  await validateContentChecks(rootInfo.path, read);
  await validateSpecialCases(rootInfo.path, read);
}

await runAcrossValidationRoots(root, validateRoot);

console.log("Validated source and dist site references.");
