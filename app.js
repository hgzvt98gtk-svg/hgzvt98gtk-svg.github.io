if ("modelContext" in navigator) {
  navigator.modelContext.provideContext({
    tools: [
      {
        name: "get-site-info",
        description: "Get information about hussamfaroug.com",
        inputSchema: { type: "object", properties: {} },
        execute: async () => ({ host: "hussamfaroug.com", status: "agent-ready" })
      },
      {
        name: "get-agent-card",
        description: "Get the AI agent card for this site",
        inputSchema: { type: "object", properties: {} },
        execute: async () => {
          const response = await fetch("/.well-known/agent-card.json");
          return await response.json();
        }
      },
      {
        name: "get-api-catalog",
        description: "Get the API catalog for this site",
        inputSchema: { type: "object", properties: {} },
        execute: async () => {
          const response = await fetch("/.well-known/api-catalog");
          return await response.json();
        }
      }
    ]
  });
}
