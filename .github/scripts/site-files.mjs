export function renderSiteFiles(siteConfig, siteUrls) {
  return new Map([
    ["index.html", `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="${siteConfig.themeColor}">
  <title>${siteConfig.pageTitles.home}</title>
  <meta name="description" content="${siteConfig.descriptions.home}">
  <link rel="canonical" href="${siteUrls.home}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${siteUrls.home}">
  <meta property="og:title" content="${siteConfig.pageTitles.home}">
  <meta property="og:description" content="${siteConfig.descriptions.home}">
  <meta property="og:site_name" content="${siteConfig.personName}">
  <meta property="og:image" content="${siteUrls.socialPreview}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${siteConfig.pageTitles.home}">
  <meta name="twitter:description" content="${siteConfig.descriptions.home}">
  <meta name="twitter:image" content="${siteUrls.socialPreview}">
  <link rel="icon" href="${siteConfig.assetPaths.icon}" type="image/svg+xml">
  <link rel="stylesheet" href="${siteConfig.assetPaths.stylesheet}">
</head>
<body>
  <main class="landing" aria-label="${siteConfig.personName} personal website">
    <h1>${siteConfig.domain}</h1>
  </main>
  <script type="module" src="${siteConfig.assetPaths.appScript}"></script>
</body>
</html>
`],
    ["app.js", `if ("modelContext" in navigator) {
  navigator.modelContext.provideContext({
    tools: [
      {
        name: "get-site-info",
        description: "Get information about ${siteConfig.domain}",
        inputSchema: { type: "object", properties: {} },
        execute: async () => ({ host: "${siteConfig.domain}", status: "${siteConfig.siteStatus}" })
      },
      {
        name: "get-agent-card",
        description: "Get the AI agent card for this site",
        inputSchema: { type: "object", properties: {} },
        execute: async () => {
          const response = await fetch("${siteConfig.assetPaths.agentCard}");
          return await response.json();
        }
      },
      {
        name: "get-api-catalog",
        description: "Get the API catalog for this site",
        inputSchema: { type: "object", properties: {} },
        execute: async () => {
          const response = await fetch("${siteConfig.assetPaths.apiCatalog}");
          return await response.json();
        }
      }
    ]
  });
}
`],
    ["Privacy.html", `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="${siteConfig.themeColor}">
  <title>${siteConfig.pageTitles.privacy}</title>
  <meta name="description" content="${siteConfig.descriptions.privacy}">
  <link rel="canonical" href="${siteUrls.privacy}">
  <link rel="icon" href="${siteConfig.assetPaths.icon}" type="image/svg+xml">
  <link rel="stylesheet" href="${siteConfig.assetPaths.stylesheet}">
</head>
<body class="document">
  <main class="policy" aria-labelledby="privacy-title">
    <h1 id="privacy-title">Privacy Policy</h1>
    <p class="updated">Last updated: ${siteConfig.privacyLastUpdated}</p>
    <h2>Overview</h2>
    <p>This is a static personal website. It does not provide accounts, contact forms, analytics, advertising, or embedded third-party scripts.</p>
    <h2>Information collected</h2>
    <p>The site does not intentionally collect personal information or set cookies. Hosting and delivery providers may process technical request data, such as IP address, browser information, and request time, in server logs and security systems.</p>
    <h2>Email and external links</h2>
    <p>If you email <a href="mailto:${siteConfig.email}">${siteConfig.email}</a>, your email provider will process your message. External websites have their own privacy policies.</p>
    <h2>Changes</h2>
    <p>This policy may be updated when the site or its providers change. The date above identifies the latest revision.</p>
  </main>
</body>
</html>
`],
    ["robots.txt", `User-agent: *
Allow: /

Sitemap: ${siteUrls.sitemap}
`],
    ["sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
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
    ["llms.txt", `# ${siteConfig.personName}

> Personal website of ${siteConfig.personName}.

## About
- ${siteConfig.personName} — personal site and contact page.

## Pages
- [Home](${siteUrls.home}): Personal landing page.
- [Privacy](${siteUrls.privacy}): Privacy policy.

## Contact
- Email: ${siteConfig.email}
`],
    [".well-known/agent-card.json", `${JSON.stringify({
      name: siteConfig.personName,
      url: siteUrls.home,
      description: siteConfig.descriptions.agentCard,
      status: siteConfig.siteStatus
    }, null, 2)}
`],
    [".well-known/api-catalog", `${JSON.stringify({
      site: siteUrls.home,
      apis: siteConfig.apis
    }, null, 2)}
`],
    [".well-known/mta-sts.txt", `version: ${siteConfig.mtaSts.version}
mode: ${siteConfig.mtaSts.mode}
${siteConfig.mtaSts.mx.map((mx) => `mx: ${mx}`).join("\n")}
max_age: ${siteConfig.mtaSts.maxAge}
`]
  ]);
}

const staticRequiredFiles = [
  "style.css",
  "HF.svg",
  "Background.jpeg",
  "social-preview.svg",
  ".well-known/bimi/logo.svg"
];

export function listRequiredSiteFiles(generatedFiles) {
  return [...new Set([...generatedFiles.keys(), ...staticRequiredFiles])];
}

export function listXmlSyntaxFiles(requiredFiles) {
  return requiredFiles.filter((relativePath) => relativePath.endsWith(".xml") || relativePath.endsWith(".svg"));
}

function toRelativePath(assetPath) {
  return assetPath.startsWith("/") ? assetPath.slice(1) : assetPath;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function listSiteContentChecks(siteConfig, siteUrls) {
  const indexPath = "index.html";
  const privacyPath = toRelativePath(siteConfig.assetPaths.privacyPage);
  const appPath = toRelativePath(siteConfig.assetPaths.appScript);
  const stylePath = toRelativePath(siteConfig.assetPaths.stylesheet);
  const sitemapPath = toRelativePath(siteConfig.assetPaths.sitemap);
  const robotsPath = toRelativePath(siteConfig.assetPaths.robots);
  const llmsPath = toRelativePath(siteConfig.assetPaths.llms);
  const outdatedReferencePattern = new RegExp(`social-preview\\.png|${escapeRegExp(siteConfig.origin)}\\/Privacy[^.]`);

  return [
    { file: indexPath, type: "attribute", attribute: "href", value: siteConfig.assetPaths.stylesheet, message: `${indexPath} missing stylesheet link` },
    { file: indexPath, type: "attribute", attribute: "href", value: siteConfig.assetPaths.icon, message: `${indexPath} missing icon link` },
    { file: indexPath, type: "attribute", attribute: "src", value: siteConfig.assetPaths.appScript, message: `${indexPath} missing app script` },
    { file: indexPath, type: "includes", value: siteUrls.socialPreview, message: `${indexPath} missing social preview URL` },
    { file: privacyPath, type: "attribute", attribute: "href", value: siteConfig.assetPaths.stylesheet, message: `${privacyPath} missing stylesheet link` },
    { file: privacyPath, type: "attribute", attribute: "href", value: siteConfig.assetPaths.icon, message: `${privacyPath} missing icon link` },
    { file: stylePath, type: "includes", value: siteConfig.assetPaths.background, message: `${stylePath} missing background asset` },
    { file: appPath, type: "includes", value: siteConfig.assetPaths.agentCard, message: `${appPath} missing agent-card fetch` },
    { file: appPath, type: "includes", value: siteConfig.assetPaths.apiCatalog, message: `${appPath} missing api-catalog fetch` },
    { file: appPath, type: "includes", value: siteConfig.siteStatus, message: `${appPath} missing site status` },
    { file: sitemapPath, type: "includes", value: siteUrls.privacy, message: `${sitemapPath} missing privacy URL` },
    { file: robotsPath, type: "includes", value: `Sitemap: ${siteUrls.sitemap}`, message: `${robotsPath} missing sitemap URL` },
    { file: llmsPath, type: "includes", value: siteUrls.privacy, message: `${llmsPath} missing privacy URL` },
    { file: indexPath, type: "notRegex", value: outdatedReferencePattern, message: `${indexPath} found outdated URL references` },
    { file: privacyPath, type: "notRegex", value: outdatedReferencePattern, message: `${privacyPath} found outdated URL references` },
    { file: sitemapPath, type: "notRegex", value: outdatedReferencePattern, message: `${sitemapPath} found outdated URL references` },
    { file: llmsPath, type: "notRegex", value: outdatedReferencePattern, message: `${llmsPath} found outdated URL references` }
  ];
}

export function toRelativeAssetPath(assetPath) {
  return toRelativePath(assetPath);
}
