import { siteConfig } from "./site.config.mjs";

export function deriveSiteUrls(config) {
  const { origin, assetPaths } = config;
  const assetUrlKeys = {
    privacy: "privacyPage",
    socialPreview: "socialPreview",
    sitemap: "sitemap",
    agentCard: "agentCard",
    apiCatalog: "apiCatalog",
    llms: "llms",
    robots: "robots",
    mtaSts: "mtaSts",
    bimiLogo: "bimiLogo"
  };

  return {
    home: new URL("/", `${origin}/`).toString(),
    ...Object.fromEntries(Object.entries(assetUrlKeys).map(([urlKey, assetKey]) => [urlKey, new URL(assetPaths[assetKey], `${origin}/`).toString()]))
  };
}

export const siteUrls = deriveSiteUrls(siteConfig);
