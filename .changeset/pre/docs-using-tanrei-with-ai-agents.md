---
'@tanrei/docs': patch
---

Documentation site: a page on using Tanrei with AI agents, under Getting started, in the six languages
(`/getting-started/ai-agents/`). It shows what an agent can read in the packages (the web package's Custom Elements
Manifest, the tokens as custom properties, the `[tanrei]` warnings of a development build), how to connect
`@tanrei/mcp@next` in Claude Code, Cursor, VS Code and other MCP clients, and what each of the server's tools and
resources answers; it gives a rules section to copy into a product's `AGENTS.md` (components from Tanrei, values from
tokens, the default system only) with two lines for a product that has its own layer; and it lists what the default
system leaves out, rendered from the status file. A Node test holds the page to the server's own lists of tools and
resources, and to the custom properties, packages, exports and names the packages have, in every language. The
Getting started page links to it.
