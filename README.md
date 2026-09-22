# hgzvt98gtk-svg.github.io

Static personal site with generated metadata files, build output in `dist/`, and CI validation for source and build artifacts.

## Architecture

- `.github/scripts/site.config.mjs` is the shared source of truth for site metadata and runtime URLs.
- `.github/scripts/build.config.mjs` holds build-specific settings for the dist pipeline.
- `.github/scripts/site-files.mjs` owns generated file templates.
- `.github/scripts/site-validation.mjs` owns shared validation target and content-check definitions.
- `npm run generate` writes generated files to the repository root from shared templates.
- `npm run build` minifies HTML/CSS/JS and copies other assets into `dist/`.
- `npm run validate:site` validates required files, generated-file drift, and cross-reference/content checks for both root and `dist/`.
- `npm run validate:xml` validates XML/SVG syntax for shared target files across both root and `dist/`.
- `npm run validate:deps` validates local script/runtime module imports, fails on circular dependencies, and enforces low-level module boundaries.

## Local workflow

Install `xmllint` before running XML/SVG validation (`libxml2-utils` on Ubuntu/Debian).

```bash
npm ci
npm run generate
npm run build
npm run validate:site
npm run validate:xml
npm run validate:deps
```
