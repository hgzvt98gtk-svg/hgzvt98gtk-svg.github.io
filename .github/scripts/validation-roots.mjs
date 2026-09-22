import { join } from "node:path";

const validationRootNames = Object.freeze([".", "dist"]);

export async function runAcrossValidationRoots(rootPath, validateRoot) {
  await Promise.all(
    validationRootNames
      .map((name) => ({ name, path: join(rootPath, name) }))
      .map((root) => validateRoot(root))
  );
}
