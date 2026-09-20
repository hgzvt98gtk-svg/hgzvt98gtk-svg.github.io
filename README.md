# hgzvt98gtk-svg.github.io

This repository backs a GitHub Pages personal site for `hussamfaroug.com`.

`_headers` is kept here as the canonical response-header policy for edge platforms that support Netlify-style header files, but GitHub Pages itself does **not** apply those headers. Production deployments on GitHub Pages therefore need equivalent response-header rules configured at the CDN or reverse-proxy layer (for example, Cloudflare response header rules) if the site is expected to emit this CSP and the related security headers.

The CSP intentionally allows `https://challenges.cloudflare.com` scripts, frames, and connections for Cloudflare Turnstile or challenge flows, and avoids hard-coded nonces because the site is static and does not generate per-request nonce values.
