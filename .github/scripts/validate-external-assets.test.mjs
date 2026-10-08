import assert from "node:assert/strict";
import test from "node:test";
import { requiredStaticAssetPathKeys } from "./site-paths.mjs";
import { siteConfig } from "./site.config.mjs";

let importIndex = 0;

async function runValidator(t, assets) {
  const originalPaths = siteConfig.assetPaths;
  siteConfig.assetPaths = Object.fromEntries(requiredStaticAssetPathKeys.map((key) => [
    key, assets[key] ? `https://assets.example/${key}` : `/local/${key}`
  ]));
  t.after(() => { siteConfig.assetPaths = originalPaths; });

  const messages = [];
  const responses = [];
  t.mock.method(console, "log", (message) => messages.push(message));
  t.mock.method(AbortSignal, "timeout", (timeoutMs) => {
    assert.equal(timeoutMs, 10000);
    return new AbortController().signal;
  });
  const fetchMock = t.mock.method(globalThis, "fetch", async (url, options) => {
    const key = new URL(url).pathname.slice(1);
    assert.equal(options.headers.Accept, key === "stylesheet" ? "text/css" : "image/*");
    assert.ok(options.signal instanceof AbortSignal);
    const asset = assets[key];
    if (asset.error) {
      throw asset.error;
    }
    const response = new Response(new Uint8Array([1]), {
      status: asset.status ?? 200,
      headers: asset.contentType ? { "content-type": asset.contentType } : {}
    });
    responses.push(response);
    return response;
  });

  let error;
  try {
    await import(new URL(`./validate-external-assets.mjs?test=${importIndex++}`, import.meta.url));
  } catch (caught) {
    error = caught;
  }
  assert.equal(fetchMock.mock.callCount(), Object.keys(assets).length);
  assert.ok(responses.every((response) => response.bodyUsed));
  return { error, messages };
}

test("accepts external CSS and all image asset keys with MIME parameters and casing", async (t) => {
  const assets = Object.fromEntries(requiredStaticAssetPathKeys.map((key) => [
    key, { contentType: key === "stylesheet" ? "Text/CSS; charset=utf-8" : "Image/SVG+XML; charset=utf-8" }
  ]));
  const { error, messages } = await runValidator(t, assets);
  assert.equal(error, undefined);
  for (const key of requiredStaticAssetPathKeys) {
    assert.ok(messages.includes(`Checked external asset ${key}: 200 https://assets.example/${key}`));
  }
});

for (const [key, contentType] of [
  ["stylesheet", "image/png"],
  ["stylesheet", "text/css-invalid"],
  ["stylesheet", null],
  ["icon", "text/css"],
  ["background", "text/html"],
  ["socialPreview", null],
  ["bimiLogo", "application/octet-stream"]
]) {
  test(`rejects ${key} with content type ${contentType}`, async (t) => {
    const { error } = await runValidator(t, { [key]: { contentType } });
    const expected = key === "stylesheet" ? "text/css" : "image/*";
    assert.equal(error?.message,
      `External asset smoke check failed:\n${key} (https://assets.example/${key}): expected ${expected} content type, received ${contentType ?? "none"}`);
  });
}

test("aggregates HTTP, network, and timeout failures while reporting successful assets", async (t) => {
  const { error, messages } = await runValidator(t, {
    stylesheet: { status: 404, contentType: "text/css" },
    icon: { error: new TypeError("fetch failed") },
    background: { contentType: "image/jpeg" },
    socialPreview: { status: 404, contentType: "image/svg+xml" },
    bimiLogo: { error: new DOMException("request timed out", "TimeoutError") }
  });
  assert.ok(error.message.startsWith("External asset smoke check failed:\n"));
  for (const [key, reason] of [
    ["stylesheet", "HTTP 404"],
    ["icon", "fetch failed"],
    ["socialPreview", "HTTP 404"],
    ["bimiLogo", "request timed out"]
  ]) {
    assert.ok(error.message.includes(`${key} (https://assets.example/${key}): ${reason}`));
  }
  assert.deepEqual(messages, ["Checked external asset background: 200 https://assets.example/background"]);
});

test("skips local assets without fetching", async (t) => {
  const { error, messages } = await runValidator(t, {});
  assert.equal(error, undefined);
  assert.deepEqual(messages, ["No externally hosted static assets to check."]);
});
