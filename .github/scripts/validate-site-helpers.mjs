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
  return !/(social-preview\.png|https:\/\/hussamfaroug\.com\/Privacy(?=$|[\s"'<>]))/.test(`${index}\n${privacy}\n${sitemap}\n${llms}`);
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
  const literalStrings = new Set();
  const toolNames = new Set();
  let fetchesAgentCard = false;
  let fetchesApiCatalog = false;

  walkAst(program, (node) => {
    if (node.type === "Literal" && typeof node.value === "string") {
      literalStrings.add(node.value);
    }

    if (node.type === "Property") {
      const keyName = node.key?.type === "Identifier"
        ? node.key.name
        : node.key?.type === "Literal" && typeof node.key.value === "string"
          ? node.key.value
          : null;
      if (keyName === "name" && node.value?.type === "Literal" && typeof node.value.value === "string") {
        toolNames.add(node.value.value);
      }
    }

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

    if (
      node.type === "CallExpression"
      && (
        (node.callee.type === "Identifier" && node.callee.name === "fetch")
        || (
          node.callee.type === "MemberExpression"
          && (
            (node.callee.property.type === "Identifier" && node.callee.property.name === "fetch")
            || (node.callee.property.type === "Literal" && node.callee.property.value === "fetch")
          )
        )
      )
    ) {
      const firstArg = node.arguments[0];
      const fetchedLiteral = firstArg?.type === "Literal" && typeof firstArg.value === "string"
        ? firstArg.value
        : null;
      const fetchedMember = firstArg?.type === "MemberExpression"
        ? firstArg.property?.type === "Identifier"
          ? firstArg.property.name
          : firstArg.property?.type === "Literal" && typeof firstArg.property.value === "string"
            ? firstArg.property.value
            : null
        : null;

      if (fetchedLiteral === siteConfig.assetPaths.agentCard || fetchedMember === "agentCardPath") {
        fetchesAgentCard = true;
      }
      if (fetchedLiteral === siteConfig.assetPaths.apiCatalog || fetchedMember === "apiCatalogPath") {
        fetchesApiCatalog = true;
      }
    }
  });

  return hasProvideContextCall
    && literalStrings.has(siteConfig.assetPaths.agentCard)
    && literalStrings.has(siteConfig.assetPaths.apiCatalog)
    && literalStrings.has(siteConfig.siteStatus)
    && toolNames.has("get-site-info")
    && toolNames.has("get-agent-card")
    && toolNames.has("get-api-catalog")
    && fetchesAgentCard
    && fetchesApiCatalog;
}

export function validateMtaStsDocument(documentText, siteConfig) {
  const normalizedText = documentText.replace(/\r\n/g, "\n");
  const lines = normalizedText.endsWith("\n")
    ? normalizedText.slice(0, -1).split("\n")
    : normalizedText.split("\n");
  const expectedLines = [
    `version: ${siteConfig.mtaSts.version}`,
    `mode: ${siteConfig.mtaSts.mode}`,
    ...siteConfig.mtaSts.mx.map((mx) => `mx: ${mx}`),
    `max_age: ${siteConfig.mtaSts.maxAge}`
  ];

  return JSON.stringify(lines) === JSON.stringify(expectedLines);
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
