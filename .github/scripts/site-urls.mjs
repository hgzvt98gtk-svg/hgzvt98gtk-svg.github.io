import { siteConfig } from "./site.config.mjs";
import { derivedSiteUrlAssetPathKeys } from "./site-paths.mjs";

function deriveSiteUrls(config) {
  const { origin, assetPaths } = config;

  return {
    home: new URL("/", `${origin}/`).toString(),
    ...Object.fromEntries(Object.entries(derivedSiteUrlAssetPathKeys).map(([urlKey, assetKey]) => [urlKey, new URL(assetPaths[assetKey], `${origin}/`).toString()]))
  };
}

export const siteUrls = deriveSiteUrls(siteConfig);
