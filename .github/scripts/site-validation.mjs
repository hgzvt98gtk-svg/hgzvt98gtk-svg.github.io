import { contentCheckFiles } from "./site-paths.mjs";
import { toAssetRelativePath } from "./site-files.mjs";

export function listRequiredSiteFiles(siteConfig, renderedFiles) {
  return [
    ...renderedFiles.keys(),
    toAssetRelativePath(siteConfig.assetPaths.stylesheet),
    toAssetRelativePath(siteConfig.assetPaths.icon),
    toAssetRelativePath(siteConfig.assetPaths.background),
    toAssetRelativePath(siteConfig.assetPaths.socialPreview),
    toAssetRelativePath(siteConfig.assetPaths.bimiLogo)
  ];
}

export function listXmlSyntaxFiles(siteConfig) {
  return [
    toAssetRelativePath(siteConfig.assetPaths.sitemap),
    toAssetRelativePath(siteConfig.assetPaths.icon),
    toAssetRelativePath(siteConfig.assetPaths.socialPreview),
    toAssetRelativePath(siteConfig.assetPaths.bimiLogo)
  ];
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
      pattern: `url\\((["'])?${siteConfig.assetPaths.background.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\1?\\)`,
      message: `${contentCheckFiles.style} missing background asset`
    },
    { type: "contains", file: contentCheckFiles.appScript, value: siteConfig.assetPaths.agentCard, message: `${contentCheckFiles.appScript} missing agent-card fetch` },
    { type: "contains", file: contentCheckFiles.appScript, value: siteConfig.assetPaths.apiCatalog, message: `${contentCheckFiles.appScript} missing api-catalog fetch` },
    { type: "contains", file: contentCheckFiles.appScript, value: siteConfig.siteStatus, message: `${contentCheckFiles.appScript} missing site status` },
    { type: "contains", file: contentCheckFiles.sitemap, value: siteUrls.privacy, message: `${contentCheckFiles.sitemap} missing privacy URL` },
    { type: "contains", file: contentCheckFiles.robots, value: `Sitemap: ${siteUrls.sitemap}`, message: `${contentCheckFiles.robots} missing sitemap URL` },
    { type: "contains", file: contentCheckFiles.llms, value: siteUrls.privacy, message: `${contentCheckFiles.llms} missing privacy URL` }
  ];
}
