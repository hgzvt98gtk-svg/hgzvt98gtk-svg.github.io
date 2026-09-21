import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { siteConfig, siteUrls } from "./site.config.mjs";
import { renderSiteFiles } from "./site-files.mjs";
import { validateSiteConfig } from "./validate-config.mjs";

const root = join(fileURLToPath(new URL("../..", import.meta.url)));
validateSiteConfig(siteConfig, siteUrls);
const generatedFiles = renderSiteFiles(siteConfig, siteUrls);
const staticFiles = [
  "style.css",
  "HF.svg",
  "Background.jpeg",
  "social-preview.svg",
  ".well-known/bimi/logo.svg"
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function includesAttribute(contents, attribute, value) {
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`${attribute}\\s*=\\s*["']${escaped}["']`);
  return pattern.test(contents);
}

async function mustExist(path) {
  await access(path, constants.F_OK);
}

async function read(rootPath, relativePath) {
  return readFile(join(rootPath, relativePath), "utf8");
}

async function validateRenderedFiles(rootPath, { includeHtml = true } = {}) {
  await Promise.all([...generatedFiles.entries()].map(async ([relativePath, expected]) => {
    const extension = extname(relativePath).toLowerCase();
    const shouldMatch = includeHtml || (extension !== ".html" && extension !== ".htm");
    if (!shouldMatch) return;
    const actual = await read(rootPath, relativePath);
    assert(actual === expected, `${rootPath}: ${relativePath} has drifted from the shared renderer`);
  }));
}

async function validateRoot(rootPath) {
  const required = [...generatedFiles.keys(), ...staticFiles];
  await Promise.all(required.map((relativePath) => mustExist(join(rootPath, relativePath))));

  const [index, privacy, style, sitemap, robots, llms, agentCardText, apiCatalogText, mtaSts] = await Promise.all([
    read(rootPath, "index.html"),
    read(rootPath, "Privacy.html"),
    read(rootPath, "style.css"),
    read(rootPath, "sitemap.xml"),
    read(rootPath, "robots.txt"),
    read(rootPath, "llms.txt"),
    read(rootPath, ".well-known/agent-card.json"),
    read(rootPath, ".well-known/api-catalog"),
    read(rootPath, ".well-known/mta-sts.txt")
  ]);

  assert(includesAttribute(index, "href", siteConfig.assetPaths.stylesheet), `${rootPath}: index.html missing stylesheet link`);
  assert(includesAttribute(index, "href", siteConfig.assetPaths.icon), `${rootPath}: index.html missing icon link`);
  assert(index.includes(siteUrls.socialPreview), `${rootPath}: index.html missing social preview URL`);
  assert(index.includes(siteConfig.assetPaths.agentCard), `${rootPath}: index.html missing agent-card fetch`);
  assert(index.includes(siteConfig.assetPaths.apiCatalog), `${rootPath}: index.html missing api-catalog fetch`);
  assert(includesAttribute(privacy, "href", siteConfig.assetPaths.stylesheet), `${rootPath}: Privacy.html missing stylesheet link`);
  assert(includesAttribute(privacy, "href", siteConfig.assetPaths.icon), `${rootPath}: Privacy.html missing icon link`);
  assert(new RegExp(`url\\((["'])?${siteConfig.assetPaths.background.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\1?\\)`).test(style), `${rootPath}: style.css missing background asset`);
  assert(sitemap.includes(siteUrls.privacy), `${rootPath}: sitemap.xml missing privacy URL`);
  assert(robots.includes(`Sitemap: ${siteUrls.sitemap}`), `${rootPath}: robots.txt missing sitemap URL`);
  assert(llms.includes(siteUrls.privacy), `${rootPath}: llms.txt missing privacy URL`);
  assert(!/(social-preview\.png|https:\/\/hussamfaroug\.com\/Privacy[^.])/.test(`${index}\n${privacy}\n${sitemap}\n${llms}`), `${rootPath}: found outdated URL references`);

  const agentCard = JSON.parse(agentCardText);
  const apiCatalog = JSON.parse(apiCatalogText);
  assert(agentCard.name === siteConfig.personName, `${rootPath}: unexpected agent-card name`);
  assert(agentCard.url === siteUrls.home, `${rootPath}: unexpected agent-card url`);
  assert(agentCard.status === siteConfig.siteStatus, `${rootPath}: unexpected agent-card status`);
  assert(apiCatalog.site === siteUrls.home, `${rootPath}: unexpected api-catalog site`);
  assert(Array.isArray(apiCatalog.apis), `${rootPath}: api-catalog apis must be an array`);

  const lines = mtaSts.trim().split("\n");
  assert(lines[0] === `version: ${siteConfig.mtaSts.version}`, `${rootPath}: invalid MTA-STS version`);
  assert(lines[1] === `mode: ${siteConfig.mtaSts.mode}`, `${rootPath}: invalid MTA-STS mode`);
  assert(lines.at(-1) === `max_age: ${siteConfig.mtaSts.maxAge}`, `${rootPath}: invalid MTA-STS max_age`);
  assert(siteConfig.mtaSts.mx.every((mx) => lines.includes(`mx: ${mx}`)), `${rootPath}: invalid MTA-STS mx values`);
  assert(lines.filter((line) => line.startsWith("mx: ")).length === siteConfig.mtaSts.mx.length, `${rootPath}: invalid MTA-STS mx count`);
}

await validateRenderedFiles(root);
await validateRenderedFiles(join(root, "dist"), { includeHtml: false });
await validateRoot(root);
await validateRoot(join(root, "dist"));

console.log("Validated source and dist site references.");
