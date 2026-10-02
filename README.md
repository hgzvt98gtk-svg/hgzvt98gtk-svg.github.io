# hgzvt98gtk-svg.github.io

Static personal site with generated metadata files, build output in `dist/`, and CI validation for source and build artifacts.

## Architecture

- `.github/scripts/site.config.mjs` is the shared source of truth for site metadata and runtime URLs.
- `.github/scripts/build.config.mjs` holds build-specific settings for the dist pipeline.
- `.github/scripts/site-files.mjs` combines the page, runtime, and metadata renderers in `.github/scripts/site-page-files.mjs`, `.github/scripts/site-runtime-files.mjs`, and `.github/scripts/site-metadata-files.mjs`.
- `.github/scripts/site-validation.mjs` owns shared validation target and content-check definitions.
- `npm run generate` writes generated files to the repository root from shared templates.
- `npm run build` minifies HTML/CSS/JS and copies other assets into `dist/`.
- `npm run validate:site` validates required files, generated-file drift, and cross-reference/content checks for both root and `dist/`.
- `npm run validate:xml` validates XML/SVG syntax for shared target files across both root and `dist/`.
- `npm run validate:deps` validates static and string-literal dynamic imports between local script/runtime modules, fails on circular dependencies, and enforces low-level module boundaries.
- `npm run validate:external-assets` checks remotely hosted images separately from local validation; CI runs it weekly or on demand.

## Local workflow

Install Node dependencies, then run the full local validation pipeline with one command.

```bash
npm ci
npm run validate
```
