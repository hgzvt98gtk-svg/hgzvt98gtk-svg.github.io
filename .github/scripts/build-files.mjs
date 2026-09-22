import { listRenderedAndStaticFiles } from "./site-paths.mjs";

const passthroughBuildFiles = Object.freeze([
  "CNAME",
  "_headers"
]);

export function listBuildFiles(siteConfig, renderedFiles) {
  return [
    ...new Set([
      ...listRenderedAndStaticFiles(siteConfig, renderedFiles),
      ...passthroughBuildFiles
    ])
  ];
}
