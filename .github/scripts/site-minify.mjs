import CleanCSS from "clean-css";
import { minify as minifyHtml } from "html-minifier-terser";
import { minify as minifyJs } from "terser";

const htmlMinifyOptions = Object.freeze({
  collapseWhitespace: true,
  minifyCSS: true,
  minifyJS: true,
  removeComments: true,
  removeRedundantAttributes: true,
  useShortDoctype: true
});

const cssMinifier = new CleanCSS();

export async function minifySiteContents(extension, contents) {
  if (extension === ".html" || extension === ".htm") {
    return minifyHtml(contents, htmlMinifyOptions);
  }

  if (extension === ".js" || extension === ".mjs") {
    return (await minifyJs(contents)).code ?? "";
  }

  if (extension === ".css") {
    return cssMinifier.minify(contents).styles;
  }

  return contents;
}
