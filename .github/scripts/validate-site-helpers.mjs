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
  let hasProvideContextCall = false;
  let hasRuntimeContract = false;

  walkAst(program, (node) => {
    if (node.type === "CallExpression" && node.callee?.type === "MemberExpression") {
      const propertyName = node.callee.property?.type === "Identifier"
        ? node.callee.property.name
        : node.callee.property?.type === "Literal"
          ? node.callee.property.value
          : null;
      if (propertyName === "provideContext") {
        hasProvideContextCall = true;
      }
    }

    if (node.type !== "ObjectExpression") {
      return;
    }

    const objectEntries = Object.fromEntries(node.properties.flatMap((property) => {
      if (property.type !== "Property" || property.computed) {
        return [];
      }
      const keyName = property.key?.type === "Identifier"
        ? property.key.name
        : property.key?.type === "Literal"
          ? property.key.value
          : null;
      if (typeof keyName !== "string") {
        return [];
      }
      if (property.value?.type !== "Literal" || typeof property.value.value !== "string") {
        return [];
      }
      return [[keyName, property.value.value]];
    }));

    hasRuntimeContract = hasRuntimeContract || (
      objectEntries.agentCardPath === siteConfig.assetPaths.agentCard
      && objectEntries.apiCatalogPath === siteConfig.assetPaths.apiCatalog
      && objectEntries.siteStatus === siteConfig.siteStatus
    );
  });

  return hasProvideContextCall && hasRuntimeContract;
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
