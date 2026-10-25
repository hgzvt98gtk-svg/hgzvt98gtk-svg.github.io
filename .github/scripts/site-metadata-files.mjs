import { siteFilePaths } from "./site-paths.mjs";

// The live robots.txt is served by the hussamfaroug-live-worker Worker (src/discovery.js).
// Keep this list and the rules below in step with it so the Pages copy matches.
const trainingCrawlers = [
  "Amazonbot", "Applebot-Extended", "Bytespider", "CCBot", "ClaudeBot", "Diffbot", "Google-Extended", "GPTBot",
  "omgili", "anthropic-ai", "Claude-Web", "cohere-ai", "MistralAI-Training", "meta-externalagent", "GoogleOther",
  "Baiduspider", "PetalBot", "AwarioSmartBot", "AwarioRssBot", "Google-CloudVertexBot", "QualifiedBot", "Cotoyogi",
  "ICC-Crawler", "atlassian-bot", "FishBot", "BorderxBot", "NavuBot", "SemrushBot-SWA", "WARDBot", "magpie-crawler",
  "KimiBot", "CitibotSiteCrawler"
];

export function renderMetadataFiles(siteConfig, siteUrls) {
  return new Map([
    [siteFilePaths.robots, `# AI training crawlers
${trainingCrawlers.map((bot) => `User-agent: ${bot}\nDisallow: /\n`).join("\n")}
User-agent: *
Allow: /
Disallow: /api/
Content-Signal: ai-train=no, search=yes, ai-input=no

# Sitemap
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
