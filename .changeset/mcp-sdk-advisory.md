---
'@tanrei/mcp': patch
---

`@tanrei/mcp` depends on `@modelcontextprotocol/sdk` `^1.32.1` (was `^1.30.0`). Versions from 1.12.0 up to 1.30.x are
affected by GHSA-6qxp-vccf-f47h: the SDK's OAuth client could send stored credentials to an authorization server the
MCP server chose. The Tanrei server talks over stdio and uses no OAuth, but a product that installs it resolves the SDK
for its whole tree, so the range no longer admits an affected version.
