import { siteFilePaths } from "./site-paths.mjs";
import { escapeJsString } from "./escape-js-string.mjs";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderPageFiles(siteConfig, siteUrls) {
  const personName = escapeHtml(siteConfig.personName);
  const domain = escapeHtml(siteConfig.domain);
  const homeTitle = escapeHtml(siteConfig.pageTitles.home);
  const privacyTitle = escapeHtml(siteConfig.pageTitles.privacy);
  const homeDescription = escapeHtml(siteConfig.descriptions.home);
  const privacyDescription = escapeHtml(siteConfig.descriptions.privacy);
  const canonicalHome = escapeHtml(siteUrls.home);
  const canonicalPrivacy = escapeHtml(siteUrls.privacy);
  const socialPreviewUrl = escapeHtml(siteUrls.socialPreview);
  const iconPath = escapeHtml(siteConfig.assetPaths.icon);
  const stylesheetPath = escapeHtml(siteConfig.assetPaths.stylesheet);
  const appScriptImportPath = escapeJsString(siteConfig.assetPaths.appScript);
  const privacyLastUpdated = escapeHtml(siteConfig.privacyLastUpdated);
  const email = escapeHtml(siteConfig.email);
  const mailtoHref = escapeHtml(encodeURI(`mailto:${String(siteConfig.email)}`));

  return new Map([
    [siteFilePaths.index, `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="${escapeHtml(siteConfig.themeColor)}">
  <title>${homeTitle}</title>
  <meta name="description" content="${homeDescription}">
  <link rel="canonical" href="${canonicalHome}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${canonicalHome}">
  <meta property="og:title" content="${homeTitle}">
  <meta property="og:description" content="${homeDescription}">
  <meta property="og:site_name" content="${personName}">
  <meta property="og:image" content="${socialPreviewUrl}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${homeTitle}">
  <meta name="twitter:description" content="${homeDescription}">
  <meta name="twitter:image" content="${socialPreviewUrl}">
  <link rel="icon" href="${iconPath}" type="image/svg+xml">
  <link rel="stylesheet" href="${stylesheetPath}">
</head>
<body>
  <main class="landing" aria-label="${personName} personal website">
    <h1>${domain}</h1>
  </main>
  <script type="module">
    if ("modelContext" in navigator) {
      import(${appScriptImportPath});
    }
  </script>
</body>
</html>
`],
    [siteFilePaths.privacy, `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="${escapeHtml(siteConfig.themeColor)}">
  <title>${privacyTitle}</title>
  <meta name="description" content="${privacyDescription}">
  <link rel="canonical" href="${canonicalPrivacy}">
  <link rel="icon" href="${iconPath}" type="image/svg+xml">
  <link rel="stylesheet" href="${stylesheetPath}">
</head>
<body class="document">
  <main class="policy" aria-labelledby="privacy-title">
    <h1 id="privacy-title">Privacy Policy</h1>
    <p class="updated">Last updated: ${privacyLastUpdated}</p>
    <h2>Overview</h2>
    <p>This is a static personal website. It does not provide accounts, contact forms, analytics, advertising, or embedded third-party scripts.</p>
    <h2>Information collected</h2>
    <p>The site does not intentionally collect personal information or set cookies. Hosting and delivery providers may process technical request data, such as IP address, browser information, and request time, in server logs and security systems.</p>
    <h2>Email and external links</h2>
    <p>If you email <a href="${mailtoHref}">${email}</a>, your email provider will process your message. External websites have their own privacy policies.</p>
    <h2>Changes</h2>
    <p>This policy may be updated when the site or its providers change. The date above identifies the latest revision.</p>
  </main>
</body>
</html>
`]
  ]);
}
