import { copyFile, mkdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
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
import { fileSignature } from "./.github/scripts/file-signature.mjs";
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
const cssMinifier = new CleanCSS();

async function statIfExists(path) {
  try {
    return await stat(path);
  } catch (error) {
    if (error?.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function loadManifest() {
  try {
    const text = await readFile(manifestPath, "utf8");
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (error) {
      throw new Error(`Invalid build manifest at ${manifestPath}: ${error.message}`, { cause: error });
    }
    return {
      configFingerprint: parsed.configFingerprint ?? "",
      files: typeof parsed.files === "object" && parsed.files !== null ? parsed.files : {}
    };
  } catch (error) {
    if (error?.code === "ENOENT") {
      return { configFingerprint: "", files: {} };
    }
    throw error;
  }
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
    const result = cssMinifier.minify(contents).styles;
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
  const sourceStats = await stat(source);
  const signature = fileSignature(sourceStats);
  return { source, relativeSource, signature };
}));

for (const { source, relativeSource, signature } of sourceMetadata) {
  nextManifest.files[relativeSource] = signature;

  if (!forceRebuild && previousManifest.files[relativeSource] === signature) {
    const destination = join(output, relativeSource);
    if (await statIfExists(destination)) {
      continue;
    }
  }

  buildQueue.push(source);
}

for (let index = 0; index < buildQueue.length; index += concurrency) {
  await Promise.all(buildQueue.slice(index, index + concurrency).map(buildFile));
}

const staleFiles = Object.keys(previousManifest.files).filter((relativeSource) => !(relativeSource in nextManifest.files));
for (let index = 0; index < staleFiles.length; index += concurrency) {
  await Promise.all(staleFiles.slice(index, index + concurrency).map(async (relativeSource) => {
    const destination = join(output, relativeSource);
    try {
      await unlink(destination);
    } catch (error) {
      if (error?.code !== "ENOENT") {
        throw error;
      }
    }
  }));
}

await writeFile(manifestPath, `${JSON.stringify(nextManifest, null, 2)}\n`);
console.log(`Built minified site in ${relative(root, output)}/ (${buildQueue.length} changed file${buildQueue.length === 1 ? "" : "s"}).`);
