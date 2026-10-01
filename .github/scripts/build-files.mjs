import { listAssetRelativePaths, requiredStaticAssetPathKeys } from "./site-paths.mjs";

const passthroughBuildFiles = Object.freeze([
  "CNAME",
  "_headers"
]);

export function listBuildFiles(siteConfig, renderedFiles) {
  return [
    ...new Set([
      ...listAssetRelativePaths(siteConfig, requiredStaticAssetPathKeys, renderedFiles.keys()),
      ...passthroughBuildFiles
    ])
  ];
}
