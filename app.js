const runtimeContract = Object.freeze({
  agentCardPath: "/.well-known/agent-card.json",
  apiCatalogPath: "/.well-known/api-catalog",
  siteStatus: "agent-ready",
  homeUrl: "https://hussamfaroug.com/",
  agentCardDescription: "Personal website and contact page for Hussam Faroug."
});
const runtimeJsonCache = new Map();

function isPlainObject(value) {
  return typeof value === "object" && value !== null && Object.getPrototypeOf(value) === Object.prototype;
}

const agentCardKeys = ["description","name","status","url"];
const apiCatalogKeys = ["apis","site"];

function hasExactKeys(value, expectedKeys) {
  const actualKeys = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  return actualKeys.length === expected.length && actualKeys.every((key, index) => key === expected[index]);
}

function isAgentCardPayload(value) {
  return isPlainObject(value)
    && hasExactKeys(value, agentCardKeys)
    && typeof value.description === "string"
    && typeof value.name === "string"
    && typeof value.status === "string"
    && typeof value.url === "string";
}

function isApiCatalogPayload(value) {
  return isPlainObject(value)
    && hasExactKeys(value, apiCatalogKeys)
    && Array.isArray(value.apis)
    && value.apis.every(isPlainObject)
    && typeof value.site === "string";
}

function validateAgentCardPayload(value) {
  if (!isAgentCardPayload(value)) {
    throw new Error("Failed to fetch agent card: invalid JSON shape");
  }
  if (value.name.length === 0) {
    throw new Error("Failed to fetch agent card: invalid name");
  }
  if (value.description !== runtimeContract.agentCardDescription) {
    throw new Error("Failed to fetch agent card: invalid description");
  }
  if (value.status !== runtimeContract.siteStatus) {
    throw new Error("Failed to fetch agent card: invalid status");
  }
  if (value.url !== runtimeContract.homeUrl) {
    throw new Error("Failed to fetch agent card: invalid url");
  }
  return Object.freeze({ ...value });
}

function validateApiCatalogPayload(value) {
  if (!isApiCatalogPayload(value)) {
    throw new Error("Failed to fetch api catalog: invalid JSON shape");
  }
  if (value.site !== runtimeContract.homeUrl) {
    throw new Error("Failed to fetch api catalog: invalid site");
  }
  return Object.freeze({
    site: value.site,
    apis: Object.freeze(value.apis.map((entry) => Object.freeze({ ...entry })))
  });
}

async function fetchJson(path, label, validatePayload) {
  const timeoutMs = 8000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
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

    let payload;
    try {
      payload = await response.json();
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw error;
      }
      throw new Error(`Failed to fetch ${label}: invalid JSON response`, { cause: error });
    }

    return validatePayload(payload);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`Failed to fetch ${label}: timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchCachedJson(path, label, validatePayload) {
  if (!runtimeJsonCache.has(path)) {
    runtimeJsonCache.set(
      path,
      fetchJson(path, label, validatePayload).catch((error) => {
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
      execute: async () => fetchCachedJson(runtimeContract.agentCardPath, "agent card", validateAgentCardPayload)
    },
    {
      name: "get-api-catalog",
      description: "Get the API catalog for this site",
      inputSchema: { type: "object", properties: {} },
      execute: async () => fetchCachedJson(runtimeContract.apiCatalogPath, "api catalog", validateApiCatalogPayload)
    }
  ]
});
