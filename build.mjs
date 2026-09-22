import { access, copyFile, mkdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import CleanCSS from "clean-css";
import { minify as minifyHtml } from "html-minifier-terser";
import { minify as minifyJs } from "terser";
import { listBuildFiles } from "./.github/scripts/build-files.mjs";
import { buildConfig } from "./.github/scripts/build.config.mjs";
import { renderSiteFiles } from "./.github/scripts/site-files.mjs";
import { siteConfig } from "./.github/scripts/site.config.mjs";
import { siteUrls } from "./.github/scripts/site-urls.mjs";
import { validateBuildConfig, validateSiteConfig } from "./.github/scripts/validate-config.mjs";

const root = dirname(fileURLToPath(import.meta.url));
const output = join(root, "dist");
const manifestPath = join(output, ".build-manifest.json");
validateBuildConfig(buildConfig);
validateSiteConfig(siteConfig, siteUrls);
const excluded = new Set(buildConfig.excludedNames);
const concurrency = buildConfig.concurrency;
const configFingerprint = JSON.stringify(buildConfig);
const renderedFiles = renderSiteFiles(siteConfig, siteUrls);

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
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

async function buildFile(source) {
  const destination = join(output, relative(root, source));
  await mkdir(dirname(destination), { recursive: true });

  const extension = extname(source).toLowerCase();
  if (extension === ".html" || extension === ".htm") {
    const contents = await readFile(source, "utf8");
    const result = await minifyHtml(contents, {
      collapseWhitespace: true,
      minifyCSS: true,
      minifyJS: true,
      removeComments: true,
      removeRedundantAttributes: true,
      useShortDoctype: true
    });
    await writeFile(destination, result);
    return;
  }

  if (extension === ".css") {
    const contents = await readFile(source, "utf8");
    const result = new CleanCSS().minify(contents).styles;
    await writeFile(destination, result);
    return;
  }

  if (extension === ".js" || extension === ".mjs") {
    const contents = await readFile(source, "utf8");
    const minified = await minifyJs(contents);
    await writeFile(destination, minified.code ?? "");
    return;
  }

  await copyFile(source, destination);
}

await mkdir(output, { recursive: true });

const [sources, previousManifest] = await Promise.all([
  Promise.resolve(
    listBuildFiles(siteConfig, renderedFiles)
      .filter((relativePath) => !relativePath.split("/").some((segment) => excluded.has(segment)))
      .map((relativePath) => join(root, relativePath))
  ),
  loadManifest()
]);

const forceRebuild = previousManifest.configFingerprint !== configFingerprint;
const nextManifest = { configFingerprint, files: {} };
const buildQueue = [];
const sourceMetadata = await Promise.all(sources.map(async (source) => {
  const relativeSource = relative(root, source);
  const destination = join(output, relativeSource);
  const signature = await fileSignature(source);
  const destinationExists = forceRebuild ? false : await exists(destination);
  return { source, relativeSource, destination, signature, destinationExists };
}));

for (const { source, relativeSource, signature, destinationExists } of sourceMetadata) {
  nextManifest.files[relativeSource] = signature;

  if (!forceRebuild && previousManifest.files[relativeSource] === signature && destinationExists) {
    continue;
  }

  buildQueue.push(source);
}

for (let index = 0; index < buildQueue.length; index += concurrency) {
  await Promise.all(buildQueue.slice(index, index + concurrency).map(buildFile));
}

const staleFiles = Object.keys(previousManifest.files).filter((relativeSource) => !(relativeSource in nextManifest.files));
for (const relativeSource of staleFiles) {
  const destination = join(output, relativeSource);
  if (await exists(destination)) {
    await unlink(destination);
  }
}

await writeFile(manifestPath, `${JSON.stringify(nextManifest, null, 2)}\n`);
console.log(`Built minified site in ${relative(root, output)}/ (${buildQueue.length} changed file${buildQueue.length === 1 ? "" : "s"}).`);
