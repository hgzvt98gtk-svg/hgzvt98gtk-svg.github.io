import { readFile, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { siteConfig } from "./site.config.mjs";
import { getGeneratedFiles } from "./site-files.mjs";

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const generatedFiles = getGeneratedFiles();
const baseAssets = [
  "index.html",
  "Privacy.html",
  "style.css",
  "HF.svg",
  "Background.jpeg",
  "social-preview.svg",
  "site-tools.mjs",
  "sitemap.xml",
  "robots.txt",
  "llms.txt",
  "CNAME",
  ".well-known/agent-card.json",
  ".well-known/api-catalog",
  ".well-known/mta-sts.txt",
  ".well-known/bimi/logo.svg"
];
const copiedAssets = [
  "Background.jpeg",
  "HF.svg",
  "social-preview.svg",
  "robots.txt",
  "llms.txt",
  "CNAME",
  ".well-known/agent-card.json",
  ".well-known/api-catalog",
  ".well-known/mta-sts.txt",
  ".well-known/bimi/logo.svg"
];

async function readText(root, relativePath) {
  return await readFile(join(root, relativePath), "utf8");
}

async function assertFile(root, relativePath) {
  const filePath = join(root, relativePath);
  const details = await stat(filePath);
  if (!details.isFile()) {
    throw new Error(`Expected file: ${filePath}`);
  }
}

function assertIncludes(contents, value, filePath) {
  if (!contents.includes(value)) {
    throw new Error(`Expected ${filePath} to include ${value}`);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`Unexpected ${label}`);
  }
}

function parseMtaSts(contents) {
  const lines = contents.trim().split("\n");
  const result = {};
  const mx = [];

  for (const line of lines) {
    const [key, ...rest] = line.split(":");
    const value = rest.join(":").trim();
    if (key === "mx") mx.push(value);
    else result[key.trim()] = value;
  }

  return {
    version: result.version,
    mode: result.mode,
    maxAge: result.max_age,
    mx
  };
}

async function validateGeneratedSourceFiles() {
  for (const [relativePath, expected] of generatedFiles) {
    const actual = await readText(repositoryRoot, relativePath);
    assertEqual(actual, expected, relativePath);
  }
}

async function validateCopiedAssets() {
  for (const relativePath of copiedAssets) {
    const source = await readFile(join(repositoryRoot, relativePath));
    const built = await readFile(join(repositoryRoot, "dist", relativePath));
    assertEqual(Buffer.compare(source, built), 0, `dist copy for ${relativePath}`);
  }
}

async function validateRoot(root) {
  for (const relativePath of baseAssets) {
    await assertFile(root, relativePath);
  }

  const indexHtml = await readText(root, "index.html");
  assertIncludes(indexHtml, `href="${siteConfig.assets.stylesheet}"`, `${root}/index.html`);
  assertIncludes(indexHtml, `href="${siteConfig.assets.favicon}"`, `${root}/index.html`);
  assertIncludes(indexHtml, `src="${siteConfig.assets.runtimeScript}"`, `${root}/index.html`);
  assertIncludes(indexHtml, `${siteConfig.origin}${siteConfig.assets.socialPreview}`, `${root}/index.html`);

  const privacyHtml = await readText(root, "Privacy.html");
  assertIncludes(privacyHtml, `mailto:${siteConfig.contactEmail}`, `${root}/Privacy.html`);

  const styleCss = await readText(root, "style.css");
  assertIncludes(styleCss, `url("${siteConfig.assets.background}")`, `${root}/style.css`);

  const sitemap = await readText(root, "sitemap.xml");
  for (const page of siteConfig.pages) {
    assertIncludes(sitemap, `${siteConfig.origin}${page.path}`, `${root}/sitemap.xml`);
  }

  const llms = await readText(root, "llms.txt");
  assertIncludes(llms, `${siteConfig.origin}${privacyPagePath()}`, `${root}/llms.txt`);
  assertIncludes(llms, siteConfig.contactEmail, `${root}/llms.txt`);

  const cname = await readText(root, "CNAME");
  assertEqual(cname, generatedFiles.get("CNAME"), `${root}/CNAME`);

  const agentCard = JSON.parse(await readText(root, ".well-known/agent-card.json"));
  assertEqual(agentCard.url, `${siteConfig.origin}/`, `${root}/.well-known/agent-card.json url`);
  assertEqual(agentCard.status, "agent-ready", `${root}/.well-known/agent-card.json status`);

  const apiCatalog = JSON.parse(await readText(root, ".well-known/api-catalog"));
  assertEqual(apiCatalog.site, `${siteConfig.origin}/`, `${root}/.well-known/api-catalog site`);

  const mtaSts = parseMtaSts(await readText(root, ".well-known/mta-sts.txt"));
  assertEqual(mtaSts.version, siteConfig.mtaSts.version, `${root}/.well-known/mta-sts.txt version`);
  assertEqual(mtaSts.mode, siteConfig.mtaSts.mode, `${root}/.well-known/mta-sts.txt mode`);
  assertEqual(String(mtaSts.maxAge), String(siteConfig.mtaSts.maxAge), `${root}/.well-known/mta-sts.txt max_age`);
  assertEqual(mtaSts.mx.join(","), siteConfig.mtaSts.mx.join(","), `${root}/.well-known/mta-sts.txt mx`);
}

function privacyPagePath() {
  return siteConfig.pages.find((page) => page.path !== "/")?.path ?? "/Privacy.html";
}

await validateGeneratedSourceFiles();
await validateRoot(repositoryRoot);
await validateRoot(join(repositoryRoot, "dist"));
await validateCopiedAssets();

console.log("Validated source and dist site files.");
