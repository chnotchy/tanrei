---
'@tanrei/mcp': patch
---

`@tanrei/mcp` has a listing for the MCP registry: `packages/mcp/server.json`, which `mcp-publisher publish` sends. It
names the server `io.github.chnotchy/tanrei` (the package's `mcpName`), says what it does in the registry's 100
characters, and lists the npm package at its exact version, run over stdio. `pnpm generate` writes it from
`tanrei.config.json`, the package's `package.json` and `docs/registries/npm-keywords.json`, whose `mcpServer` entry is
now an object with the listing's `title` and `description`; `pnpm version-packages` rewrites it with each new version.
Nothing is listed yet: the registry refuses a version with an `x` in it, so no `-next` prerelease can be listed.
