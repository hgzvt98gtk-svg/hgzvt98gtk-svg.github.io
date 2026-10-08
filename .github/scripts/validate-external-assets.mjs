import { isExternalUrl, requiredStaticAssetPathKeys } from "./site-paths.mjs";
import { siteConfig } from "./site.config.mjs";

const timeoutMs = 10000;
const externalAssets = requiredStaticAssetPathKeys
  .map((key) => [key, siteConfig.assetPaths[key]])
  .filter(([, url]) => isExternalUrl(url));

if (externalAssets.length === 0) {
  console.log("No externally hosted static assets to check.");
} else {
  const results = await Promise.allSettled(externalAssets.map(async ([key, assetUrl]) => {
    const expectedContentType = key === "stylesheet" ? "text/css" : "image/*";
    const response = await fetch(assetUrl, {
      headers: { Accept: expectedContentType },
      signal: AbortSignal.timeout(timeoutMs)
    });

    try {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const contentType = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
      const validContentType = key === "stylesheet"
        ? contentType === expectedContentType
        : contentType?.startsWith("image/");
      if (!validContentType) {
        throw new Error(`expected ${expectedContentType} content type, received ${contentType ?? "none"}`);
      }
    } finally {
      await response.body?.cancel();
    }

    console.log(`Checked external asset ${key}: ${response.status} ${assetUrl}`);
  }));

  const failures = results.flatMap((result, index) => result.status === "rejected"
    ? [`${externalAssets[index][0]} (${externalAssets[index][1]}): ${result.reason.message}`]
    : []);

  if (failures.length > 0) {
    throw new Error(`External asset smoke check failed:\n${failures.join("\n")}`);
  }
}
