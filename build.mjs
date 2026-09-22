import { access, copyFile, mkdir, readFile, readdir, rm, rmdir, stat, unlink, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { buildConfig } from "./.github/scripts/build.config.mjs";
import { minifySiteContents } from "./.github/scripts/site-minify.mjs";
import { validateBuildConfig } from "./.github/scripts/validate-config.mjs";

const root = dirname(fileURLToPath(import.meta.url));
const output = join(root, "dist");
const manifestPath = join(output, ".build-manifest.json");
validateBuildConfig(buildConfig);
const excluded = new Set(buildConfig.excludedNames);
const concurrency = buildConfig.concurrency;
const configFingerprint = JSON.stringify({
  buildConfig,
  buildScript: await readFile(fileURLToPath(import.meta.url), "utf8"),
  packageJson: await readFile(join(root, "package.json"), "utf8"),
  packageLock: await readFile(join(root, "package-lock.json"), "utf8")
});

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function filesIn(directory) {
  const pending = [directory];
  const files = [];

  while (pending.length > 0) {
    const currentDirectory = pending.pop();
    const entries = await readdir(currentDirectory, { withFileTypes: true });

    for (const entry of entries) {
      if (excluded.has(entry.name)) continue;
      const path = join(currentDirectory, entry.name);
      if (entry.isDirectory()) {
        pending.push(path);
      } else {
        files.push(path);
      }
    }
  }

  return files;
}

async function loadManifest() {
  if (!await exists(manifestPath)) {
    return { configFingerprint: "", files: {} };
  }

  try {
    const text = await readFile(manifestPath, "utf8");
    const parsed = JSON.parse(text);
    return {
      configFingerprint: parsed.configFingerprint ?? "",
      files: typeof parsed.files === "object" && parsed.files !== null ? parsed.files : {}
    };
  } catch {
    return { configFingerprint: "", files: {} };
  }
}

async function fileSignature(source) {
  const stats = await stat(source);
  return `${stats.size}:${stats.mtimeMs}`;
}

function copiesVerbatim(source) {
  const extension = extname(source).toLowerCase();
  return extension !== ".html"
    && extension !== ".htm"
    && extension !== ".css"
    && extension !== ".js"
    && extension !== ".mjs";
}

async function fileContentsMatch(leftPath, rightPath) {
  const [left, right] = await Promise.all([readFile(leftPath), readFile(rightPath)]);
  return left.equals(right);
}

async function removeEmptyParentDirectories(path) {
  let currentDirectory = dirname(path);

  while (currentDirectory !== output && currentDirectory.startsWith(output)) {
    const entries = await readdir(currentDirectory);
    if (entries.length > 0) {
      break;
    }

    await rmdir(currentDirectory);
    currentDirectory = dirname(currentDirectory);
  }
}

async function buildFile(source) {
  const destination = join(output, relative(root, source));
  await mkdir(dirname(destination), { recursive: true });

  const extension = extname(source).toLowerCase();
  if (extension === ".html" || extension === ".htm") {
    const contents = await readFile(source, "utf8");
    const result = await minifySiteContents(extension, contents);
    await writeFile(destination, result);
    return;
  }

  if (extension === ".css") {
    const contents = await readFile(source, "utf8");
    const result = await minifySiteContents(extension, contents);
    await writeFile(destination, result);
    return;
  }

  if (extension === ".js" || extension === ".mjs") {
    const contents = await readFile(source, "utf8");
    const minified = await minifySiteContents(extension, contents);
    await writeFile(destination, minified);
    return;
  }

  await copyFile(source, destination);
}

await mkdir(output, { recursive: true });

const [sources, previousManifest] = await Promise.all([
  filesIn(root),
  loadManifest()
]);

const forceRebuild = previousManifest.configFingerprint !== configFingerprint;
if (forceRebuild) {
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
}

const nextManifest = { configFingerprint, files: {} };
const buildQueue = [];
const sourceMetadata = await Promise.all(sources.map(async (source) => {
  const relativeSource = relative(root, source);
  const destination = join(output, relativeSource);
  const signature = await fileSignature(source);
  const destinationExists = forceRebuild ? false : await exists(destination);
  return { source, relativeSource, destination, signature, destinationExists };
}));

const currentRelativeSources = new Set(sourceMetadata.map(({ relativeSource }) => relativeSource));
const currentDestinations = new Set(sourceMetadata.map(({ destination }) => destination));
const staleFiles = Object.keys(previousManifest.files).filter((relativeSource) => !currentRelativeSources.has(relativeSource));
for (const relativeSource of staleFiles) {
  const destination = join(output, relativeSource);
  if (currentDestinations.has(destination)) {
    continue;
  }
  if (await exists(destination)) {
    await unlink(destination);
    await removeEmptyParentDirectories(destination);
  }
}

for (const { source, relativeSource, signature, destinationExists } of sourceMetadata) {
  nextManifest.files[relativeSource] = signature;

  if (!forceRebuild && previousManifest.files[relativeSource] === signature && destinationExists) {
    if (!copiesVerbatim(source) || await fileContentsMatch(source, join(output, relativeSource))) {
      continue;
    }
  }

  buildQueue.push(source);
}

for (let index = 0; index < buildQueue.length; index += concurrency) {
  await Promise.all(buildQueue.slice(index, index + concurrency).map(buildFile));
}

await writeFile(manifestPath, `${JSON.stringify(nextManifest, null, 2)}\n`);
console.log(`Built minified site in ${relative(root, output)}/ (${buildQueue.length} changed file${buildQueue.length === 1 ? "" : "s"}).`);
