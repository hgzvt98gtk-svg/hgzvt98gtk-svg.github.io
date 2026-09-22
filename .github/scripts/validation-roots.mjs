import { join } from "node:path";

export const validationRootNames = Object.freeze([".", "dist"]);

export function resolveValidationRoots(rootPath) {
  return validationRootNames.map((name) => ({ name, path: join(rootPath, name) }));
}

export async function runAcrossValidationRoots(rootPath, validateRoot) {
  for (const root of resolveValidationRoots(rootPath)) {
    await validateRoot(root);
  }
}
