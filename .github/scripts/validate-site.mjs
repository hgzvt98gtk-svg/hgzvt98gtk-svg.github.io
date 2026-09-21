import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";

const siteUrl = new URL("https://hussamfaroug.com/");
const roots = process.argv.slice(2);

if (roots.length === 0) {
  throw new Error("Usage: node .github/scripts/validate-site.mjs <root> [root...]");
}

const requiredFiles = [
  "index.html",
  "Privacy.html",
  "style.css",
  "HF.svg",
  "Background.jpeg",
  "social-preview.svg",
  "sitemap.xml",
  "robots.txt",
  "llms.txt",
  ".well-known/agent-card.json",
  ".well-known/api-catalog"
];

const publicPages = [
  new URL("/", siteUrl).href,
  new URL("/Privacy.html", siteUrl).href
];

async function assertFile(file) {
  const details = await stat(file).catch(() => null);
  if (!details?.isFile()) {
    throw new Error(`Missing required file: ${file}`);
  }
}

function assertIncludes(contents, expected, description) {
  if (!contents.includes(expected)) {
    throw new Error(`Expected ${description} to include ${expected}`);
  }
}

function assertOmits(contents, forbidden, description) {
  if (forbidden.test(contents)) {
    throw new Error(`Unexpected legacy reference in ${description}`);
  }
}

for (const root of roots) {
  for (const relativePath of requiredFiles) {
    await assertFile(join(root, relativePath));
  }

  const indexHtml = await readFile(join(root, "index.html"), "utf8");
  const privacyHtml = await readFile(join(root, "Privacy.html"), "utf8");
  const styleCss = await readFile(join(root, "style.css"), "utf8");
  const sitemapXml = await readFile(join(root, "sitemap.xml"), "utf8");
  const llmsTxt = await readFile(join(root, "llms.txt"), "utf8");

  for (const stylesheetPage of [
    { name: "index.html", contents: indexHtml },
    { name: "Privacy.html", contents: privacyHtml }
  ]) {
    assertIncludes(stylesheetPage.contents, 'href="/style.css"', stylesheetPage.name);
    assertIncludes(stylesheetPage.contents, 'href="/HF.svg"', stylesheetPage.name);
  }

  assertIncludes(styleCss, 'url("/Background.jpeg")', "style.css");
  assertIncludes(indexHtml, new URL("/social-preview.svg", siteUrl).href, "index.html");

  for (const pageUrl of publicPages) {
    assertIncludes(sitemapXml, pageUrl, "sitemap.xml");
    assertIncludes(llmsTxt, pageUrl, "llms.txt");
  }

  const crossReferenceFiles = [
    { name: "index.html", contents: indexHtml },
    { name: "Privacy.html", contents: privacyHtml },
    { name: "sitemap.xml", contents: sitemapXml },
    { name: "llms.txt", contents: llmsTxt }
  ];

  for (const file of crossReferenceFiles) {
    assertOmits(file.contents, /social-preview\.png|https:\/\/hussamfaroug\.com\/Privacy(?!\.html)/, file.name);
  }

  JSON.parse(await readFile(join(root, ".well-known/agent-card.json"), "utf8"));
  JSON.parse(await readFile(join(root, ".well-known/api-catalog"), "utf8"));
}
