# hgzvt98gtk-svg.github.io

Static personal site with generated metadata files, build output in `dist/`, and CI validation for source and build artifacts.

## Architecture

- `.github/scripts/site.config.mjs` is the shared source of truth for site metadata and runtime URLs.
- `.github/scripts/build.config.mjs` holds build-specific settings for the dist pipeline.
- `.github/scripts/site-files.mjs` combines the page, runtime, and metadata renderers in `.github/scripts/site-page-files.mjs`, `.github/scripts/site-runtime-files.mjs`, and `.github/scripts/site-metadata-files.mjs`.
- `Background.jpeg` and `HF.svg` are retained as source copies for the corresponding CDN-hosted assets configured in `.github/scripts/site.config.mjs`. The social preview image is served from the site at `/social-preview.svg`.
- `.github/scripts/site-validation.mjs` owns shared validation target and content-check definitions.
- `npm run generate` writes generated files to the repository root from shared templates.
- `npm run build` minifies HTML/CSS/JS and copies other assets into `dist/`.
- `npm run validate:site` validates required files, generated-file drift, and cross-reference/content checks for both root and `dist/`.
- `npm run validate:xml` validates XML/SVG syntax for shared target files across both root and `dist/`.
- `npm run validate:deps` validates static and string-literal dynamic imports between local script/runtime modules, fails on circular dependencies, and enforces low-level module boundaries.
- `npm run validate:external-assets` checks remotely hosted images separately from local validation; CI runs it weekly or on demand.

## Content Security Policy

The home page loads a same-origin external module (`/bootstrap.js`) which imports `/app.js` only when `navigator.modelContext` is available. Stylesheets and fonts are same-origin; images use the site origin or `https://assets.hussamfaroug.com`. Runtime API requests are restricted to same-origin URLs and reject redirects. No external API allowances are needed.

`_headers` defines the HTTP CSP without inline-script/style exceptions. Its `default-src 'self'` also restricts connections and frames to the site origin. The unused Cloudflare script/frame/connect sources are not enabled. GitHub Pages does not apply `_headers`; configure these response headers at the serving proxy/CDN and verify the deployed responses. With `Cross-Origin-Embedder-Policy: require-corp`, the approved image host must also provide compatible CORS or Cross-Origin-Resource-Policy headers.

## Local workflow

Install Node dependencies, then run the full local validation pipeline with one command.

```bash
npm ci
npm run validate
```
