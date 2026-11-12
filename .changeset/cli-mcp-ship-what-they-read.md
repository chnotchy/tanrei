---
'@tanrei/mcp': patch
'@tanrei/cli': patch
---

The CLI and the MCP server carry only the vocabulary they read. Neither ships `tokens/vocabulary.lock.json` or
`tokens/AGENTS.md`, which no command and no tool opens. The server's copy of each spec leaves out each rule's `verify`
and each fixture's `twin`, plus `$schema`, `uses`, `fills`, `anatomyFixture`, `layer` and `category`. Its copy of
`component.schema.json` keeps only the four enums `list_components` filters on. Every tool answers as before: a new
test in each package runs a fixed session against the repository and against the packaged copy. The session covers
every tool and resource, and every component in every system and in a product layer. The test compares every answer
and every file a build writes, byte for byte. A trace of every path the run touches shows that the copy holds all of
them.

`@tanrei/mcp` is 0.94 MB smaller unpacked (9.04 → 8.10 MB, 1.94 → 1.78 MB packed). `@tanrei/cli` is 0.53 MB smaller
(3.20 → 2.67 MB unpacked, 0.50 → 0.46 MB packed, without the Theme Studio app, which is unchanged).

What broke: `dist/vocabulary/specs/*.spec.json` in `@tanrei/mcp` is no longer the whole spec, and
`dist/vocabulary/specs/component.schema.json` can no longer be used to validate a spec. Read the specs from the
repository instead.
