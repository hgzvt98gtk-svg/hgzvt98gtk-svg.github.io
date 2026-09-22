# hgzvt98gtk-svg.github.io

Static personal site with generated metadata files, build output in `dist/`, and CI validation for source and build artifacts.

## Architecture

- `.github/scripts/site.config.mjs` is the shared source of truth for site metadata, runtime URLs, and build configuration.
- `.github/scripts/site-files.mjs` owns generated file templates and shared validation target/check lists.
- `npm run generate` writes generated files to the repository root from shared templates.
- `npm run build` minifies HTML/CSS/JS and copies other assets into `dist/`.
- `npm run validate:site` validates required files, generated-file drift, and cross-reference/content checks for both root and `dist/`.
- `npm run validate:xml` validates XML/SVG syntax for shared target files across both root and `dist/`.

## Local workflow

```bash
npm ci
npm run generate
npm run build
npm run validate:site
npm run validate:xml
```
