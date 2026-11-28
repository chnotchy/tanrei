---
'@tanrei/docs': patch
---

Docs site: in a page's Markdown version, a link to another page of the site that has one now leads to that page's
Markdown (`/foundations/color.md#scheme`, not `/foundations/color/#scheme`); a link to anything else is unchanged.
`/llms.txt` and each system's `/systems/<id>/llms.txt` now follow the sidebar: its groups are the sections, in its
order (Getting started, Foundations, Token reference, the components, Project), each group's pages in the sidebar's
order, and the components in the sidebar's order of components; every page is linked as its Markdown, and the status
page moves from "Optional" into "Project". Each page names `/llms.txt` with the relation llms.txt proposes,
`rel="describedby"`: an HTML page in its head, a Markdown version in a `Link` header. The page on AI agents, in all six
languages, says what the site serves for programs (the indexes, every page as Markdown, `/llms-full.txt`) and no longer
says that the MCP server does not answer about components.
