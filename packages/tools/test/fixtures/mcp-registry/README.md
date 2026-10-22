# The MCP registry's server.json schema

`server.schema.json` is an unmodified copy of
<https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json> (SHA-256
`3fba09590c99f61735d234822279f4223fab9e300c0a81e81c91ab62a4114de0`), the latest released format of the file
`mcp-publisher publish` sends to the MCP registry. `packages/tools/test/npm-metadata.test.js` validates the generated
`packages/mcp/server.json` against it, so the test runs offline. It is never published.

When the registry releases a newer format (its changelog: `docs/reference/server-json/CHANGELOG.md` in
<https://github.com/modelcontextprotocol/registry>), replace this file with the new one and change
`MCP_SERVER_SCHEMA` in `packages/tools/src/npm-metadata.js` to its address; the test fails while the two disagree.

The schema is part of the Model Context Protocol registry, Copyright (c) 2024-2025 Model Context Protocol a Series of
LF Projects, LLC, licensed under the Apache License 2.0 (new contributions) and the MIT License (earlier ones); see
<https://github.com/modelcontextprotocol/registry/blob/main/LICENSE>.
