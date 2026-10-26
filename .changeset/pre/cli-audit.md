---
'@tanrei/cli': minor
'@tanrei/mcp': minor
'@tanrei/tokens-build': minor
---

**New — `tanrei audit` checks code against the system's components.**
`tanrei audit <file|dir|glob…> [--system <id|layer file>] [--format text|json]` reports what the code uses that the
system does not have, each at its file, line and column, with what to write instead:

- an element of a component the system does not have — in HTML, a lit template, JSX or a string, an imported React
  wrapper, or a CSS selector (a stylesheet, `<style>`, lit's css``) — with the components the system ships for the
  same job, the shipped systems that have it and the line of a product's layer that takes it in;
- an import from an entry that does not fit the system — another system's (`@tanrei/web/m3-like` in a product of the
  default system) or the entry of every component (`@tanrei/react/all`) — with the entry that does, and an import of a
  component's module or wrapper the system does not have;
- a static `variant="…"` the system leaves out, with the values it offers.

The system is `--system` (a shipped id or a layer file), else the product's (`tanrei.json`), else the default system.
A directory is read for script, markup and stylesheets, without `node_modules` and hidden directories; a quoted glob is
expanded by the CLI. Comments (`//`, `/* */`, `<!-- -->`) are skipped; it reads text, not a syntax tree, so a variant
held in a variable is not seen. It exits 0 when nothing is found, 1 when something is (for CI), 2 when it cannot run.

The MCP server's `check_usage` runs the same check, from one module both packages bundle.

The component catalog names the elements each component draws among its children (`web.items`).
