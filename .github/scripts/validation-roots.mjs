import { join } from "node:path";

export const validationRootNames = Object.freeze([".", "dist"]);

export function resolveValidationRoots(rootPath) {
  return validationRootNames.map((name) => ({ name, path: join(rootPath, name) }));
}

export async function runAcrossValidationRoots(rootPath, validateRoot) {
  await Promise.all(resolveValidationRoots(rootPath).map((root) => validateRoot(root)));
}
