import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const headersPath = join(root, "_headers");
const htmlPagePaths = ["index.html", "Privacy.html"].map((path) => join(root, path));

function parseHeaders(contents) {
  const blocks = [];
  let current = null;

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trimEnd();

    if (!line) {
      current = null;
      continue;
    }

    if (!rawLine.startsWith(" ")) {
      if (!line.startsWith("/")) throw new Error(`Invalid path line: ${line}`);
      current = { path: line, headers: new Map() };
      blocks.push(current);
      continue;
    }

    if (!current) throw new Error(`Header line without path: ${line}`);

    const separator = line.indexOf(":");
    if (separator <= 0) throw new Error(`Invalid header line: ${line}`);

    const name = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    current.headers.set(name, value);
  }

  return blocks;
}

function findBlock(blocks, path) {
  const block = blocks.find((entry) => entry.path === path);
  if (!block) throw new Error(`Missing ${path} block in _headers`);
  return block;
}

function parseCsp(value) {
  const directives = new Map();

  for (const directive of value.split(";")) {
    const trimmed = directive.trim();
    if (!trimmed) continue;
    const [name, ...sources] = trimmed.split(/\s+/);
    directives.set(name, sources);
  }

  return directives;
}

function parseAttributes(value) {
  const attributes = new Map();

  for (const match of value.matchAll(/([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    attributes.set(match[1], match[2] ?? match[3] ?? "");
  }

  return attributes;
}

function sameSources(actualSources, expectedSources) {
  if (actualSources.length !== expectedSources.length) return false;

  const actual = [...actualSources].sort();
  const expected = [...expectedSources].sort();
  return actual.every((value, index) => value === expected[index]);
}

const [headersContents, ...htmlPages] = await Promise.all([
  readFile(headersPath, "utf8"),
  ...htmlPagePaths.map((path) => readFile(path, "utf8"))
]);

const blocks = parseHeaders(headersContents);

if (blocks.some((block) => block.path === "/auth.md")) {
  throw new Error("Remove the unused /auth.md header exception.");
}

if (blocks.some((block) => block.path === "/.well-known/*")) {
  throw new Error("Use narrow .well-known exceptions instead of /.well-known/*.");
}

const bimiBlock = findBlock(blocks, "/.well-known/bimi/logo.svg");
if (bimiBlock.headers.get("Cross-Origin-Resource-Policy") !== "cross-origin") {
  throw new Error("BIMI logo must stay cross-origin.");
}

const mtaStsBlock = findBlock(blocks, "/.well-known/mta-sts.txt");
if (mtaStsBlock.headers.get("Cross-Origin-Resource-Policy") !== "cross-origin") {
  throw new Error("MTA-STS policy must stay cross-origin.");
}

const siteBlock = findBlock(blocks, "/*");
const csp = siteBlock.headers.get("Content-Security-Policy");
if (!csp) throw new Error("Missing Content-Security-Policy for /*.");
const directives = parseCsp(csp);

for (const forbidden of ["'unsafe-inline'", "'unsafe-eval'"]) {
  if (csp.includes(forbidden)) {
    throw new Error(`CSP must not include ${forbidden}.`);
  }
}

for (const sources of directives.values()) {
  if (sources.some((source) => /^'nonce-[^']+'$/.test(source))) {
    throw new Error("CSP must not include nonce sources.");
  }
}

for (const [name, expectedSources] of [
  ["default-src", ["'self'"]],
  ["script-src", ["'self'", "https://challenges.cloudflare.com"]],
  ["style-src", ["'self'"]],
  ["img-src", ["'self'", "https://hussamfaroug.com"]],
  ["font-src", ["'self'"]],
  ["connect-src", ["'self'", "https://challenges.cloudflare.com"]],
  ["object-src", ["'none'"]],
  ["base-uri", ["'self'"]],
  ["form-action", ["'self'"]],
  ["frame-ancestors", ["'self'"]],
  ["frame-src", ["https://challenges.cloudflare.com"]]
]) {
  const actualSources = directives.get(name);
  if (!actualSources) {
    throw new Error(`CSP is missing ${name}.`);
  }

  if (!sameSources(actualSources, expectedSources)) {
    throw new Error(`CSP ${name} must be exactly: ${expectedSources.join(" ")}.`);
  }
}

if (!directives.has("upgrade-insecure-requests")) {
  throw new Error("CSP is missing upgrade-insecure-requests.");
}

if (siteBlock.headers.has("Cross-Origin-Embedder-Policy")) {
  throw new Error("Cross-Origin-Embedder-Policy is too strict for Cloudflare challenge compatibility.");
}

const [indexContents] = htmlPages;
const indexScripts = [...indexContents.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
const externalModuleScript = indexScripts.find(([, attributeText]) => {
  const attributes = parseAttributes(attributeText);
  return attributes.get("src") === "/index.js" && attributes.get("type") === "module";
});

if (!externalModuleScript) {
  throw new Error('index.html must load /index.js as a module script.');
}

for (const [pagePath, contents] of htmlPagePaths.map((path, index) => [path, htmlPages[index]])) {
  const scriptTags = [...contents.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  for (const [, , scriptContents] of scriptTags) {
    if (scriptContents.trim()) {
      throw new Error(`${pagePath} contains inline script content, which requires a CSP hash or nonce.`);
    }
  }
}

console.log("Security header configuration looks valid.");
