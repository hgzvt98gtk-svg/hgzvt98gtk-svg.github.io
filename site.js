if ("modelContext" in navigator) {
  const agentCardUrl = new URL("./.well-known/agent-card.json", import.meta.url);
  const apiCatalogUrl = new URL("./.well-known/api-catalog", import.meta.url);

  navigator.modelContext.provideContext({
    tools: [
      {
        name: "get-site-info",
        description: "Get information about hussamfaroug.com",
        inputSchema: { type: "object", properties: {} },
        execute: async () => {
          return { host: "hussamfaroug.com", status: "agent-ready" };
        }
      },
      {
        name: "get-agent-card",
        description: "Get the AI agent card for this site",
        inputSchema: { type: "object", properties: {} },
        execute: async () => {
          const response = await fetch(agentCardUrl);
          return await response.json();
        }
      },
      {
        name: "get-api-catalog",
        description: "Get the API catalog for this site",
        inputSchema: { type: "object", properties: {} },
        execute: async () => {
          const response = await fetch(apiCatalogUrl);
          return await response.text();
        }
      }
    ]
  });
}
