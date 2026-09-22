function toRelativePath(pathname) {
  return pathname.replace(/^\//, "");
}

export function listRequiredSiteFiles(siteConfig, renderedFiles) {
  return [
    ...renderedFiles.keys(),
    toRelativePath(siteConfig.assetPaths.stylesheet),
    toRelativePath(siteConfig.assetPaths.icon),
    toRelativePath(siteConfig.assetPaths.background),
    toRelativePath(siteConfig.assetPaths.socialPreview),
    toRelativePath(siteConfig.assetPaths.bimiLogo)
  ];
}

export function listXmlSyntaxFiles(siteConfig) {
  return [
    toRelativePath(siteConfig.assetPaths.sitemap),
    toRelativePath(siteConfig.assetPaths.icon),
    toRelativePath(siteConfig.assetPaths.socialPreview),
    toRelativePath(siteConfig.assetPaths.bimiLogo)
  ];
}

export function listSiteContentChecks(siteConfig, siteUrls) {
  return [
    {
      type: "attribute",
      file: "index.html",
      attribute: "href",
      value: siteConfig.assetPaths.stylesheet,
      message: "index.html missing stylesheet link"
    },
    {
      type: "attribute",
      file: "index.html",
      attribute: "href",
      value: siteConfig.assetPaths.icon,
      message: "index.html missing icon link"
    },
    {
      type: "attribute",
      file: "index.html",
      attribute: "src",
      value: siteConfig.assetPaths.appScript,
      message: "index.html missing app script"
    },
    { type: "contains", file: "index.html", value: siteUrls.socialPreview, message: "index.html missing social preview URL" },
    {
      type: "attribute",
      file: "Privacy.html",
      attribute: "href",
      value: siteConfig.assetPaths.stylesheet,
      message: "Privacy.html missing stylesheet link"
    },
    {
      type: "attribute",
      file: "Privacy.html",
      attribute: "href",
      value: siteConfig.assetPaths.icon,
      message: "Privacy.html missing icon link"
    },
    {
      type: "regex",
      file: "style.css",
      pattern: `url\\((["'])?${siteConfig.assetPaths.background.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\1?\\)`,
      message: "style.css missing background asset"
    },
    { type: "contains", file: "app.js", value: siteConfig.assetPaths.agentCard, message: "app.js missing agent-card fetch" },
    { type: "contains", file: "app.js", value: siteConfig.assetPaths.apiCatalog, message: "app.js missing api-catalog fetch" },
    { type: "contains", file: "app.js", value: siteConfig.siteStatus, message: "app.js missing site status" },
    { type: "contains", file: "sitemap.xml", value: siteUrls.privacy, message: "sitemap.xml missing privacy URL" },
    { type: "contains", file: "robots.txt", value: `Sitemap: ${siteUrls.sitemap}`, message: "robots.txt missing sitemap URL" },
    { type: "contains", file: "llms.txt", value: siteUrls.privacy, message: "llms.txt missing privacy URL" }
  ];
}
