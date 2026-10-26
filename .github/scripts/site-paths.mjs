export const siteFilePaths = Object.freeze({
  index: "index.html",
  privacy: "Privacy.html",
  notFound: "404.html",
  appScript: "app.js",
  bootstrapScript: "bootstrap.js",
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
  "faviconIco",
  "appleTouchIcon",
  "webManifest",
  "icon192",
  "icon512",
  "stylesheet",
  "appScript",
  "background",
  "backgroundPhone",
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
  "faviconIco",
  "appleTouchIcon",
  "webManifest",
  "icon192",
  "icon512",
  "background",
  "backgroundPhone",
  "socialPreview",
  "bimiLogo"
]);

export const xmlSyntaxAssetPathKeys = Object.freeze([
  "sitemap",
  "icon",
  "socialPreview",
  "bimiLogo"
]);

export function isExternalUrl(value) {
  return /^https?:\/\//.test(value);
}

function toAssetRelativePath(pathname) {
  return pathname.replace(/^\//, "");
}

export function listAssetRelativePaths(siteConfig, keys, renderedFiles = []) {
  return [
    ...renderedFiles,
    ...keys
    .map((key) => siteConfig.assetPaths[key])
    .filter((path) => !isExternalUrl(path))
    .map((path) => toAssetRelativePath(path))
  ];
}
