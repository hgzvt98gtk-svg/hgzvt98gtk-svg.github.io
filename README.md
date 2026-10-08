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

### Deployment verification

- Apply the policy in `_headers` as an HTTP response header at the serving proxy/CDN for both `/` and `/Privacy.html`; copying the file to GitHub Pages alone does not enforce it. Do not replace it with a CSP meta tag, which cannot enforce `frame-ancestors`.
- Inspect the final HTTPS responses for both pages and confirm the enforced `Content-Security-Policy` matches `_headers`. Check for additional policies or edge-injected scripts/frames before adding any exceptions.
- In a browser, check both pages for CSP/COEP violations and confirm the favicon, background, stylesheet, and bootstrap load. In a browser supporting `navigator.modelContext`, invoke the agent-card and API-catalog tools and verify their same-origin JSON requests succeed without redirects.
- Check the CDN image responses for compatible CORP headers or a CORS-enabled loading arrangement. The external-asset smoke check verifies status and content type only; it does not prove CSP/COEP compatibility.

The current policy retains CDN images, same-origin connections/frames, same-origin base/form URLs, and same-origin embedding. Tightening these permissions requires product/deployment confirmation. SVG presentation attributes and XML `http://` namespace identifiers are not inline styles or insecure asset requests.

## Local workflow

Install Node dependencies, generate/build the site, then run validation and tests.

```bash
npm ci
npm run validate
npm test
```

`npm test` includes CSP checks against generated templates, checked-in pages, and actual `dist/` artifacts, so run `npm run build` before testing if you have not run `npm run validate`. These checks do not verify deployed HTTP headers.
