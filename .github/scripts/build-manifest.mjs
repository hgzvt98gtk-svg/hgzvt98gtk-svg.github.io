import { lstat, readFile, realpath, unlink } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";

function validateManifestPath(path) {
  if (
    typeof path !== "string"
    || path.length === 0
    || path.includes("\\")
    || path.includes("\0")
    || path.startsWith("/")
    || path.split("/").some((segment) => segment === "" || segment === "." || segment === "..")
    || path.split("/").some((segment) => segment.includes(":"))
  ) {
    throw new Error(`Invalid build manifest file path: ${JSON.stringify(path)}`);
  }
}

export function validateBuildManifest(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid build manifest: expected an object.");
  }
  if (value.configFingerprint !== undefined && typeof value.configFingerprint !== "string") {
    throw new Error("Invalid build manifest: configFingerprint must be a string.");
  }
  if (!value.files || typeof value.files !== "object" || Array.isArray(value.files)) {
    throw new Error("Invalid build manifest: files must be an object.");
  }

  for (const [path, metadata] of Object.entries(value.files)) {
    validateManifestPath(path);
    if (typeof metadata === "string" && metadata.length > 0) {
      continue;
    }
    if (
      !metadata
      || typeof metadata !== "object"
      || Array.isArray(metadata)
      || typeof metadata.signature !== "string"
      || metadata.signature.length === 0
      || !Number.isFinite(metadata.size)
      || metadata.size < 0
      || !Number.isFinite(metadata.mtimeMs)
      || metadata.mtimeMs < 0
    ) {
      throw new Error(`Invalid build manifest metadata for ${JSON.stringify(path)}.`);
    }
  }

  return {
    configFingerprint: value.configFingerprint ?? "",
    files: value.files
  };
}

export async function readBuildManifest(manifestPath) {
  try {
    const text = await readFile(manifestPath, "utf8");
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (error) {
      throw new Error(`Invalid build manifest at ${manifestPath}: ${error.message}`, { cause: error });
    }
    return validateBuildManifest(parsed);
  } catch (error) {
    if (error?.code === "ENOENT") {
      return { configFingerprint: "", files: {} };
    }
    throw error;
  }
}

export async function removeStaleFile(output, path) {
  validateManifestPath(path);
  const outputStatus = await lstat(output);
  if (!outputStatus.isDirectory() || outputStatus.isSymbolicLink()) {
    throw new Error(`Build output is not a real directory: ${output}`);
  }

  const destination = resolve(output, path);
  const relativeDestination = relative(resolve(output), destination);
  if (
    relativeDestination === ""
    || relativeDestination === ".."
    || relativeDestination.startsWith(`..${sep}`)
    || isAbsolute(relativeDestination)
  ) {
    throw new Error(`Build manifest path escapes output directory: ${JSON.stringify(path)}`);
  }

  const realOutput = await realpath(output);
  let realParent;
  try {
    realParent = await realpath(resolve(destination, ".."));
  } catch (error) {
    if (error?.code === "ENOENT") {
      return;
    }
    throw error;
  }
  const realRelativeParent = relative(realOutput, realParent);
  if (
    realRelativeParent === ".."
    || realRelativeParent.startsWith(`..${sep}`)
    || isAbsolute(realRelativeParent)
  ) {
    throw new Error(`Build manifest path escapes output directory through a symlink: ${JSON.stringify(path)}`);
  }

  try {
    await unlink(destination);
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }
}
