import { requiredStaticAssetPathKeys } from "./site-paths.mjs";
import { toAssetRelativePath } from "./path-utils.mjs";

export const passthroughBuildFiles = Object.freeze([
  "CNAME",
  "_headers"
]);

export function listBuildFiles(siteConfig, renderedFiles) {
  return [
    ...new Set([
      ...renderedFiles.keys(),
      ...requiredStaticAssetPathKeys.map((key) => toAssetRelativePath(siteConfig.assetPaths[key])),
      ...passthroughBuildFiles
    ])
  ];
}
