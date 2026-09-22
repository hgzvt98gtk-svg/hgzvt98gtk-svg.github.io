import { siteConfig } from "./site.config.mjs";

const { origin, assetPaths } = siteConfig;

export const siteUrls = {
  home: new URL("/", `${origin}/`).toString(),
  privacy: new URL(assetPaths.privacyPage, `${origin}/`).toString(),
  socialPreview: new URL(assetPaths.socialPreview, `${origin}/`).toString(),
  sitemap: new URL(assetPaths.sitemap, `${origin}/`).toString()
};
