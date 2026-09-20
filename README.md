# hussamfaroug.com

Static source for the `hussamfaroug.com` site.

## Security headers and GitHub Pages

GitHub Pages serves this repository as a static site, but it does not apply the `_headers` file in the repository. To keep a deployable baseline on GitHub Pages, `index.html` and `Privacy.html` include an in-document Content Security Policy and referrer policy.

The `_headers` file is still kept for hosts that honor it, such as Cloudflare Pages or Netlify, and `npm run build` copies it into `dist/`. The home page script lives in `/site.js` so the CSP can allow `script-src 'self'` without relying on a fixed nonce value.
