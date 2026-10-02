import { siteFilePaths } from "./site-paths.mjs";

export function renderMetadataFiles(siteConfig, siteUrls) {
  return new Map([
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
`],
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
