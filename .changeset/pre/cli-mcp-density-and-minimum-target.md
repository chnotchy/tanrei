---
'@tanrei/cli': minor
'@tanrei/mcp': minor
---

The CLI and the MCP server describe the dials and the targets as the token checks hold them. `tanrei init` prints the
dials (eight, read from the vocabulary, `dial.density` among them) and the three values that decide how big things are:
`dial.size.unit`, `dial.density` (a plain number above 0, 1 by default) and `sys.target.minimum` (36px, which no dial
scales; `sys.target.pointer` and `.touch` alias it and may be set higher, never lower). The MCP philosophy resource
says eight dials and names the minimum target, and `validate_layer`'s description says which target and density
findings are refused and which are warnings.

What broke: `tanrei validate` and `validate_layer` answered *valid* for a layer that `tanrei build` refuses — a
`dial.density` of 0 or below, or a `sys.target.pointer` or `.touch` under `sys.target.minimum` — and listed the finding
as a warning. Both now report it as a problem: `tanrei validate` exits 1 and `validate_layer` returns `valid: false`.
