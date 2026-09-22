import { generatedJsonFiles, siteFilePaths } from "./site-paths.mjs";

export function includesAttribute(contents, attribute, value) {
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`${attribute}\\s*=\\s*["']${escaped}["']`);
  return pattern.test(contents);
}

function normalizeWhitespace(contents) {
  return contents.replace(/\s+/g, " ").trim();
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

export function validateMtaStsDocument(documentText, siteConfig) {
  const lines = documentText.trim().split("\n");
  const mxLines = lines.filter((line) => line.startsWith("mx: "));

  return lines[0] === `version: ${siteConfig.mtaSts.version}`
    && lines[1] === `mode: ${siteConfig.mtaSts.mode}`
    && lines.at(-1) === `max_age: ${siteConfig.mtaSts.maxAge}`
    && mxLines.length === siteConfig.mtaSts.mx.length;
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
