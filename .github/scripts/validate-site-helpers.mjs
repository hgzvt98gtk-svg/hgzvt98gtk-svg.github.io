import { generatedJsonFiles, siteFilePaths } from "./site-paths.mjs";
import { parse } from "acorn";

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

function walkAst(node, visit) {
  if (!node || typeof node !== "object") {
    return;
  }

  if (Array.isArray(node)) {
    for (const item of node) {
      walkAst(item, visit);
    }
    return;
  }

  if ("type" in node && typeof node.type === "string") {
    visit(node);
  }

  for (const value of Object.values(node)) {
    if (value && typeof value === "object") {
      walkAst(value, visit);
    }
  }
}

export function validateRuntimeAppScript(scriptText, siteConfig) {
  const program = parse(scriptText, { ecmaVersion: "latest", sourceType: "module" });
  const fetchTargets = new Set();
  const statusValues = new Set();

  walkAst(program, (node) => {
    if (node.type === "CallExpression" && node.callee?.type === "Identifier" && node.callee.name === "fetch") {
      const [firstArgument] = node.arguments;
      if (firstArgument?.type === "Literal" && typeof firstArgument.value === "string") {
        fetchTargets.add(firstArgument.value);
      }
    }

    if (node.type === "Property") {
      const keyName = node.key?.type === "Identifier"
        ? node.key.name
        : node.key?.type === "Literal"
          ? node.key.value
          : null;
      if (keyName === "status" && node.value?.type === "Literal" && typeof node.value.value === "string") {
        statusValues.add(node.value.value);
      }
    }
  });

  return fetchTargets.has(siteConfig.assetPaths.agentCard)
    && fetchTargets.has(siteConfig.assetPaths.apiCatalog)
    && statusValues.has(siteConfig.siteStatus);
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
