function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

export function validateSiteConfig(siteConfig, siteUrls) {
  assert(typeof siteConfig === "object" && siteConfig !== null, "siteConfig must be an object");
  assert(typeof siteUrls === "object" && siteUrls !== null, "siteUrls must be an object");

  assert(typeof siteConfig.origin === "string" && siteConfig.origin.length > 0, "siteConfig.origin must be a non-empty string");
  assert(typeof siteConfig.domain === "string" && siteConfig.domain.length > 0, "siteConfig.domain must be a non-empty string");
  assert(typeof siteConfig.personName === "string" && siteConfig.personName.length > 0, "siteConfig.personName must be a non-empty string");
  assert(typeof siteConfig.siteStatus === "string" && siteConfig.siteStatus.length > 0, "siteConfig.siteStatus must be a non-empty string");

  assert(typeof siteConfig.assetPaths === "object" && siteConfig.assetPaths !== null, "siteConfig.assetPaths must be an object");
  assert(typeof siteConfig.assetPaths.stylesheet === "string", "siteConfig.assetPaths.stylesheet must be a string");
  assert(typeof siteConfig.assetPaths.icon === "string", "siteConfig.assetPaths.icon must be a string");
  assert(typeof siteConfig.assetPaths.background === "string", "siteConfig.assetPaths.background must be a string");
  assert(typeof siteConfig.assetPaths.agentCard === "string", "siteConfig.assetPaths.agentCard must be a string");
  assert(typeof siteConfig.assetPaths.apiCatalog === "string", "siteConfig.assetPaths.apiCatalog must be a string");

  assert(typeof siteUrls.home === "string" && siteUrls.home.startsWith(siteConfig.origin), "siteUrls.home must start with siteConfig.origin");
  assert(typeof siteUrls.privacy === "string" && siteUrls.privacy.startsWith(siteConfig.origin), "siteUrls.privacy must start with siteConfig.origin");
  assert(typeof siteUrls.sitemap === "string" && siteUrls.sitemap.startsWith(siteConfig.origin), "siteUrls.sitemap must start with siteConfig.origin");

  assert(siteConfig.origin === `https://${siteConfig.domain}`, "siteConfig.origin must match siteConfig.domain");

  assert(Array.isArray(siteConfig.mtaSts?.mx), "siteConfig.mtaSts.mx must be an array");
  assert(siteConfig.mtaSts.mx.length > 0, "siteConfig.mtaSts.mx must include at least one mx host");
}
