import { siteFilePaths } from "./site-paths.mjs";
import {
  agentCardKeys,
  apiCatalogKeys,
  hasExactKeys,
  isAgentCardPayload,
  isApiCatalogPayload,
  isPlainObject
} from "./runtime-contract.mjs";
import { escapeJsString } from "./escape-js-string.mjs";

export function renderRuntimeFiles(siteConfig, siteUrls) {
  return new Map([
    [siteFilePaths.appScript, `const runtimeContract = Object.freeze({
  agentCardPath: ${escapeJsString(siteConfig.assetPaths.agentCard)},
  apiCatalogPath: ${escapeJsString(siteConfig.assetPaths.apiCatalog)},
  siteStatus: ${escapeJsString(siteConfig.siteStatus)},
  homeUrl: ${escapeJsString(siteUrls.home)},
  agentCardDescription: ${escapeJsString(siteConfig.descriptions.agentCard)}
});
const runtimeJsonCache = new Map();

${isPlainObject.toString()}

const agentCardKeys = ${JSON.stringify(agentCardKeys)};
const apiCatalogKeys = ${JSON.stringify(apiCatalogKeys)};

${hasExactKeys.toString()}

${isAgentCardPayload.toString()}

${isApiCatalogPayload.toString()}

function validateAgentCardPayload(value) {
          if (!isAgentCardPayload(value)) {
            throw new Error("Failed to fetch agent card: invalid JSON shape");
          }
          if (value.name.length === 0) {
            throw new Error("Failed to fetch agent card: invalid name");
          }
      if (typeof value.description !== "string" || value.description !== runtimeContract.agentCardDescription) {
        throw new Error("Failed to fetch agent card: invalid description");
      }
      if (typeof value.status !== "string" || value.status !== runtimeContract.siteStatus) {
        throw new Error("Failed to fetch agent card: invalid status");
      }
      if (typeof value.url !== "string" || value.url !== runtimeContract.homeUrl) {
        throw new Error("Failed to fetch agent card: invalid url");
      }
      return Object.freeze({ ...value });
}

function validateApiCatalogPayload(value) {
      if (!isApiCatalogPayload(value)) {
        throw new Error("Failed to fetch api catalog: invalid JSON shape");
      }
      if (typeof value.site !== "string" || value.site !== runtimeContract.homeUrl) {
        throw new Error("Failed to fetch api catalog: invalid site");
      }
      return Object.freeze({
        site: value.site,
        apis: Object.freeze(value.apis.map((entry) => Object.freeze({ ...entry })))
      });
}

async function fetchJson(path, label) {
      const timeoutMs = 8000;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const pageOrigin = globalThis.location?.origin;
        if (typeof pageOrigin !== "string" || pageOrigin.length === 0) {
          throw new Error(\`Failed to fetch \${label}: missing page origin\`);
        }

        const url = new URL(path, pageOrigin);
        if (url.origin !== pageOrigin || url.pathname !== path || url.search || url.hash) {
          throw new Error(\`Failed to fetch \${label}: unexpected URL\`);
        }

        const response = await fetch(url, {
          cache: "no-store",
          credentials: "same-origin",
          headers: {
            Accept: "application/json"
          },
          redirect: "error",
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(\`Failed to fetch \${label}: HTTP \${response.status}\`);
        }

        const contentType = response.headers.get("content-type") ?? "";
        if (!contentType.toLowerCase().includes("application/json")) {
          throw new Error(\`Failed to fetch \${label}: expected application/json response\`);
        }

        let payload;
        try {
          payload = await response.json();
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") {
            throw error;
          }
          throw new Error(\`Failed to fetch \${label}: invalid JSON response\`, { cause: error });
        }

        if (label === "agent card") {
          return validateAgentCardPayload(payload);
        }
        if (label === "api catalog") {
          return validateApiCatalogPayload(payload);
        }
        throw new Error(\`Failed to fetch \${label}: unsupported payload type\`);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          throw new Error(\`Failed to fetch \${label}: timed out after \${timeoutMs}ms\`);
        }
        throw error;
      } finally {
        clearTimeout(timeoutId);
      }
    }

async function fetchCachedJson(path, label) {
      if (!runtimeJsonCache.has(path)) {
        runtimeJsonCache.set(
          path,
          fetchJson(path, label).catch((error) => {
            runtimeJsonCache.delete(path);
            throw error;
          })
        );
      }
      return runtimeJsonCache.get(path);
}

navigator.modelContext.provideContext({
  tools: [
    {
      name: "get-site-info",
      description: ${escapeJsString(`Get information about ${siteConfig.domain}`)},
      inputSchema: { type: "object", properties: {} },
      execute: async () => ({ host: ${escapeJsString(siteConfig.domain)}, status: runtimeContract.siteStatus })
    },
    {
      name: "get-agent-card",
      description: "Get the AI agent card for this site",
      inputSchema: { type: "object", properties: {} },
      execute: async () => fetchCachedJson(runtimeContract.agentCardPath, "agent card")
    },
    {
      name: "get-api-catalog",
      description: "Get the API catalog for this site",
      inputSchema: { type: "object", properties: {} },
      execute: async () => fetchCachedJson(runtimeContract.apiCatalogPath, "api catalog")
    }
  ]
});
`]
  ]);
}
