import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parse } from "acorn";
import { minify } from "terser";
import { renderSiteFiles } from "./site-files.mjs";
import { requiredAssetPathKeys, siteFilePaths } from "./site-paths.mjs";
import { siteConfig } from "./site.config.mjs";
import { siteUrls } from "./site-urls.mjs";
import { validateSiteConfig } from "./validate-config.mjs";
import { includesAttribute, validateRuntimeBootstrapScript } from "./validate-site-helpers.mjs";

const files = renderSiteFiles(siteConfig, siteUrls);

function configWithAsset(key, value) {
  const config = {
    ...siteConfig,
    assetPaths: { ...siteConfig.assetPaths, [key]: value }
  };
  const urls = {
    home: `${config.origin}/`,
    privacy: new URL(config.assetPaths.privacyPage, config.origin).href,
    socialPreview: new URL(config.assetPaths.socialPreview, config.origin).href,
    sitemap: new URL(config.assetPaths.sitemap, config.origin).href
  };
  return [config, urls];
}

test("asset configuration rejects unapproved origins before generating browser resources", () => {
  for (const key of requiredAssetPathKeys) {
    for (const value of [
      "https://example.test/asset",
      "https://assets.hussamfaroug.com.example.test/asset",
      "https://assets.hussamfaroug.com:8443/asset",
      "http://assets.hussamfaroug.com/asset",
      "//assets.hussamfaroug.com/asset",
      "https://user@assets.hussamfaroug.com/asset"
    ]) {
      assert.throws(() => validateSiteConfig(...configWithAsset(key, value)), undefined, `${key}: ${value}`);
    }
    assert.doesNotThrow(() => validateSiteConfig(...configWithAsset(key, "/asset")));
  }
});

test("only images may use approved HTTPS asset URLs; code and API paths remain local", () => {
  assert.doesNotThrow(() => validateSiteConfig(siteConfig, siteUrls));
  const imageKeys = new Set(["icon", "background", "socialPreview", "bimiLogo"]);
  for (const key of requiredAssetPathKeys) {
    for (const origin of [siteConfig.origin, "https://assets.hussamfaroug.com"]) {
      const validate = () => validateSiteConfig(...configWithAsset(key, `${origin}/asset`));
      if (imageKeys.has(key)) {
        assert.doesNotThrow(validate, key);
      } else {
        assert.throws(validate, /must be a same-origin absolute path/, key);
      }
    }
  }
});

test("generated pages contain no inline scripts, handlers, styles, or legacy CSP elements", () => {
  for (const [path, html] of files) {
    if (!path.endsWith(".html")) continue;
    assert.doesNotMatch(html, /\s(?:on[a-z]+|style)\s*=/i, path);
    assert.doesNotMatch(html, /<(?:style|object|embed|applet|base)\b/i, path);
    assert.doesNotMatch(html, /http-equiv\s*=\s*["']Content-Security-Policy["']/i, path);
    for (const [, attributes, contents] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\b[^>]*>/gi)) {
      assert.ok(includesAttribute(attributes, "src", `/${siteFilePaths.bootstrapScript}`), path);
      assert.equal(contents.trim(), "", path);
    }
  }
  assert.ok(includesAttribute(files.get(siteFilePaths.index), "src", `/${siteFilePaths.bootstrapScript}`));
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
  assert.deepEqual(directives.get("img-src"), ["'self'", "https://assets.hussamfaroug.com"]);
  for (const key of ["icon", "background"]) {
    const url = new URL(siteConfig.assetPaths[key], siteConfig.origin);
    assert.ok(url.origin === siteConfig.origin || directives.get("img-src").includes(url.origin), key);
  }
  assert.doesNotMatch(policy, /unsafe-inline|unsafe-eval|http:\/\//);
});
