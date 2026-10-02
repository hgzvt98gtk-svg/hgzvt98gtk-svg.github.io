export function escapeJsString(value) {
  return JSON.stringify(String(value));
}
