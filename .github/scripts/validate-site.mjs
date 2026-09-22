import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";
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
  validateMtaStsDocument
} from "./validate-site-helpers.mjs";

const root = join(fileURLToPath(new URL("../..", import.meta.url)));
validateSiteConfig(siteConfig, siteUrls);
const generatedFiles = renderSiteFiles(siteConfig, siteUrls);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function mustExist(path) {
  await access(path, constants.F_OK);
}

async function read(rootPath, relativePath) {
  return readFile(join(rootPath, relativePath), "utf8");
}

async function validateGeneratedSource(rootPath) {
  await Promise.all([...generatedFiles].map(async ([relativePath, expectedContents]) => {
    const actualContents = await read(rootPath, relativePath);
    assert(
      equivalentGeneratedContents(relativePath, actualContents, expectedContents),
      `${rootPath}: ${relativePath} is out of date; run npm run generate`
    );
  }));
}

async function validateContentChecks(rootPath) {
  const contentChecks = listSiteContentChecks(siteConfig, siteUrls);
  const uniqueFiles = [...new Set(contentChecks.map(({ file }) => file))];
  const contentByFile = new Map(await Promise.all(uniqueFiles.map(async (file) => [file, await read(rootPath, file)])));

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
}

async function validateSpecialCases(rootPath) {
  const manualTargetContents = Object.fromEntries(await Promise.all(
    Object.entries(manualReadTargets).map(async ([key, relativePath]) => [key, await read(rootPath, relativePath)])
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

  if (rootInfo.name === ".") {
    await validateGeneratedSource(rootInfo.path);
  }

  await validateContentChecks(rootInfo.path);
  await validateSpecialCases(rootInfo.path);
}

await runAcrossValidationRoots(root, validateRoot);

console.log("Validated source and dist site references.");
