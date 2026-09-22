export function fileSignature(stats) {
  return `${stats.size}:${stats.mtimeMs}`;
}
