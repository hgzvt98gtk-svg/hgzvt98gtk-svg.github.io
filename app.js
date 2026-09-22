const runtimeContract = Object.freeze({
  agentCardPath: "/.well-known/agent-card.json",
  apiCatalogPath: "/.well-known/api-catalog",
  siteStatus: "agent-ready"
});

async function fetchJson(path, label) {
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
        redirect: "error"
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch ${label}: HTTP ${response.status}`);
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.toLowerCase().includes("application/json")) {
        throw new Error(`Failed to fetch ${label}: expected application/json response`);
      }

      try {
        return await response.json();
      } catch {
        throw new Error(`Failed to fetch ${label}: invalid JSON response`);
      }
    }

if ("modelContext" in navigator) {
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
        execute: async () => fetchJson(runtimeContract.agentCardPath, "agent card")
      },
      {
        name: "get-api-catalog",
        description: "Get the API catalog for this site",
        inputSchema: { type: "object", properties: {} },
        execute: async () => fetchJson(runtimeContract.apiCatalogPath, "api catalog")
      }
    ]
  });
}
