import { siteConfig } from "./site.config.mjs";

const homePage = siteConfig.pages[0];
const privacyPage = siteConfig.pages[1];
const socialPreviewUrl = `${siteConfig.origin}${siteConfig.assets.socialPreview}`;

function renderIndex() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="${siteConfig.themeColor}">
  <title>${siteConfig.siteTitle}</title>
  <meta name="description" content="${siteConfig.siteDescription}">
  <link rel="canonical" href="${siteConfig.origin}${homePage.path}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${siteConfig.origin}${homePage.path}">
  <meta property="og:title" content="${siteConfig.siteTitle}">
  <meta property="og:description" content="${siteConfig.siteDescription}">
  <meta property="og:site_name" content="${siteConfig.name}">
  <meta property="og:image" content="${socialPreviewUrl}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${siteConfig.siteTitle}">
  <meta name="twitter:description" content="${siteConfig.siteDescription}">
  <meta name="twitter:image" content="${socialPreviewUrl}">
  <link rel="icon" href="${siteConfig.assets.favicon}" type="image/svg+xml">
  <link rel="stylesheet" href="${siteConfig.assets.stylesheet}">
</head>
<body>
  <main class="landing" aria-label="${siteConfig.name} personal website">
    <h1>${siteConfig.domain}</h1>
  </main>
  <script type="module" src="${siteConfig.assets.runtimeScript}"></script>
</body>
</html>
`;
}

function renderPrivacy() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="${siteConfig.themeColor}">
  <title>${siteConfig.privacyTitle}</title>
  <meta name="description" content="${siteConfig.privacyDescription}">
  <link rel="canonical" href="${siteConfig.origin}${privacyPage.path}">
  <link rel="icon" href="${siteConfig.assets.favicon}" type="image/svg+xml">
  <link rel="stylesheet" href="${siteConfig.assets.stylesheet}">
</head>
<body class="document">
  <main class="policy" aria-labelledby="privacy-title">
    <h1 id="privacy-title">Privacy Policy</h1>
    <p class="updated">Last updated: ${siteConfig.privacyUpdated}</p>
    <h2>Overview</h2>
    <p>This is a static personal website. It does not provide accounts, contact forms, analytics, advertising, or embedded third-party scripts.</p>
    <h2>Information collected</h2>
    <p>The site does not intentionally collect personal information or set cookies. Hosting and delivery providers may process technical request data, such as IP address, browser information, and request time, in server logs and security systems.</p>
    <h2>Email and external links</h2>
    <p>If you email <a href="mailto:${siteConfig.contactEmail}">${siteConfig.contactEmail}</a>, your email provider will process your message. External websites have their own privacy policies.</p>
    <h2>Changes</h2>
    <p>This policy may be updated when the site or its providers change. The date above identifies the latest revision.</p>
  </main>
</body>
</html>
`;
}

function renderSiteTools() {
  return `const siteHost = ${JSON.stringify(siteConfig.domain)};
const agentCardPath = ${JSON.stringify(siteConfig.wellKnown.agentCard)};
const apiCatalogPath = ${JSON.stringify(siteConfig.wellKnown.apiCatalog)};

async function fetchJson(path) {
  const response = await fetch(path, {
    headers: {
      accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(\`Request failed with status \${response.status}\`);
  }

  return await response.json();
}

async function fetchJsonSafely(path) {
  try {
    return await fetchJson(path);
  } catch (error) {
    return {
      status: "unavailable",
      path,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

if ("modelContext" in navigator && typeof navigator.modelContext?.provideContext === "function") {
  navigator.modelContext.provideContext({
    tools: [
      {
        name: "get-site-info",
        description: "Get information about ${siteConfig.domain}",
        inputSchema: { type: "object", properties: {} },
        execute: async () => ({ host: siteHost, status: "agent-ready" })
      },
      {
        name: "get-agent-card",
        description: "Get the AI agent card for this site",
        inputSchema: { type: "object", properties: {} },
        execute: async () => await fetchJsonSafely(agentCardPath)
      },
      {
        name: "get-api-catalog",
        description: "Get the API catalog for this site",
        inputSchema: { type: "object", properties: {} },
        execute: async () => await fetchJsonSafely(apiCatalogPath)
      }
    ]
  });
}
`;
}

function renderRobots() {
  return `User-agent: *
Allow: /

Sitemap: ${siteConfig.origin}/sitemap.xml
`;
}

function renderSitemap() {
  const urls = siteConfig.pages.map((page) => `  <url>
    <loc>${siteConfig.origin}${page.path}</loc>
    <lastmod>${page.lastModified}</lastmod>
  </url>`).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

function renderLlms() {
  const pageLinks = siteConfig.pages.map((page) => `- [${page.title}](${siteConfig.origin}${page.path}): ${page.description}`).join("\n");

  return `# ${siteConfig.name}

> Personal website of ${siteConfig.name}.

## About
- ${siteConfig.name} — personal site and contact page.

## Pages
${pageLinks}

## Contact
- Email: ${siteConfig.contactEmail}
`;
}

function renderAgentCard() {
  return JSON.stringify({
    name: siteConfig.name,
    url: `${siteConfig.origin}/`,
    description: `Personal website and contact page for ${siteConfig.name}.`,
    status: "agent-ready"
  }, null, 2) + "\n";
}

function renderApiCatalog() {
  return JSON.stringify({
    site: `${siteConfig.origin}/`,
    apis: []
  }, null, 2) + "\n";
}

function renderCname() {
  return `${siteConfig.domain}
`;
}

function renderMtaSts() {
  const { version, mode, maxAge, mx } = siteConfig.mtaSts;
  return `version: ${version}
mode: ${mode}
${mx.map((host) => `mx: ${host}`).join("\n")}
max_age: ${maxAge}
`;
}

export function getGeneratedFiles() {
  return new Map([
    ["index.html", renderIndex()],
    ["Privacy.html", renderPrivacy()],
    ["site-tools.mjs", renderSiteTools()],
    ["robots.txt", renderRobots()],
    ["sitemap.xml", renderSitemap()],
    ["llms.txt", renderLlms()],
    ["CNAME", renderCname()],
    [".well-known/agent-card.json", renderAgentCard()],
    [".well-known/api-catalog", renderApiCatalog()],
    [".well-known/mta-sts.txt", renderMtaSts()]
  ]);
}
