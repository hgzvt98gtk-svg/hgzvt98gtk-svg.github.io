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
          const res = await fetch("/.well-known/agent-card.json");
          if (!res.ok) throw new Error(`Failed to load agent card: ${res.status}`);
          return await res.json();
        }
      },
      {
        name: "get-api-catalog",
        description: "Get the API catalog for this site",
        inputSchema: { type: "object", properties: {} },
        execute: async () => {
          const res = await fetch("/.well-known/api-catalog");
          if (!res.ok) throw new Error(`Failed to load API catalog: ${res.status}`);
          return await res.json();
        }
      }
    ]
  });
}
