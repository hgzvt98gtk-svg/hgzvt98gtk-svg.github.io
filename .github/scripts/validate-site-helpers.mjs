import { generatedJsonFiles, siteFilePaths } from "./site-paths.mjs";

export function includesAttribute(contents, attribute, value) {
  const escaped = escapeRegex(value);
  const pattern = new RegExp(`${attribute}\\s*=\\s*["']${escaped}["']`);
  return pattern.test(contents);
}

function normalizeWhitespace(contents) {
  return contents.replace(/\s+/g, " ").trim();
}

export function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function equivalentGeneratedContents(relativePath, actualContents, expectedContents) {
  if (generatedJsonFiles.includes(relativePath)) {
    return JSON.stringify(JSON.parse(actualContents)) === JSON.stringify(JSON.parse(expectedContents));
  }

  return normalizeWhitespace(actualContents) === normalizeWhitespace(expectedContents);
}

export function assertNoOutdatedReferences(index, privacy, sitemap, llms) {
  return !/(social-preview\.png|https:\/\/hussamfaroug\.com\/Privacy[^.])/.test(`${index}\n${privacy}\n${sitemap}\n${llms}`);
}

export function validateAgentCard(agentCard, siteConfig, siteUrls) {
  return agentCard.name === siteConfig.personName
    && agentCard.url === siteUrls.home
    && agentCard.status === siteConfig.siteStatus;
}

export function validateApiCatalog(apiCatalog, siteUrls) {
  return apiCatalog.site === siteUrls.home && Array.isArray(apiCatalog.apis);
}

export function validateRuntimeAppScript(scriptText, siteConfig) {
  const requiredPatterns = [
    /async function fetchJson\s*\(/,
    /provideContext\s*\(/,
    /name\s*:\s*["']get-site-info["']/,
    /name\s*:\s*["']get-agent-card["']/,
    /name\s*:\s*["']get-api-catalog["']/,
    /status\s*:\s*runtimeContract\.siteStatus/,
    /fetchJson\s*\(\s*runtimeContract\.agentCardPath\s*,\s*["']agent card["']\s*\)/,
    /fetchJson\s*\(\s*runtimeContract\.apiCatalogPath\s*,\s*["']api catalog["']\s*\)/
  ];

  const requiredLiterals = [
    siteConfig.assetPaths.agentCard,
    siteConfig.assetPaths.apiCatalog,
    siteConfig.siteStatus,
    siteConfig.domain,
    `Get information about ${siteConfig.domain}`
  ];

  return requiredPatterns.every((pattern) => pattern.test(scriptText))
    && requiredLiterals.every((value) => new RegExp(escapeRegex(JSON.stringify(value))).test(scriptText));
}

export function validateRuntimeBootstrapScript(scriptText, siteConfig) {
  const quotedPath = escapeRegex(JSON.stringify(siteConfig.assetPaths.appScript));
  return /"modelContext"\s*in\s*navigator/.test(scriptText)
    && new RegExp(`import\\s*\\(\\s*${quotedPath}\\s*\\)`).test(scriptText);
}

export function validateMtaStsDocument(documentText, siteConfig) {
  const lines = documentText.trim().split("\n");
  const lineSet = new Set(lines);
  const mxLines = lines.filter((line) => line.startsWith("mx: "));

  return lines[0] === `version: ${siteConfig.mtaSts.version}`
    && lines[1] === `mode: ${siteConfig.mtaSts.mode}`
    && lines.at(-1) === `max_age: ${siteConfig.mtaSts.maxAge}`
    && mxLines.length === siteConfig.mtaSts.mx.length
    && siteConfig.mtaSts.mx.every((mx) => lineSet.has(`mx: ${mx}`));
}

export const manualReadTargets = Object.freeze({
  index: siteFilePaths.index,
  privacy: siteFilePaths.privacy,
  sitemap: siteFilePaths.sitemap,
  llms: siteFilePaths.llms,
  agentCard: siteFilePaths.agentCard,
  apiCatalog: siteFilePaths.apiCatalog,
  mtaSts: siteFilePaths.mtaSts
});
