export const siteFilePaths = Object.freeze({
  index: "index.html",
  privacy: "Privacy.html",
  appScript: "app.js",
  robots: "robots.txt",
  sitemap: "sitemap.xml",
  llms: "llms.txt",
  agentCard: ".well-known/agent-card.json",
  apiCatalog: ".well-known/api-catalog",
  mtaSts: ".well-known/mta-sts.txt"
});

export const generatedJsonFiles = Object.freeze([
  siteFilePaths.agentCard,
  siteFilePaths.apiCatalog
]);

export const contentCheckFiles = Object.freeze({
  index: siteFilePaths.index,
  privacy: siteFilePaths.privacy,
  style: "style.css",
  appScript: siteFilePaths.appScript,
  robots: siteFilePaths.robots,
  sitemap: siteFilePaths.sitemap,
  llms: siteFilePaths.llms
});

export const requiredAssetPathKeys = Object.freeze([
  "icon",
  "stylesheet",
  "appScript",
  "background",
  "socialPreview",
  "agentCard",
  "apiCatalog",
  "privacyPage",
  "sitemap",
  "bimiLogo"
]);

export const requiredStaticAssetPathKeys = Object.freeze([
  "stylesheet",
  "icon",
  "background",
  "socialPreview",
  "bimiLogo"
]);

export const xmlSyntaxAssetPathKeys = Object.freeze([
  "sitemap",
  "icon",
  "socialPreview",
  "bimiLogo"
]);

function toAssetRelativePath(pathname) {
  return pathname.replace(/^\//, "");
}

export function listAssetRelativePaths(siteConfig, keys) {
  return keys.map((key) => toAssetRelativePath(siteConfig.assetPaths[key]));
}

export function listRenderedAndStaticFiles(siteConfig, renderedFiles) {
  return [
    ...new Set([
      ...renderedFiles.keys(),
      ...listAssetRelativePaths(siteConfig, requiredStaticAssetPathKeys)
    ])
  ];
}
