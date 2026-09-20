# hgzvt98gtk-svg.github.io

This repository currently has one GitHub Actions workflow, `.github/workflows/validate.yml`, which validates the static source files and build output. It does **not** contain a GitHub Pages deployment workflow, so Pages publishing must remain configured in the repository settings rather than through Actions.

## Build output

- `npm run build` runs `build.mjs` and writes the deployable artifact to `dist/`.
- The build keeps the `CNAME` file and `.well-known/` files in `dist/`.
- Binary assets such as `Background.jpeg` are copied byte-for-byte so the generated artifact stays safe to deploy.

## `_headers` scope

The root `_headers` file is retained only as a compatibility file for hosts that support Netlify/Cloudflare Pages-style `_headers` processing. GitHub Pages does **not** apply `_headers`, so repository changes alone cannot configure live response headers for `https://hussamfaroug.com/`.

## Manual GitHub and Cloudflare follow-up after merge

1. Keep the GitHub Pages custom domain set to `hussamfaroug.com` and leave **Enforce HTTPS** enabled in the repository Pages settings.
2. Configure any required response headers in Cloudflare with **Transform Rules** or a **Worker**; do not rely on the repository `_headers` file for GitHub Pages.
3. Review the Cloudflare WAF/challenge configuration that is returning `cf-mitigated: challenge` and HTTP 403 to `curl`, then relax or scope that challenge as needed.
4. Purge the Cloudflare cache after header or WAF changes.
5. Verify the live site again with both browser developer tools and terminal commands such as `curl -I https://hussamfaroug.com/`.
