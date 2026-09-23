const runtimeContract = Object.freeze({
  agentCardPath: "/.well-known/agent-card.json",
  apiCatalogPath: "/.well-known/api-catalog",
  siteStatus: "agent-ready",
  siteHost: "hussamfaroug.com",
  homeUrl: "https://hussamfaroug.com/",
  agentCardDescription: "Personal website and contact page for Hussam Faroug."
});
const runtimeJsonCache = new Map();

function isPlainObject(value) {
      return typeof value === "object" && value !== null && Object.getPrototypeOf(value) === Object.prototype;
}

function assertExactKeys(value, expectedKeys, label) {
      const actualKeys = Object.keys(value).sort();
      const expected = [...expectedKeys].sort();
      if (actualKeys.length !== expected.length || actualKeys.some((key, index) => key !== expected[index])) {
        throw new Error(`Failed to fetch ${label}: unexpected JSON shape`);
      }
}

function validateAgentCardPayload(value) {
      if (!isPlainObject(value)) {
        throw new Error("Failed to fetch agent card: expected object response");
      }
      assertExactKeys(value, ["description", "name", "status", "url"], "agent card");
      if (typeof value.name !== "string" || value.name.length === 0) {
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
      if (!isPlainObject(value)) {
        throw new Error("Failed to fetch api catalog: expected object response");
      }
      assertExactKeys(value, ["apis", "site"], "api catalog");
      if (typeof value.site !== "string" || value.site !== runtimeContract.homeUrl) {
        throw new Error("Failed to fetch api catalog: invalid site");
      }
      if (!Array.isArray(value.apis) || !value.apis.every((entry) => isPlainObject(entry))) {
        throw new Error("Failed to fetch api catalog: invalid apis");
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
      const pageOrigin = globalThis.location?.origin;
      if (typeof pageOrigin !== "string" || pageOrigin.length === 0) {
        throw new Error(`Failed to fetch ${label}: missing page origin`);
      }

      const url = new URL(path, pageOrigin);
      if (url.origin !== pageOrigin || url.pathname !== path || url.search || url.hash) {
        throw new Error(`Failed to fetch ${label}: unexpected URL`);
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
        throw new Error(`Failed to fetch ${label}: HTTP ${response.status}`);
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.toLowerCase().includes("application/json")) {
        throw new Error(`Failed to fetch ${label}: expected application/json response`);
      }

      try {
        const payload = await response.json();
        if (label === "agent card") {
          return validateAgentCardPayload(payload);
        }
        if (label === "api catalog") {
          return validateApiCatalogPayload(payload);
        }
        throw new Error(`Failed to fetch ${label}: unsupported payload type`);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          throw new Error(`Failed to fetch ${label}: timed out after ${timeoutMs}ms`);
        }
        if (error instanceof Error && error.message.startsWith(`Failed to fetch ${label}:`)) {
          throw error;
        }
        throw new Error(`Failed to fetch ${label}: invalid JSON response`);
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
      description: "Get information about hussamfaroug.com",
      inputSchema: { type: "object", properties: {} },
      execute: async () => ({ host: "hussamfaroug.com", status: runtimeContract.siteStatus })
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
