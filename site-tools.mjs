const siteHost = "hussamfaroug.com";
const agentCardPath = "/.well-known/agent-card.json";
const apiCatalogPath = "/.well-known/api-catalog";

async function fetchJson(path) {
  const response = await fetch(path, {
    headers: {
      accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return await response.json();
}

async function fetchJsonSafely(path) {
  try {
    return await fetchJson(path);
  } catch (error) {
    return {
      status: "unavailable",
      path,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

if ("modelContext" in navigator && typeof navigator.modelContext?.provideContext === "function") {
  navigator.modelContext.provideContext({
    tools: [
      {
        name: "get-site-info",
        description: "Get information about hussamfaroug.com",
        inputSchema: { type: "object", properties: {} },
        execute: async () => ({ host: siteHost, status: "agent-ready" })
      },
      {
        name: "get-agent-card",
        description: "Get the AI agent card for this site",
        inputSchema: { type: "object", properties: {} },
        execute: async () => await fetchJsonSafely(agentCardPath)
      },
      {
        name: "get-api-catalog",
        description: "Get the API catalog for this site",
        inputSchema: { type: "object", properties: {} },
        execute: async () => await fetchJsonSafely(apiCatalogPath)
      }
    ]
  });
}
