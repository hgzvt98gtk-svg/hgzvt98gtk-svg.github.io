import { generatedJsonFiles } from "./site-paths.mjs";
import {
  isAgentCardPayload,
  isApiCatalogPayload
} from "./runtime-contract.mjs";

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
  return isAgentCardPayload(agentCard)
    && agentCard.name === siteConfig.personName
    && agentCard.url === siteUrls.home
    && agentCard.description === siteConfig.descriptions.agentCard
    && agentCard.status === siteConfig.siteStatus;
}

export function validateApiCatalog(apiCatalog, siteUrls) {
  return isApiCatalogPayload(apiCatalog)
    && apiCatalog.site === siteUrls.home
}

export function validateRuntimeAppScript(scriptText, siteConfig) {
  const requiredPatterns = [
    /if\s*\(\s*["']modelContext["']\s+in\s+navigator\s*\)/,
    /async function fetchJson\s*\(/,
    /function validateAgentCardPayload\s*\(/,
    /function validateApiCatalogPayload\s*\(/,
    /isAgentCardPayload\s*\(/,
    /isApiCatalogPayload\s*\(/,
    /provideContext\s*\(/,
    /name\s*:\s*["']get-site-info["']/,
    /name\s*:\s*["']get-agent-card["']/,
    /name\s*:\s*["']get-api-catalog["']/,
    /status\s*:\s*runtimeContract\.siteStatus/,
    /fetch(?:Cached)?Json\s*\(\s*runtimeContract\.agentCardPath\s*,\s*["']agent card["']\s*,\s*validateAgentCardPayload\s*\)/,
    /fetch(?:Cached)?Json\s*\(\s*runtimeContract\.apiCatalogPath\s*,\s*["']api catalog["']\s*,\s*validateApiCatalogPayload\s*\)/
  ];

  const requiredLiterals = [
    siteConfig.assetPaths.agentCard,
    siteConfig.assetPaths.apiCatalog,
    siteConfig.siteStatus,
    siteConfig.domain,
    siteConfig.descriptions.agentCard,
    "agent card",
    "api catalog",
    "description",
    "status",
    "url",
    "apis",
    "site",
    `Get information about ${siteConfig.domain}`
  ];

  return requiredPatterns.every((pattern) => pattern.test(scriptText))
    && requiredLiterals.every((value) => new RegExp(escapeRegex(JSON.stringify(value))).test(scriptText));
}

export function validateRuntimeBootstrapScript(scriptText, siteConfig) {
  const quotedPath = escapeRegex(JSON.stringify(siteConfig.assetPaths.appScript));
  return new RegExp(`<script\\s+type=["']module["']\\s+src=["']${quotedPath}["']\\s*><\\/script>`).test(scriptText);
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
