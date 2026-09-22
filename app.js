const runtimeContract = Object.freeze({
  agentCardPath: "/.well-known/agent-card.json",
  apiCatalogPath: "/.well-known/api-catalog",
  siteStatus: "agent-ready"
});

    async function fetchJson(path, label) {
      const response = await fetch(path, {
        headers: {
          Accept: "application/json"
        }
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
