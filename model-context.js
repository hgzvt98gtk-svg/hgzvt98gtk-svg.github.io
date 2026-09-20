if ("modelContext" in navigator) {
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
          const response = await fetch("/.well-known/agent-card.json");
          if (!response.ok) {
            throw new Error(`Failed to fetch /.well-known/agent-card.json: ${response.status}`);
          }
          return await response.json();
        }
      },
      {
        name: "get-api-catalog",
        description: "Get the API catalog for this site",
        inputSchema: { type: "object", properties: {} },
        execute: async () => {
          const response = await fetch("/.well-known/api-catalog");
          if (!response.ok) {
            throw new Error(`Failed to fetch /.well-known/api-catalog: ${response.status}`);
          }
          return await response.json();
        }
      }
    ]
  });
}
