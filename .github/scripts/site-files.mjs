import { renderMetadataFiles } from "./site-metadata-files.mjs";
import { renderPageFiles } from "./site-page-files.mjs";
import { renderRuntimeFiles } from "./site-runtime-files.mjs";

export function renderSiteFiles(siteConfig, siteUrls) {
  return new Map([
    ...renderPageFiles(siteConfig, siteUrls),
    ...renderRuntimeFiles(siteConfig, siteUrls),
    ...renderMetadataFiles(siteConfig, siteUrls)
  ]);
}
