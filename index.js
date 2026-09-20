const siteOrigin =
  window.location.hostname === "hussamfaroug.com"
    ? window.location.origin
    : "https://hussamfaroug.com";

function siteUrl(path) {
  return new URL(path, siteOrigin);
}

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
          const res = await fetch(siteUrl("/.well-known/agent-card.json"));
          return await res.json();
        }
      },
      {
        name: "get-api-catalog",
        description: "Get the API catalog for this site",
        inputSchema: { type: "object", properties: {} },
        execute: async () => {
          const res = await fetch(siteUrl("/.well-known/api-catalog"));
          return await res.json();
        }
      }
    ]
  });
}
