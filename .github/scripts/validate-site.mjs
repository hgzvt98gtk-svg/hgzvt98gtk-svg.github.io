import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { siteConfig, siteUrls } from "./site.config.mjs";
import { renderSiteFiles } from "./site-files.mjs";
import { validateSiteConfig } from "./validate-config.mjs";

const root = join(fileURLToPath(new URL("../..", import.meta.url)));
validateSiteConfig(siteConfig, siteUrls);
const generatedFiles = renderSiteFiles(siteConfig, siteUrls);

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

async function validateRoot(rootPath, { expectGeneratedSource } = {}) {
  const required = [
    "index.html",
    "app.js",
    "Privacy.html",
    "style.css",
    "HF.svg",
    "Background.jpeg",
    "social-preview.svg",
    "sitemap.xml",
    "robots.txt",
    "llms.txt",
    ".well-known/agent-card.json",
    ".well-known/api-catalog",
    ".well-known/bimi/logo.svg",
    ".well-known/mta-sts.txt"
  ];

  await Promise.all(required.map((relativePath) => mustExist(join(rootPath, relativePath))));

  if (expectGeneratedSource) {
    await Promise.all([...generatedFiles].map(async ([relativePath, expectedContents]) => {
      const actualContents = await read(rootPath, relativePath);
      assert(actualContents === expectedContents, `${rootPath}: ${relativePath} is out of date; run npm run generate`);
    }));
  }

  const [index, privacy, style, appScript, sitemap, robots, llms, agentCardText, apiCatalogText, mtaSts] = await Promise.all([
    read(rootPath, "index.html"),
    read(rootPath, "Privacy.html"),
    read(rootPath, "style.css"),
    read(rootPath, "app.js"),
    read(rootPath, "sitemap.xml"),
    read(rootPath, "robots.txt"),
    read(rootPath, "llms.txt"),
    read(rootPath, ".well-known/agent-card.json"),
    read(rootPath, ".well-known/api-catalog"),
    read(rootPath, ".well-known/mta-sts.txt")
  ]);

  assert(includesAttribute(index, "href", siteConfig.assetPaths.stylesheet), `${rootPath}: index.html missing stylesheet link`);
  assert(includesAttribute(index, "href", siteConfig.assetPaths.icon), `${rootPath}: index.html missing icon link`);
  assert(includesAttribute(index, "src", siteConfig.assetPaths.appScript), `${rootPath}: index.html missing app script`);
  assert(index.includes(siteUrls.socialPreview), `${rootPath}: index.html missing social preview URL`);
  assert(includesAttribute(privacy, "href", siteConfig.assetPaths.stylesheet), `${rootPath}: Privacy.html missing stylesheet link`);
  assert(includesAttribute(privacy, "href", siteConfig.assetPaths.icon), `${rootPath}: Privacy.html missing icon link`);
  assert(new RegExp(`url\\((["'])?${siteConfig.assetPaths.background.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\1?\\)`).test(style), `${rootPath}: style.css missing background asset`);
  assert(appScript.includes(siteConfig.assetPaths.agentCard), `${rootPath}: app.js missing agent-card fetch`);
  assert(appScript.includes(siteConfig.assetPaths.apiCatalog), `${rootPath}: app.js missing api-catalog fetch`);
  assert(appScript.includes(siteConfig.siteStatus), `${rootPath}: app.js missing site status`);
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
  assert(lines.filter((line) => line.startsWith("mx: ")).length === siteConfig.mtaSts.mx.length, `${rootPath}: invalid MTA-STS mx count`);
}

await validateRoot(root, { expectGeneratedSource: true });
await validateRoot(join(root, "dist"));

console.log("Validated source and dist site references.");
