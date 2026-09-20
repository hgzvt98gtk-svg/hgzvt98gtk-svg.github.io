const fetchTimeoutMs = 5000;

async function fetchJson(path) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), fetchTimeoutMs);

  try {
    const response = await fetch(path, { signal: controller.signal });
    if (!response.ok) throw new Error("Request failed");
    return await response.json();
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw new Error("Request timed out");
    throw new Error("Metadata unavailable");
  } finally {
    clearTimeout(timeoutId);
  }
}

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
        execute: async () => fetchJson("/.well-known/agent-card.json")
      },
      {
        name: "get-api-catalog",
        description: "Get the API catalog for this site",
        inputSchema: { type: "object", properties: {} },
        execute: async () => fetchJson("/.well-known/api-catalog")
      }
    ]
  });
}
