# WN Docs

`woonyong-kr.github.io` is the public-site source repository for WN Docs.

- The `just-the-docs` gem owns the standard layout, navigation, search, and
  typography. WN Docs only adds the existing green light/dark schemes.
- `vendor/runnable-code-blocks` pins the Obsidian plugin source used to build
  the static web adapter. Update the submodule deliberately, run its tests,
  rebuild this site, and review the resulting change before deployment.
- `generated/public-content` is compiler output from the private Obsidian Vault.
  It is build input only; do not hand-edit its projected documents here.

## Local verification

```bash
git submodule update --init --recursive
npm --prefix vendor/runnable-code-blocks ci
npm run build
npm run check:links
```

The initial build intentionally publishes the official Just the Docs demo
documents, plus `docs/ui-components/runnable-code-blocks.md`, so the theme can
be compared before Vault content replaces the demo set.
