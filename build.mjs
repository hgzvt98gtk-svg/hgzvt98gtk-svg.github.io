import { copyFile, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import CleanCSS from "clean-css";
import { minify as minifyHtml } from "html-minifier-terser";
import { minify as minifyJs } from "terser";

const root = dirname(fileURLToPath(import.meta.url));
const output = join(root, "dist");
const excluded = new Set([".git", ".github", "dist", "node_modules", "build.mjs", "package-lock.json", "package.json"]);
const concurrency = 8;

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

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

async function buildFile(source) {
  const destination = join(output, relative(root, source));
  await mkdir(dirname(destination), { recursive: true });

  const extension = extname(source).toLowerCase();
  if (extension === ".html" || extension === ".htm") {
    const contents = await readFile(source, "utf8");
    const result = await minifyHtml(contents, {
      collapseWhitespace: true,
      minifyCSS: true,
      minifyJS: true,
      removeComments: true,
      removeRedundantAttributes: true,
      useShortDoctype: true
    });
    await writeFile(destination, result);
    return;
  }

  if (extension === ".css") {
    const contents = await readFile(source, "utf8");
    const result = new CleanCSS().minify(contents).styles;
    await writeFile(destination, result);
    return;
  }

  if (extension === ".js" || extension === ".mjs") {
    const contents = await readFile(source, "utf8");
    const minified = await minifyJs(contents);
    await writeFile(destination, minified.code ?? "");
    return;
  }

  await copyFile(source, destination);
}

const sources = await filesIn(root);
for (let index = 0; index < sources.length; index += concurrency) {
  await Promise.all(sources.slice(index, index + concurrency).map(buildFile));
}

console.log(`Built minified site in ${relative(root, output)}/`);
