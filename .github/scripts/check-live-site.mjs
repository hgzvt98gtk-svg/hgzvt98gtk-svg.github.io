const timeoutMs = 15000;
export const liveOrigin = "https://hussamfaroug.com";

// Set by the zone Transform Rule "Security Headers v2", so every response should carry them.
export const requiredSecurityHeaders = [
  "strict-transport-security",
  "content-security-policy",
  "x-content-type-options",
  "x-frame-options",
  "referrer-policy",
  "permissions-policy"
];

export const liveChecks = [
  { path: "/", contentType: "text/html" },
  { path: "/Privacy.html", contentType: "text/html" },
  { path: "/.well-known/health", contentType: "application/json", body: (text) => JSON.parse(text).status === "ok" },
  { path: "/.well-known/bimi/logo.svg", contentType: "image/svg+xml" },
  { path: "/.well-known/mta-sts.txt", contentType: "text/plain", body: (text) => /^version: STSv1$/m.test(text) && /^mode: enforce$/m.test(text) }
];

export async function checkUrl({ path, contentType, body }, origin = liveOrigin) {
  const url = origin + path;
  // Redirects count as failures: each URL should answer 200 directly.
  const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(timeoutMs) });
  const problems = [];

  if (response.status !== 200) {
    problems.push(`HTTP ${response.status}`);
  }

  const receivedType = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (receivedType !== contentType) {
    problems.push(`expected ${contentType} content type, received ${receivedType ?? "none"}`);
  }

  const missing = requiredSecurityHeaders.filter((name) => !response.headers.get(name));
  if (missing.length > 0) {
    problems.push(`missing security headers: ${missing.join(", ")}`);
  }

  const text = await response.text();
  if (body && response.status === 200) {
    let valid = false;
    try {
      valid = body(text);
    } catch {}
    if (!valid) {
      problems.push("unexpected response body");
    }
  }

  return { url, status: response.status, problems };
}

export async function checkLiveSite(checks = liveChecks, origin = liveOrigin) {
  const results = await Promise.allSettled(checks.map((check) => checkUrl(check, origin)));
  const failures = [];

  results.forEach((result, index) => {
    const url = origin + checks[index].path;
    if (result.status === "rejected") {
      failures.push(`${url}: ${result.reason.message}`);
    } else if (result.value.problems.length > 0) {
      failures.push(`${url}: ${result.value.problems.join("; ")}`);
    } else {
      console.log(`Checked ${url}: ${result.value.status}`);
    }
  });

  if (failures.length > 0) {
    throw new Error(`Live site health check failed:\n${failures.join("\n")}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await checkLiveSite();
}
