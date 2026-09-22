import { contentCheckFiles, listAssetRelativePaths, requiredStaticAssetPathKeys, xmlSyntaxAssetPathKeys } from "./site-paths.mjs";
import { escapeRegex } from "./validate-site-helpers.mjs";

export function listRequiredSiteFiles(siteConfig, renderedFiles) {
  return [
    ...renderedFiles.keys(),
    ...listAssetRelativePaths(siteConfig, requiredStaticAssetPathKeys)
  ];
}

export function listXmlSyntaxFiles(siteConfig) {
  return listAssetRelativePaths(siteConfig, xmlSyntaxAssetPathKeys);
}

export function listSiteContentChecks(siteConfig, siteUrls) {
  return [
    {
      type: "attribute",
      file: contentCheckFiles.index,
      attribute: "href",
      value: siteConfig.assetPaths.stylesheet,
      message: `${contentCheckFiles.index} missing stylesheet link`
    },
    {
      type: "attribute",
      file: contentCheckFiles.index,
      attribute: "href",
      value: siteConfig.assetPaths.icon,
      message: `${contentCheckFiles.index} missing icon link`
    },
    {
      type: "attribute",
      file: contentCheckFiles.index,
      attribute: "src",
      value: siteConfig.assetPaths.appScript,
      message: `${contentCheckFiles.index} missing app script`
    },
    { type: "contains", file: contentCheckFiles.index, value: siteUrls.socialPreview, message: `${contentCheckFiles.index} missing social preview URL` },
    {
      type: "attribute",
      file: contentCheckFiles.privacy,
      attribute: "href",
      value: siteConfig.assetPaths.stylesheet,
      message: `${contentCheckFiles.privacy} missing stylesheet link`
    },
    {
      type: "attribute",
      file: contentCheckFiles.privacy,
      attribute: "href",
      value: siteConfig.assetPaths.icon,
      message: `${contentCheckFiles.privacy} missing icon link`
    },
    {
      type: "regex",
      file: contentCheckFiles.style,
      pattern: `url\\((["'])?${escapeRegex(siteConfig.assetPaths.background)}\\1?\\)`,
      message: `${contentCheckFiles.style} missing background asset`
    },
    { type: "runtimeScript", file: contentCheckFiles.appScript, message: `${contentCheckFiles.appScript} missing expected runtime metadata wiring` },
    { type: "contains", file: contentCheckFiles.sitemap, value: siteUrls.privacy, message: `${contentCheckFiles.sitemap} missing privacy URL` },
    { type: "contains", file: contentCheckFiles.robots, value: `Sitemap: ${siteUrls.sitemap}`, message: `${contentCheckFiles.robots} missing sitemap URL` },
    { type: "contains", file: contentCheckFiles.llms, value: siteUrls.privacy, message: `${contentCheckFiles.llms} missing privacy URL` }
  ];
}
