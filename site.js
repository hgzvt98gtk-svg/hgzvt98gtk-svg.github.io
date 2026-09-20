if ("modelContext" in navigator) {
  const agentCardUrl = new URL("./.well-known/agent-card.json", import.meta.url);
  const apiCatalogUrl = new URL("./.well-known/api-catalog", import.meta.url);
  const fetchRequired = async (url) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Request failed for ${url.pathname}: ${response.status}`);
    return response;
  };

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
          const response = await fetchRequired(agentCardUrl);
          return await response.json();
        }
      },
      {
        name: "get-api-catalog",
        description: "Get the API catalog for this site",
        inputSchema: { type: "object", properties: {} },
        execute: async () => {
          const response = await fetchRequired(apiCatalogUrl);
          return await response.text();
        }
      }
    ]
  });
}
