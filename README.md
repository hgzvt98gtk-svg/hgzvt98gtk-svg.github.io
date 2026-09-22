# hgzvt98gtk-svg.github.io

## Architecture and ownership

### Source of truth
- Primary site metadata and build patterns live in `/home/runner/work/hgzvt98gtk-svg.github.io/hgzvt98gtk-svg.github.io/.github/scripts/site.config.mjs`.
- Generated content templates live in `/home/runner/work/hgzvt98gtk-svg.github.io/hgzvt98gtk-svg.github.io/.github/scripts/site-files.mjs`.

When changing URLs, titles, asset paths, status values, or build include/exclude behavior, update `site.config.mjs` first.

### Build and validation flow
1. **Generate** (`npm run generate`)  
   Rewrites generated runtime/site files from shared config + templates.
2. **Build** (`npm run build`)  
   Produces minified/copy output in `dist/`.
3. **Validate** (`npm run validate:site` and `npm run validate:xml`)  
   Validates both source and `dist`, including cross-references and XML/SVG syntax.

### Ownership boundaries
- `site.config.mjs`: canonical configuration and ownership of metadata/build patterns.
- `site-files.mjs`: ownership of generated file definitions and shared validation targets/checks.
- `build.mjs`: build execution only (consumes shared config; does not own hardcoded layout rules).
- `.github/workflows/validate.yml`: CI orchestration only (calls scripts; avoids duplicating target lists).
