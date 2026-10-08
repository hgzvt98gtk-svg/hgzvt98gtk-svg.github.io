import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { parse } from "acorn";
import { minify } from "terser";
import { renderSiteFiles } from "./site-files.mjs";
import { siteFilePaths } from "./site-paths.mjs";
import { siteConfig } from "./site.config.mjs";
import { siteUrls } from "./site-urls.mjs";
import { includesAttribute, validateRuntimeBootstrapScript } from "./validate-site-helpers.mjs";
import { runAcrossValidationRoots } from "./validation-roots.mjs";

const files = renderSiteFiles(siteConfig, siteUrls);
const root = fileURLToPath(new URL("../..", import.meta.url));
const imageOrigins = [siteConfig.origin, "https://assets.hussamfaroug.com"];

function attributeValue(attributes, name) {
  const match = attributes.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return match ? match[1] ?? match[2] ?? match[3] : undefined;
}

function assertResourceUrl(value, origins, label) {
  const url = new URL(value, siteConfig.origin);
  assert.equal(url.protocol, "https:", label);
  assert.ok(origins.includes(url.origin), `${label}: unapproved resource origin ${url.origin}`);
}

function assertPageCsp(html, label) {
  assert.doesNotMatch(html, /\s(?:on[a-z]+|style)\s*=/i, label);
  assert.doesNotMatch(html, /<(?:style|object|embed|applet|base)\b/i, label);
  assert.doesNotMatch(html, /http-equiv\s*=\s*["']?Content-Security-Policy\b/i, label);
  for (const [, attributes, contents] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\b[^>]*>/gi)) {
    assert.equal(attributeValue(attributes, "src"), `/${siteFilePaths.bootstrapScript}`, label);
    assert.equal(contents.trim(), "", label);
  }
  for (const [, tag, attributes] of html.matchAll(/<(script|link|img|iframe|form)\b([^>]*)>/gi)) {
    const name = tag.toLowerCase();
    const rel = attributeValue(attributes, "rel")?.toLowerCase().split(/\s+/) ?? [];
    const origins = name === "img" || (name === "link" && rel.includes("icon"))
      ? imageOrigins
      : [siteConfig.origin];
    const attribute = name === "link" ? "href" : name === "form" ? "action" : "src";
    const value = attributeValue(attributes, attribute);
    if (value !== undefined) assertResourceUrl(value, origins, label);
    const formAction = attributeValue(attributes, "formaction");
    if (formAction !== undefined) assertResourceUrl(formAction, [siteConfig.origin], label);
  }
  for (const [, attributes] of html.matchAll(/<(?:button|input)\b([^>]*)>/gi)) {
    const value = attributeValue(attributes, "formaction");
    if (value !== undefined) assertResourceUrl(value, [siteConfig.origin], label);
  }
}

function assertStylesheetCsp(css, label) {
  for (const [, value] of css.matchAll(/@import\s+(?:url\(\s*)?["']?([^"'\s);]+)/gi)) {
    assertResourceUrl(value, [siteConfig.origin], label);
  }
  css = css.replace(/@import\b[^;]*;/gi, "");
  css = css.replace(/@font-face\s*\{[^}]*\}/gi, (rule) => {
    for (const [, value] of rule.matchAll(/url\(\s*["']?([^"')\s]+)["']?\s*\)/gi)) {
      assertResourceUrl(value, [siteConfig.origin], label);
    }
    return "";
  });
  for (const [, value] of css.matchAll(/url\(\s*["']?([^"')\s]+)["']?\s*\)/gi)) {
    assertResourceUrl(value, imageOrigins, label);
  }
}

test("generated pages contain no inline code or unapproved resource URLs", () => {
  for (const [path, html] of files) {
    if (path.endsWith(".html")) assertPageCsp(html, path);
  }
  assert.ok(includesAttribute(files.get(siteFilePaths.index), "src", `/${siteFilePaths.bootstrapScript}`));
});

test("CSP checks reject inline code and insecure or unapproved resources", () => {
  for (const html of [
    '<button onclick="alert(1)">Click</button>',
    '<p style="color:red">Text</p>',
    "<style>body { color: red; }</style>",
    "<script>alert(1)</script>",
    '<meta http-equiv=Content-Security-Policy content="default-src *">',
    '<object data="/file"></object>',
    '<embed src="/file">',
    '<applet code="Example"></applet>',
    '<base href="/">',
    '<img src="http://assets.hussamfaroug.com/HF.svg">',
    '<img src="//unapproved.example/image.png">',
    '<script src="https://unapproved.example/script.js"></script>',
    '<link rel="stylesheet" href="https://assets.hussamfaroug.com/style.css">',
    '<iframe src="https://unapproved.example/"></iframe>',
    '<form action="https://unapproved.example/"></form>',
    '<button formaction="https://unapproved.example/">Submit</button>'
  ]) {
    assert.throws(() => assertPageCsp(html, "fixture"), undefined, html);
  }
  for (const css of [
    'body { background: url("http://assets.hussamfaroug.com/image.png"); }',
    'body { background: url("//unapproved.example/image.png"); }',
    '@import "https://unapproved.example/style.css";',
    '@import url("https://assets.hussamfaroug.com/style.css");',
    '@font-face { src: url("https://assets.hussamfaroug.com/font.woff2"); }'
  ]) {
    assert.throws(() => assertStylesheetCsp(css, "fixture"), undefined, css);
  }
});

test("CSP checks retain approved images, same-origin forms/frames, and mail links", () => {
  assertPageCsp(`
    <link rel="icon" href="https://assets.hussamfaroug.com/HF.svg">
    <img src="/social-preview.svg">
    <iframe src="/"></iframe>
    <form action="/" target="_blank"><button formaction="/">Submit</button></form>
    <a href="mailto:admin@hussamfaroug.com">Email</a>
  `, "fixture");
  assertStylesheetCsp('body { background: url("https://assets.hussamfaroug.com/Background.jpeg"); }', "fixture");
  assertStylesheetCsp('@import "/other.css"; @font-face { src: url("/font.woff2"); }', "fixture");
});

test("source and built pages, styles, bootstrap, and headers retain CSP compatibility", async () => {
  await runAcrossValidationRoots(root, async ({ path, name }) => {
    for (const file of files.keys()) {
      if (!file.endsWith(".html")) continue;
      assertPageCsp(await readFile(join(path, file), "utf8"), `${name}/${file}`);
    }
    assertStylesheetCsp(await readFile(join(path, "style.css"), "utf8"), `${name}/style.css`);
    const bootstrap = await readFile(join(path, siteFilePaths.bootstrapScript), "utf8");
    assert.ok(validateRuntimeBootstrapScript(bootstrap, siteConfig), `${name}/${siteFilePaths.bootstrapScript}`);
    assert.equal(await readFile(join(path, "_headers"), "utf8"), await readFile(join(root, "_headers"), "utf8"), name);
  });
});

test("configured runtime scripts and API requests remain same-origin HTTPS", () => {
  for (const key of ["appScript", "agentCard", "apiCatalog"]) {
    assertResourceUrl(siteConfig.assetPaths[key], [siteConfig.origin], key);
  }
});

test("external bootstrap retains the feature-gated same-origin import before and after minification", async () => {
  const source = files.get(siteFilePaths.bootstrapScript);
  const statement = parse(source, { ecmaVersion: "latest", sourceType: "module" }).body;
  assert.equal(statement.length, 1);
  const [gate] = statement;
  assert.equal(gate.type, "IfStatement");
  assert.equal(gate.test.operator, "in");
  assert.equal(gate.test.left.value, "modelContext");
  assert.equal(gate.test.right.name, "navigator");
  assert.equal(gate.alternate, null);
  assert.equal(gate.consequent.body.length, 1);
  const expression = gate.consequent.body[0].expression;
  assert.equal(expression.type, "ImportExpression");
  assert.equal(expression.source.value, siteConfig.assetPaths.appScript);
  assert.ok(validateRuntimeBootstrapScript(source, siteConfig));
  const { code } = await minify(source, { module: true });
  assert.ok(validateRuntimeBootstrapScript(code, siteConfig));
});

test("HTTP CSP permits configured images without inline or external code exceptions", async () => {
  const headers = await readFile(new URL("../../_headers", import.meta.url), "utf8");
  const policy = headers.match(/^\s*Content-Security-Policy:\s*(.+)$/m)?.[1];
  assert.ok(policy);
  const directives = new Map(policy.split(";").map((directive) => {
    const [name, ...sources] = directive.trim().split(/\s+/);
    return [name, sources];
  }));
  for (const name of ["default-src", "script-src", "style-src", "font-src", "base-uri", "form-action"]) {
    assert.deepEqual(directives.get(name), ["'self'"], name);
  }
  assert.deepEqual(directives.get("object-src"), ["'none'"]);
  assert.deepEqual(directives.get("frame-ancestors"), ["'self'"]);
  for (const name of ["connect-src", "frame-src"]) {
    assert.deepEqual(directives.get(name) ?? directives.get("default-src"), ["'self'"], name);
  }
  assert.ok(directives.has("upgrade-insecure-requests"));
  assert.deepEqual(directives.get("img-src"), ["'self'", "https://assets.hussamfaroug.com"]);
  for (const key of ["icon", "background"]) {
    const url = new URL(siteConfig.assetPaths[key], siteConfig.origin);
    assert.ok(url.origin === siteConfig.origin || directives.get("img-src").includes(url.origin), key);
  }
  assert.doesNotMatch(policy, /unsafe-inline|unsafe-eval|http:\/\//);
});
