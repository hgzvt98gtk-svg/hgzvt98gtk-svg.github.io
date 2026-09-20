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
      }
    ]
  });
}
