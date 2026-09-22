import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { siteConfig } from "./site.config.mjs";
import { renderSiteFiles } from "./site-files.mjs";
import { siteUrls } from "./site-urls.mjs";
import { listSiteContentChecks } from "./site-validation.mjs";
import { listRenderedAndStaticFiles } from "./site-paths.mjs";
import { assert, validateSiteConfig } from "./validate-config.mjs";
import { runAcrossValidationRoots } from "./validation-roots.mjs";
import {
  assertNoOutdatedReferences,
  equivalentGeneratedContents,
  includesAttribute,
  manualReadTargets,
  validateAgentCard,
  validateApiCatalog,
  validateRuntimeBootstrapScript,
  validateRuntimeAppScript,
  validateMtaStsDocument
} from "./validate-site-helpers.mjs";

const root = join(fileURLToPath(new URL("../..", import.meta.url)));
validateSiteConfig(siteConfig, siteUrls);
const generatedFiles = renderSiteFiles(siteConfig, siteUrls);
const contentChecks = listSiteContentChecks(siteConfig, siteUrls);
const contentCheckUniqueFiles = [...new Set(contentChecks.map(({ file }) => file))];
const manualReadTargetEntries = Object.entries(manualReadTargets);
const manualReadTargetPaths = manualReadTargetEntries.map(([, relativePath]) => relativePath);
const readTargets = new Set([
  ...generatedFiles.keys(),
  ...contentCheckUniqueFiles,
  ...manualReadTargetPaths
]);
const requiredFiles = listRenderedAndStaticFiles(siteConfig, generatedFiles);
const requiredExistenceOnlyFiles = requiredFiles.filter((relativePath) => !readTargets.has(relativePath));

function createRootReader(rootPath) {
  const cache = new Map();
  return async function read(relativePath) {
    if (!cache.has(relativePath)) {
      cache.set(relativePath, readFile(join(rootPath, relativePath), "utf8"));
    }
    return cache.get(relativePath);
  };
}

const contentCheckValidators = {
  attribute: (check) => (contents) => includesAttribute(contents, check.attribute, check.value),
  contains: (check) => (contents) => contents.includes(check.value),
  regex: (check) => {
    const pattern = new RegExp(check.pattern);
    return (contents) => pattern.test(contents);
  },
  runtimeScript: () => (contents) => validateRuntimeAppScript(contents, siteConfig),
  runtimeBootstrap: () => (contents) => validateRuntimeBootstrapScript(contents, siteConfig)
};

const compiledContentChecks = contentChecks.map((check) => {
  const compile = contentCheckValidators[check.type];
  assert(typeof compile === "function", `Unknown content check type: ${check.type}`);
  return { ...check, validate: compile(check) };
});

async function validateGeneratedSource(rootPath, read) {
  await Promise.all([...generatedFiles].map(async ([relativePath, expectedContents]) => {
    const actualContents = await read(relativePath);
    assert(
      equivalentGeneratedContents(relativePath, actualContents, expectedContents),
      `${rootPath}: ${relativePath} is out of date; run npm run generate`
    );
  }));
}
async function validateContentChecks(rootPath, read) {
  const contentByFile = new Map(await Promise.all(contentCheckUniqueFiles.map(async (file) => [file, await read(file)])));

  for (const check of compiledContentChecks) {
    const contents = contentByFile.get(check.file);
    assert(check.validate(contents), `${rootPath}: ${check.message}`);
  }
}

async function validateSpecialCases(rootPath, read) {
  const manualTargetContents = Object.fromEntries(await Promise.all(
    manualReadTargetEntries.map(async ([key, relativePath]) => [key, await read(relativePath)])
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
  await Promise.all(
    requiredExistenceOnlyFiles.map((relativePath) => access(join(rootInfo.path, relativePath), constants.F_OK))
  );
  const read = createRootReader(rootInfo.path);

  if (rootInfo.name === ".") {
    await validateGeneratedSource(rootInfo.path, read);
  }

  await validateContentChecks(rootInfo.path, read);
  await validateSpecialCases(rootInfo.path, read);
}

await runAcrossValidationRoots(root, validateRoot);

console.log("Validated source and dist site references.");
