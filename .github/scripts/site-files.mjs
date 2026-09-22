import { siteFilePaths } from "./site-paths.mjs";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeJsString(value) {
  return JSON.stringify(String(value));
}

function encodeMailtoAddress(email) {
  return encodeURI(`mailto:${String(email)}`);
}

function renderPageFiles(siteConfig, siteUrls) {
  const personName = escapeHtml(siteConfig.personName);
  const domain = escapeHtml(siteConfig.domain);
  const homeTitle = escapeHtml(siteConfig.pageTitles.home);
  const privacyTitle = escapeHtml(siteConfig.pageTitles.privacy);
  const homeDescription = escapeHtml(siteConfig.descriptions.home);
  const privacyDescription = escapeHtml(siteConfig.descriptions.privacy);
  const canonicalHome = escapeHtml(siteUrls.home);
  const canonicalPrivacy = escapeHtml(siteUrls.privacy);
  const socialPreviewUrl = escapeHtml(siteUrls.socialPreview);
  const iconPath = escapeHtml(siteConfig.assetPaths.icon);
  const stylesheetPath = escapeHtml(siteConfig.assetPaths.stylesheet);
  const appScriptImportPath = escapeJsString(siteConfig.assetPaths.appScript);
  const privacyLastUpdated = escapeHtml(siteConfig.privacyLastUpdated);
  const email = escapeHtml(siteConfig.email);
  const mailtoHref = escapeHtml(encodeMailtoAddress(siteConfig.email));

  return new Map([
    [siteFilePaths.index, `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="${escapeHtml(siteConfig.themeColor)}">
  <title>${homeTitle}</title>
  <meta name="description" content="${homeDescription}">
  <link rel="canonical" href="${canonicalHome}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${canonicalHome}">
  <meta property="og:title" content="${homeTitle}">
  <meta property="og:description" content="${homeDescription}">
  <meta property="og:site_name" content="${personName}">
  <meta property="og:image" content="${socialPreviewUrl}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${homeTitle}">
  <meta name="twitter:description" content="${homeDescription}">
  <meta name="twitter:image" content="${socialPreviewUrl}">
  <link rel="icon" href="${iconPath}" type="image/svg+xml">
  <link rel="stylesheet" href="${stylesheetPath}">
</head>
<body>
  <main class="landing" aria-label="${personName} personal website">
    <h1>${domain}</h1>
  </main>
  <script type="module">
    if ("modelContext" in navigator) {
      import(${appScriptImportPath});
    }
  </script>
</body>
</html>
`],
    [siteFilePaths.privacy, `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="${escapeHtml(siteConfig.themeColor)}">
  <title>${privacyTitle}</title>
  <meta name="description" content="${privacyDescription}">
  <link rel="canonical" href="${canonicalPrivacy}">
  <link rel="icon" href="${iconPath}" type="image/svg+xml">
  <link rel="stylesheet" href="${stylesheetPath}">
</head>
<body class="document">
  <main class="policy" aria-labelledby="privacy-title">
    <h1 id="privacy-title">Privacy Policy</h1>
    <p class="updated">Last updated: ${privacyLastUpdated}</p>
    <h2>Overview</h2>
    <p>This is a static personal website. It does not provide accounts, contact forms, analytics, advertising, or embedded third-party scripts.</p>
    <h2>Information collected</h2>
    <p>The site does not intentionally collect personal information or set cookies. Hosting and delivery providers may process technical request data, such as IP address, browser information, and request time, in server logs and security systems.</p>
    <h2>Email and external links</h2>
    <p>If you email <a href="${mailtoHref}">${email}</a>, your email provider will process your message. External websites have their own privacy policies.</p>
    <h2>Changes</h2>
    <p>This policy may be updated when the site or its providers change. The date above identifies the latest revision.</p>
  </main>
</body>
</html>
`]
  ]);
}

function renderRuntimeFiles(siteConfig, siteUrls) {
  return new Map([
    [siteFilePaths.appScript, `const runtimeContract = Object.freeze({
  agentCardPath: ${escapeJsString(siteConfig.assetPaths.agentCard)},
  apiCatalogPath: ${escapeJsString(siteConfig.assetPaths.apiCatalog)},
  siteStatus: ${escapeJsString(siteConfig.siteStatus)}
});

async function fetchJson(path, label) {
      const timeoutMs = 8000;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      const pageOrigin = globalThis.location?.origin;
      if (typeof pageOrigin !== "string" || pageOrigin.length === 0) {
        throw new Error(\`Failed to fetch \${label}: missing page origin\`);
      }

      const url = new URL(path, pageOrigin);
      if (url.origin !== pageOrigin || url.pathname !== path || url.search || url.hash) {
        throw new Error(\`Failed to fetch \${label}: unexpected URL\`);
      }

      const response = await fetch(url, {
        cache: "no-store",
        credentials: "same-origin",
        headers: {
          Accept: "application/json"
        },
        redirect: "error",
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(\`Failed to fetch \${label}: HTTP \${response.status}\`);
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.toLowerCase().includes("application/json")) {
        throw new Error(\`Failed to fetch \${label}: expected application/json response\`);
      }

      try {
        return await response.json();
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          throw new Error(\`Failed to fetch \${label}: timed out after \${timeoutMs}ms\`);
        }
        throw new Error(\`Failed to fetch \${label}: invalid JSON response\`);
      } finally {
        clearTimeout(timeoutId);
      }
    }

if ("modelContext" in navigator) {
  navigator.modelContext.provideContext({
    tools: [
      {
        name: "get-site-info",
        description: ${escapeJsString(`Get information about ${siteConfig.domain}`)},
        inputSchema: { type: "object", properties: {} },
        execute: async () => ({ host: ${escapeJsString(siteConfig.domain)}, status: runtimeContract.siteStatus })
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
`],
    [siteFilePaths.robots, `User-agent: *
Allow: /

Sitemap: ${siteUrls.sitemap}
`],
    [siteFilePaths.sitemap, `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrls.home}</loc>
    <lastmod>${siteConfig.privacyLastModified}</lastmod>
  </url>
  <url>
    <loc>${siteUrls.privacy}</loc>
    <lastmod>${siteConfig.privacyLastModified}</lastmod>
  </url>
</urlset>
`],
    [siteFilePaths.llms, `# ${siteConfig.personName}

> Personal website of ${siteConfig.personName}.

## About
- ${siteConfig.personName} — personal site and contact page.

## Pages
- [Home](${siteUrls.home}): Personal landing page.
- [Privacy](${siteUrls.privacy}): Privacy policy.

## Contact
- Email: ${siteConfig.email}
`]
  ]);
}

function renderWellKnownFiles(siteConfig, siteUrls) {
  return new Map([
    [siteFilePaths.agentCard, `${JSON.stringify({
      name: siteConfig.personName,
      url: siteUrls.home,
      description: siteConfig.descriptions.agentCard,
      status: siteConfig.siteStatus
    }, null, 2)}
`],
    [siteFilePaths.apiCatalog, `${JSON.stringify({
      site: siteUrls.home,
      apis: siteConfig.apis
    }, null, 2)}
`],
    [siteFilePaths.mtaSts, `version: ${siteConfig.mtaSts.version}
mode: ${siteConfig.mtaSts.mode}
${siteConfig.mtaSts.mx.map((mx) => `mx: ${mx}`).join("\n")}
max_age: ${siteConfig.mtaSts.maxAge}
`]
  ]);
}

export function renderSiteFiles(siteConfig, siteUrls) {
  return new Map([
    ...renderPageFiles(siteConfig, siteUrls),
    ...renderRuntimeFiles(siteConfig, siteUrls),
    ...renderWellKnownFiles(siteConfig, siteUrls)
  ]);
}
