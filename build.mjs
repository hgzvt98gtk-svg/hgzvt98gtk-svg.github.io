import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import CleanCSS from "clean-css";
import { minify as minifyHtml } from "html-minifier-terser";
import { minify as minifyJs } from "terser";

const root = dirname(fileURLToPath(import.meta.url));
const output = join(root, "dist");
const excluded = new Set([".git", ".github", "dist", "node_modules"]);

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

for (const source of await filesIn(root)) {
  const destination = join(output, relative(root, source));
  await mkdir(dirname(destination), { recursive: true });

  const extension = extname(source).toLowerCase();
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
