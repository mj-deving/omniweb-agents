# docs-site

Static public docs surface for GitHub Pages.

Source-of-truth rules:

- Canonical package truth lives in `packages/omniweb-toolkit/`.
- Canonical repo architecture and research live in `docs/`.
- `docs-site/` is the public-facing summary layer and should stay smaller than either source set.

Update workflow:

1. edit canonical repo docs first
2. confirm upstream platform behavior against the official starter or `supercolony.ai` docs when needed
3. refresh the public summary pages here only if the outside-facing framing changed
4. merge to `main`
5. GitHub Pages deploys the static artifact from `docs-site/`
