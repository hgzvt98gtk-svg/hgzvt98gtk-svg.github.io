import { listAssetRelativePaths, requiredStaticAssetPathKeys } from "./site-paths.mjs";

const passthroughBuildFiles = Object.freeze([
  "CNAME",
  "_headers"
]);

export function listBuildFiles(siteConfig, renderedFiles) {
  return [
    ...new Set([
      ...renderedFiles.keys(),
      ...listAssetRelativePaths(siteConfig, requiredStaticAssetPathKeys),
      ...passthroughBuildFiles
    ])
  ];
}
