export function toRelativePath(pathname) {
  return pathname.replace(/^\//, "");
}

export function toAssetRelativePath(pathname) {
  return toRelativePath(pathname);
}
