import assert from "node:assert/strict";
import test from "node:test";
import { checkLiveSite, liveChecks, requiredSecurityHeaders } from "./check-live-site.mjs";

const origin = "https://site.example";
const securityHeaders = Object.fromEntries(requiredSecurityHeaders.map((name) => [name, "set"]));
const healthyResponses = {
  "/": { contentType: "text/html; charset=utf-8", body: "<!doctype html>" },
  "/Privacy.html": { contentType: "text/html", body: "<!doctype html>" },
  "/.well-known/health": { contentType: "application/json", body: '{"status":"ok"}' },
  "/.well-known/bimi/logo.svg": { contentType: "image/svg+xml", body: "<svg/>" },
  "/.well-known/mta-sts.txt": { contentType: "text/plain", body: "version: STSv1\nmode: enforce\n" }
};

function mockFetch(t, overrides = {}) {
  t.mock.method(console, "log", () => {});
  return t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(options.redirect, "manual");
    assert.ok(options.signal instanceof AbortSignal);
    const path = new URL(url).pathname;
    const spec = { ...healthyResponses[path], ...overrides[path] };
    if (spec.error) {
      throw spec.error;
    }
    const headers = { ...securityHeaders, "content-type": spec.contentType, ...spec.headers };
    for (const name of spec.dropHeaders ?? []) {
      delete headers[name];
    }
    return new Response(spec.body, { status: spec.status ?? 200, headers });
  });
}

test("passes when every URL is 200 with the expected type, body and security headers", async (t) => {
  const fetchMock = mockFetch(t);
  await checkLiveSite(liveChecks, origin);
  assert.equal(fetchMock.mock.callCount(), liveChecks.length);
});

test("reports status, redirect, header, type, body and network failures together", async (t) => {
  mockFetch(t, {
    "/": { dropHeaders: ["content-security-policy", "strict-transport-security"] },
    "/Privacy.html": { status: 301, body: null },
    "/.well-known/health": { body: '{"status":"down"}' },
    "/.well-known/bimi/logo.svg": { contentType: "text/html" },
    "/.well-known/mta-sts.txt": { error: new TypeError("fetch failed") }
  });
  await assert.rejects(checkLiveSite(liveChecks, origin), {
    message: [
      "Live site health check failed:",
      `${origin}/: missing security headers: strict-transport-security, content-security-policy`,
      `${origin}/Privacy.html: HTTP 301`,
      `${origin}/.well-known/health: unexpected response body`,
      `${origin}/.well-known/bimi/logo.svg: expected image/svg+xml content type, received text/html`,
      `${origin}/.well-known/mta-sts.txt: fetch failed`
    ].join("\n")
  });
});
