import { siteConfig } from "./site.config.mjs";

function deriveSiteUrls(config) {
  const { origin, assetPaths } = config;

  return {
    home: new URL("/", `${origin}/`).toString(),
    privacy: new URL(assetPaths.privacyPage, `${origin}/`).toString(),
    socialPreview: new URL(assetPaths.socialPreview, `${origin}/`).toString(),
    sitemap: new URL(assetPaths.sitemap, `${origin}/`).toString()
  };
}

export const siteUrls = deriveSiteUrls(siteConfig);
