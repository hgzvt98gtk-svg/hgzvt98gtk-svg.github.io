import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const headersPath = join(root, "_headers");
const indexPath = join(root, "index.html");

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

const [headersContents, indexContents] = await Promise.all([
  readFile(headersPath, "utf8"),
  readFile(indexPath, "utf8")
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

for (const forbidden of ["'unsafe-inline'", "'unsafe-eval'", "'nonce-"]) {
  if (csp.includes(forbidden)) {
    throw new Error(`CSP must not include ${forbidden}.`);
  }
}

for (const [name, expectedSources] of [
  ["default-src", ["'self'"]],
  ["script-src", ["'self'", "https://challenges.cloudflare.com"]],
  ["style-src", ["'self'"]],
  ["img-src", ["'self'"]],
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

  for (const source of expectedSources) {
    if (!actualSources.includes(source)) {
      throw new Error(`CSP ${name} must include ${source}.`);
    }
  }
}

if (!directives.has("upgrade-insecure-requests")) {
  throw new Error("CSP is missing upgrade-insecure-requests.");
}

if (siteBlock.headers.has("Cross-Origin-Embedder-Policy")) {
  throw new Error("Cross-Origin-Embedder-Policy is too strict for Cloudflare challenge compatibility.");
}

if (!/script[^>]+type="module"[^>]+src="\/index\.js"/.test(indexContents)) {
  throw new Error('index.html must load /index.js as a module script.');
}

if (/<script\b(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/i.test(indexContents)) {
  throw new Error("Inline scripts require a CSP hash or nonce and are not allowed here.");
}

console.log("Security header configuration looks valid.");
