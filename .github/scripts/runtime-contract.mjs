export const agentCardKeys = Object.freeze(["description", "name", "status", "url"]);
export const apiCatalogKeys = Object.freeze(["apis", "site"]);

export function isPlainObject(value) {
  return typeof value === "object" && value !== null && Object.getPrototypeOf(value) === Object.prototype;
}

export function hasExactKeys(value, expectedKeys) {
  const actualKeys = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  return actualKeys.length === expected.length && actualKeys.every((key, index) => key === expected[index]);
}

export function isAgentCardPayload(value) {
  return isPlainObject(value)
    && typeof value.description === "string"
    && typeof value.name === "string"
    && (value.status === undefined || typeof value.status === "string")
    && typeof value.url === "string";
}

export function isApiCatalogPayload(value) {
  if (!isPlainObject(value)) {
    return false;
  }
  const isSiteCatalog = typeof value.site === "string" && Array.isArray(value.apis) && value.apis.every(isPlainObject);
  const isLinkset = Array.isArray(value.linkset) && value.linkset.every(isPlainObject);
  return isSiteCatalog || isLinkset;
}
