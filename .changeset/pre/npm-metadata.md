---
'@tanrei/web': patch
'@tanrei/cli': patch
'@tanrei/mcp': patch
'@tanrei/token-engine': patch
---

The packages say on npm where their documentation is (`homepage`, the package's page on the docs site), where to
report a bug (`bugs`, the repository's issues) and what they are (`keywords`). `@tanrei/mcp` carries `mcpName`, its
name in the MCP registry. `pnpm generate` writes them from `tanrei.config.json` (its new `site`) and
`docs/registries/npm-keywords.json`.
