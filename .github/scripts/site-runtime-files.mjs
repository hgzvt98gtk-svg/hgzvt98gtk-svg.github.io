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
    [siteConfig.assetPaths.bootstrapScript.slice(1), `if ("modelContext" in navigator) {
  import(${escapeJsString(siteConfig.assetPaths.appScript)});
}
`],
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

const fetchTimeoutMs = 8000;
const fetchMaxRetries = 2;
const fetchRetryBaseDelayMs = 500;
const maxLoggedPayloadLength = 2000;

function describeValue(value) {
  try {
    const text = JSON.stringify(value);
    if (text === undefined) {
      return String(value);
    }
    return text.length > maxLoggedPayloadLength ? \`\${text.slice(0, maxLoggedPayloadLength)}…\` : text;
  } catch {
    return String(value);
  }
}

function describeType(value) {
  if (value === null) {
    return "null";
  }
  return Array.isArray(value) ? "array" : typeof value;
}

function describeShapeMismatch(value, expectedKeys, fieldChecks) {
  if (!isPlainObject(value)) {
    return { reason: "Payload is not a JSON object", expected: "object", actual: describeType(value) };
  }
  if (!hasExactKeys(value, expectedKeys)) {
    return { reason: "Key mismatch", expected: [...expectedKeys].sort(), actual: Object.keys(value).sort() };
  }
  for (const [key, expected, isValid] of fieldChecks) {
    if (!isValid(value[key])) {
      return { reason: \`Invalid \${key}\`, expected, actual: describeType(value[key]) };
    }
  }
  return { reason: "Invalid JSON shape", expected: "valid payload", actual: "unknown mismatch" };
}

function payloadValidationError(subject, reason, expected, actual, payload) {
  const message = \`\${subject} validation failed: \${reason}. Expected: \${describeValue(expected)}, got: \${describeValue(actual)}\\nReceived payload: \${describeValue(payload)}\`;
  console.error(message);
  const error = new Error(message);
  error.transient = false;
  return error;
}

function validateAgentCardPayload(value) {
  const subject = "Agent card";
  if (!isAgentCardPayload(value)) {
    const mismatch = describeShapeMismatch(value, agentCardKeys, [
      ["description", "string", (field) => typeof field === "string"],
      ["name", "string", (field) => typeof field === "string"],
      ["status", "string", (field) => typeof field === "string"],
      ["url", "string", (field) => typeof field === "string"]
    ]);
    throw payloadValidationError(subject, mismatch.reason, mismatch.expected, mismatch.actual, value);
  }
  if (value.name.length === 0) {
    throw payloadValidationError(subject, "Name mismatch", "non-empty string", value.name, value);
  }
  if (value.description !== runtimeContract.agentCardDescription) {
    throw payloadValidationError(subject, "Description mismatch", runtimeContract.agentCardDescription, value.description, value);
  }
  if (value.status !== runtimeContract.siteStatus) {
    throw payloadValidationError(subject, "Status mismatch", runtimeContract.siteStatus, value.status, value);
  }
  if (value.url !== runtimeContract.homeUrl) {
    throw payloadValidationError(subject, "URL mismatch", runtimeContract.homeUrl, value.url, value);
  }
  return Object.freeze({ ...value });
}

function validateApiCatalogPayload(value) {
  const subject = "API catalog";
  if (!isApiCatalogPayload(value)) {
    const mismatch = describeShapeMismatch(value, apiCatalogKeys, [
      ["apis", "array of objects", (field) => Array.isArray(field) && field.every(isPlainObject)],
      ["site", "string", (field) => typeof field === "string"]
    ]);
    throw payloadValidationError(subject, mismatch.reason, mismatch.expected, mismatch.actual, value);
  }
  if (value.site !== runtimeContract.homeUrl) {
    throw payloadValidationError(subject, "Site mismatch", runtimeContract.homeUrl, value.site, value);
  }
  return Object.freeze({
    site: value.site,
    apis: Object.freeze(value.apis.map((entry) => Object.freeze({ ...entry })))
  });
}

function fetchError(message, transient, cause) {
  const error = cause === undefined ? new Error(message) : new Error(message, { cause });
  error.transient = transient;
  return error;
}

function isAbortError(error) {
  return typeof error === "object" && error !== null && error.name === "AbortError";
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJsonAttempt(url, label, validatePayload) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), fetchTimeoutMs);
  try {
    let response;
    try {
      response = await fetch(url, {
        cache: "no-store",
        credentials: "same-origin",
        headers: {
          Accept: "application/json"
        },
        redirect: "error",
        signal: controller.signal
      });
    } catch (error) {
      if (isAbortError(error) && controller.signal.aborted) {
        throw fetchError(\`Failed to fetch \${label}: timed out after \${fetchTimeoutMs}ms\`, true, error);
      }
      throw fetchError(\`Failed to fetch \${label}: network error (\${error?.message ?? error})\`, true, error);
    }

    if (!response.ok) {
      throw fetchError(\`Failed to fetch \${label}: HTTP \${response.status}\`, response.status >= 500);
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("application/json")) {
      throw fetchError(\`Failed to fetch \${label}: expected application/json response, got \${JSON.stringify(contentType)}\`, false);
    }

    let payload;
    try {
      payload = await response.json();
    } catch (error) {
      if (isAbortError(error) && controller.signal.aborted) {
        throw fetchError(\`Failed to fetch \${label}: timed out after \${fetchTimeoutMs}ms while reading response\`, true, error);
      }
      throw fetchError(\`Failed to fetch \${label}: invalid JSON response\`, false, error);
    }

    return validatePayload(payload);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchJson(path, label, validatePayload) {
  const pageOrigin = globalThis.location?.origin;
  if (typeof pageOrigin !== "string" || pageOrigin.length === 0) {
    throw fetchError(\`Failed to fetch \${label}: missing page origin\`, false);
  }

  const url = new URL(path, pageOrigin);
  if (url.origin !== pageOrigin || url.pathname !== path || url.search || url.hash) {
    throw fetchError(\`Failed to fetch \${label}: unexpected URL\`, false);
  }

  const maxAttempts = fetchMaxRetries + 1;
  for (let attempt = 0; ; attempt++) {
    try {
      return await fetchJsonAttempt(url, label, validatePayload);
    } catch (error) {
      if (error?.transient !== true) {
        throw error;
      }
      if (attempt + 1 >= maxAttempts) {
        console.error(\`Giving up on \${label} (\${url.pathname}) after \${maxAttempts} attempts:\`, error.message);
        throw fetchError(\`\${error.message} (failed after \${maxAttempts} attempts)\`, true, error);
      }
      const delayMs = 2 ** attempt * fetchRetryBaseDelayMs;
      console.warn(\`Retrying \${label} (\${url.pathname}) in \${delayMs}ms after attempt \${attempt + 1}/\${maxAttempts} failed:\`, error.message);
      await wait(delayMs);
    }
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

function logToolRegistrationError(error) {
  console.error("Failed to register modelContext tools; continuing without tools:", error);
}

try {
  Promise.resolve(navigator.modelContext.provideContext({
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
        execute: async () => fetchCachedJson(runtimeContract.agentCardPath, "agent card", validateAgentCardPayload)
      },
      {
        name: "get-api-catalog",
        description: "Get the API catalog for this site",
        inputSchema: { type: "object", properties: {} },
        execute: async () => fetchCachedJson(runtimeContract.apiCatalogPath, "api catalog", validateApiCatalogPayload)
      }
    ]
  })).catch(logToolRegistrationError);
} catch (error) {
  logToolRegistrationError(error);
}
`]
  ]);
}
