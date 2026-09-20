# Hosting and Web Security Notes

## Deployment path in this repository

- This repository is named `hgzvt98gtk-svg.github.io` and includes a `CNAME` file (`hussamfaroug.com`), which is the standard GitHub Pages user-site pattern.
- The repository currently has a validation workflow but no deployment workflow in `.github/workflows/`.
- As a result, repository content is compatible with GitHub Pages publishing from the repository branch. If traffic is additionally proxied through a CDN (for example Cloudflare), CDN behavior is controlled outside this repository.

## What this repository enforces directly

- Static-site security behavior in source:
  - No hard-coded CSP nonce usage in HTML.
  - Browser code is loaded from `/site.js` as a same-origin module.
  - No mixed-content `http://` links in tracked HTML/CSS/TXT files.
- `_headers` is committed and can be applied by hosts that support it (such as Cloudflare Pages). GitHub Pages itself does **not** apply `_headers`.
- CI (`.github/workflows/validate.yml`) checks these invariants to prevent regressions.

## What must be configured outside the repository

GitHub Pages does not let this repository set response headers like HSTS, CSP, COOP/COEP, X-Frame-Options, Referrer-Policy, or Permissions-Policy directly. Configure these at the active edge/proxy/CDN layer (or another hosting platform that supports custom headers), including:

- `Strict-Transport-Security`
- `Content-Security-Policy`
- `X-Content-Type-Options`
- `X-Frame-Options` / `frame-ancestors`
- `Referrer-Policy`
- `Permissions-Policy`
- Cross-origin policies (`COOP`, `COEP`, `CORP`) as needed for site features

Also ensure GitHub Pages HTTPS enforcement remains enabled in repository Pages settings.

If CDN-managed challenge pages (for example Cloudflare Managed Challenge/Turnstile injection) are enabled, configure any required CSP/frame exceptions at that edge layer rather than relying on repository `_headers` when GitHub Pages is the origin host.
