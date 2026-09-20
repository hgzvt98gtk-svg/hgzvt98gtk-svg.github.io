import { copyFile, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import CleanCSS from "clean-css";
import { minify as minifyHtml } from "html-minifier-terser";
import { minify as minifyJs } from "terser";

const root = dirname(fileURLToPath(import.meta.url));
const output = join(root, "dist");
const excluded = new Set([
  ".git",
  ".github",
  "build.mjs",
  "dist",
  "node_modules",
  "package-lock.json",
  "package.json",
  "site.config.json",
  "validate.mjs"
]);
const textExtensions = new Set([".css", ".htm", ".html", ".js", ".json", ".mjs", ".svg", ".txt", ".xml"]);
const site = JSON.parse(await readFile(join(root, "site.config.json"), "utf8"));

function pageByPath(pathname) {
  return site.pages.find((page) => page.path === pathname);
}

function renderHead({ title, description, canonical, social = false }) {
  const lines = [
    "<head>",
    '  <meta charset="utf-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1">',
    `  <meta name="theme-color" content="${site.themeColor}">`,
    `  <title>${title}</title>`,
    `  <meta name="description" content="${description}">`,
    `  <link rel="canonical" href="${canonical}">`
  ];

  if (social) {
    lines.push(
      '  <meta property="og:type" content="website">',
      `  <meta property="og:url" content="${site.url}">`,
      `  <meta property="og:title" content="${title}">`,
      `  <meta property="og:description" content="${description}">`,
      `  <meta property="og:site_name" content="${site.owner}">`,
      `  <meta property="og:image" content="${site.socialImage}">`,
      '  <meta name="twitter:card" content="summary_large_image">',
      `  <meta name="twitter:title" content="${title}">`,
      `  <meta name="twitter:description" content="${description}">`,
      `  <meta name="twitter:image" content="${site.socialImage}">`
    );
  }

  lines.push('  <link rel="icon" href="/HF.svg" type="image/svg+xml">');
  lines.push('  <link rel="stylesheet" href="/style.css">');
  lines.push("</head>");
  return lines.join("\n");
}

function renderIndex() {
  const page = pageByPath("/");
  return [
    "<!doctype html>",
    '<html lang="en">',
    renderHead(page),
    "<body>",
    `  <main class="landing" aria-label="${site.owner} personal website">`,
    `    <h1>${site.domain}</h1>`,
    "  </main>",
    '  <script type="module" src="/site.js"></script>',
    "</body>",
    "</html>",
    ""
  ].join("\n");
}

function renderPrivacy() {
  const page = pageByPath("/Privacy.html");
  const sections = site.privacy.sections
    .map((section) => `    <h2>${section.heading}</h2>\n    <p>${section.body}</p>`)
    .join("\n");

  return [
    "<!doctype html>",
    '<html lang="en">',
    renderHead(page),
    '<body class="document">',
    '  <main class="policy" aria-labelledby="privacy-title">',
    '    <h1 id="privacy-title">Privacy Policy</h1>',
    `    <p class="updated">Last updated: ${site.privacy.updatedLabel}</p>`,
    sections,
    "  </main>",
    "</body>",
    "</html>",
    ""
  ].join("\n");
}

function renderSitemap() {
  const urls = site.pages
    .map((page) => [
      "  <url>",
      `    <loc>${page.canonical}</loc>`,
      `    <lastmod>${page.lastmod}</lastmod>`,
      "  </url>"
    ].join("\n"))
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    "</urlset>",
    ""
  ].join("\n");
}

function renderLlms() {
  const pages = site.pages
    .map((page) => `- [${page.label}](${page.canonical}): ${page.listDescription}`)
    .join("\n");

  return [
    `# ${site.owner}`,
    "",
    `> ${site.llms.summary}`,
    "",
    "## About",
    `- ${site.llms.about}`,
    "",
    "## Pages",
    pages,
    "",
    "## Contact",
    `- Email: ${site.email}`,
    ""
  ].join("\n");
}

async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (excluded.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesIn(path));
    else files.push(path);
  }

  return files;
}

async function writeGeneratedSource(pathname, contents) {
  await writeFile(join(root, pathname), contents);
}

async function writeGeneratedSources() {
  await writeGeneratedSource("index.html", renderIndex());
  await writeGeneratedSource("Privacy.html", renderPrivacy());
  await writeGeneratedSource("sitemap.xml", renderSitemap());
  await writeGeneratedSource("llms.txt", renderLlms());
}

await writeGeneratedSources();
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const source of await filesIn(root)) {
  const destination = join(output, relative(root, source));
  await mkdir(dirname(destination), { recursive: true });

  const extension = extname(source).toLowerCase();
  if (!textExtensions.has(extension)) {
    await copyFile(source, destination);
    continue;
  }

  const contents = await readFile(source, "utf8");
  let result = contents;

  if (extension === ".html" || extension === ".htm") {
    result = await minifyHtml(contents, {
      collapseWhitespace: true,
      minifyCSS: true,
      minifyJS: true,
      removeComments: true,
      removeRedundantAttributes: true,
      useShortDoctype: true
    });
  } else if (extension === ".css") {
    result = new CleanCSS().minify(contents).styles;
  } else if (extension === ".js" || extension === ".mjs") {
    const minified = await minifyJs(contents);
    result = minified.code ?? "";
  }

  await writeFile(destination, result);
}

console.log(`Built minified site in ${relative(root, output)}/`);
