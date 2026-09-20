import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));

export const agentCardPath = "/.well-known/agent-card.json";
export const apiCatalogPath = "/.well-known/api-catalog";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertString(value, message) {
  assert(typeof value === "string" && value.length > 0, message);
}

function assertBoolean(value, message) {
  assert(typeof value === "boolean", message);
}

function assertArray(value, message) {
  assert(Array.isArray(value), message);
}

function assertObject(value, message) {
  assert(typeof value === "object" && value !== null && !Array.isArray(value), message);
}

function validateSiteConfig(site) {
  assertObject(site, "site.config.json must contain an object");
  assertString(site.owner, "site.owner must be a non-empty string");
  assertString(site.domain, "site.domain must be a non-empty string");
  assertString(site.url, "site.url must be a non-empty string");
  assertString(site.themeColor, "site.themeColor must be a non-empty string");
  assertString(site.socialImage, "site.socialImage must be a non-empty string");

  assertObject(site.llms, "site.llms must be an object");
  assertString(site.llms.summary, "site.llms.summary must be a non-empty string");
  assertString(site.llms.about, "site.llms.about must be a non-empty string");

  assertArray(site.pages, "site.pages must be an array");
  assert(site.pages.length > 0, "site.pages must not be empty");
  for (const [index, page] of site.pages.entries()) {
    assertObject(page, `site.pages[${index}] must be an object`);
    assertString(page.path, `site.pages[${index}].path must be a non-empty string`);
    assertString(page.label, `site.pages[${index}].label must be a non-empty string`);
    assertString(page.title, `site.pages[${index}].title must be a non-empty string`);
    assertString(page.description, `site.pages[${index}].description must be a non-empty string`);
    assertString(page.canonical, `site.pages[${index}].canonical must be a non-empty string`);
    assertString(page.listDescription, `site.pages[${index}].listDescription must be a non-empty string`);
    assertString(page.lastmod, `site.pages[${index}].lastmod must be a non-empty string`);
    assertBoolean(page.social, `site.pages[${index}].social must be a boolean`);
  }

  assertObject(site.privacy, "site.privacy must be an object");
  assertString(site.privacy.updatedLabel, "site.privacy.updatedLabel must be a non-empty string");
  assertArray(site.privacy.sections, "site.privacy.sections must be an array");
  assert(site.privacy.sections.length > 0, "site.privacy.sections must not be empty");
  for (const [index, section] of site.privacy.sections.entries()) {
    assertObject(section, `site.privacy.sections[${index}] must be an object`);
    assertString(section.heading, `site.privacy.sections[${index}].heading must be a non-empty string`);
    assertString(section.body, `site.privacy.sections[${index}].body must be a non-empty string`);
  }
}

export async function readSiteConfig() {
  const site = JSON.parse(await readFile(join(root, "site.config.json"), "utf8"));
  validateSiteConfig(site);
  return site;
}

export function pageByPath(site, pathname) {
  const page = site.pages.find((entry) => entry.path === pathname);
  if (!page) throw new Error(`Missing page config for ${pathname}`);
  return page;
}

export function requiredMatchesForSite(site) {
  const privacyPage = pageByPath(site, "/Privacy.html");

  return [
    ["index.html", 'href="/style.css"'],
    ["index.html", 'href="/HF.svg"'],
    ["index.html", 'src="/site.js"'],
    ["index.html", site.socialImage],
    ["site.js", agentCardPath],
    ["site.js", apiCatalogPath],
    ["_headers", "/.well-known/agent-card.json"],
    ["_headers", "/.well-known/api-catalog"],
    ["_headers", "X-Robots-Tag: noindex, nofollow, noarchive"],
    ["style.css", 'url("/Background.jpeg")'],
    ["sitemap.xml", privacyPage.canonical],
    ["llms.txt", privacyPage.canonical]
  ];
}
