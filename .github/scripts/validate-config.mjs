import { derivedSiteUrlAssetPathKeys, requiredAssetPathKeys } from "./site-paths.mjs";

export function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function validatePathOnlyAssetPath(path, key) {
  assert(!path.startsWith("//"), `siteConfig.assetPaths.${key} must not start with //`);
  assert(!/[?#]/.test(path), `siteConfig.assetPaths.${key} must not include a query string or fragment`);
  assert(!/[\u0000-\u001F\u007F\s\\]/.test(path), `siteConfig.assetPaths.${key} must not contain whitespace, control characters, or backslashes`);

  const parsed = new URL(path, "https://example.test");
  assert(parsed.origin === "https://example.test", `siteConfig.assetPaths.${key} must stay on-origin`);
  assert(parsed.pathname === path, `siteConfig.assetPaths.${key} must be a normalized absolute path`);
}

function validateAssetPaths(assetPaths) {
  assert(typeof assetPaths === "object" && assetPaths !== null, "siteConfig.assetPaths must be an object");

  for (const key of requiredAssetPathKeys) {
    assert(typeof assetPaths[key] === "string" && assetPaths[key].length > 0, `siteConfig.assetPaths.${key} must be a non-empty string`);
    assert(assetPaths[key].startsWith("/"), `siteConfig.assetPaths.${key} must start with /`);
    validatePathOnlyAssetPath(assetPaths[key], key);
  }
}

export function validateSiteConfig(siteConfig, siteUrls) {
  assert(typeof siteConfig === "object" && siteConfig !== null, "siteConfig must be an object");
  assert(typeof siteUrls === "object" && siteUrls !== null, "siteUrls must be an object");

  assert(typeof siteConfig.origin === "string" && siteConfig.origin.length > 0, "siteConfig.origin must be a non-empty string");
  assert(typeof siteConfig.domain === "string" && siteConfig.domain.length > 0, "siteConfig.domain must be a non-empty string");
  assert(typeof siteConfig.personName === "string" && siteConfig.personName.length > 0, "siteConfig.personName must be a non-empty string");
  assert(typeof siteConfig.siteStatus === "string" && siteConfig.siteStatus.length > 0, "siteConfig.siteStatus must be a non-empty string");

  validateAssetPaths(siteConfig.assetPaths);

  assert(siteConfig.origin === `https://${siteConfig.domain}`, "siteConfig.origin must match siteConfig.domain");
  assert(typeof siteUrls.home === "string" && siteUrls.home === `${siteConfig.origin}/`, "siteUrls.home must match siteConfig.origin/");

  for (const [urlKey, assetPathKey] of Object.entries(derivedSiteUrlAssetPathKeys)) {
    const expected = new URL(siteConfig.assetPaths[assetPathKey], `${siteConfig.origin}/`).toString();
    assert(typeof siteUrls[urlKey] === "string" && siteUrls[urlKey] === expected, `siteUrls.${urlKey} must match origin + asset path`);
  }

  assert(Array.isArray(siteConfig.mtaSts?.mx), "siteConfig.mtaSts.mx must be an array");
  assert(siteConfig.mtaSts.mx.length > 0, "siteConfig.mtaSts.mx must include at least one mx host");
}

export function validateBuildConfig(buildConfig) {
  assert(typeof buildConfig === "object" && buildConfig !== null, "buildConfig must be an object");
  assert(Array.isArray(buildConfig.excludedNames), "buildConfig.excludedNames must be an array");
  assert(buildConfig.excludedNames.every((entry) => typeof entry === "string" && entry.length > 0), "buildConfig.excludedNames entries must be non-empty strings");
  assert(Number.isInteger(buildConfig.concurrency) && buildConfig.concurrency > 0, "buildConfig.concurrency must be a positive integer");
}
