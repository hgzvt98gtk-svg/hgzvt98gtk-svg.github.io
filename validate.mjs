import { access, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const mode = process.argv[2] === "dist" ? "dist" : "source";
const base = mode === "dist" ? join(root, "dist") : root;

const requiredFiles = [
  "index.html",
  "Privacy.html",
  "style.css",
  "site.js",
  "HF.svg",
  "Background.jpeg",
  "social-preview.svg",
  "sitemap.xml",
  "robots.txt",
  "llms.txt",
  ".well-known/agent-card.json",
  ".well-known/api-catalog",
  ".well-known/mta-sts.txt"
];

const requiredMatches = [
  ["index.html", 'href="/style.css"'],
  ["index.html", 'href="/HF.svg"'],
  ["index.html", 'src="/site.js"'],
  ["index.html", "https://hussamfaroug.com/social-preview.svg"],
  ["index.html", "/.well-known/agent-card.json"],
  ["index.html", "/.well-known/api-catalog"],
  ["style.css", 'url("/Background.jpeg")'],
  ["sitemap.xml", "https://hussamfaroug.com/Privacy.html"],
  ["llms.txt", "https://hussamfaroug.com/Privacy.html"]
];

async function assertFile(pathname) {
  await access(join(base, pathname));
}

async function assertMatch(pathname, snippet) {
  const contents = await readFile(join(base, pathname), "utf8");
  if (!contents.includes(snippet)) throw new Error(`Expected ${pathname} to include ${snippet}`);
}

async function validateJson(pathname) {
  JSON.parse(await readFile(join(base, pathname), "utf8"));
}

async function validateMtaSts() {
  const lines = (await readFile(join(base, ".well-known/mta-sts.txt"), "utf8")).trim().split("\n");
  const mxCount = lines.filter((line) => line.startsWith("mx: ")).length;
  if (!lines.includes("version: STSv1")) throw new Error("Missing STSv1 version");
  if (!lines.includes("mode: enforce")) throw new Error("MTA-STS mode must be enforce");
  if (mxCount !== 2) throw new Error("Expected exactly two mx entries");
}

for (const pathname of requiredFiles) await assertFile(pathname);
for (const [pathname, snippet] of requiredMatches) await assertMatch(pathname, snippet);
await validateJson(".well-known/agent-card.json");
await validateJson(".well-known/api-catalog");
await validateMtaSts();

console.log(`Validated ${mode} files in ${base}`);
