---
'@tanrei/docs': minor
---

Documentation site: every page that has a Markdown version now has actions at its head. They are Tanrei's Button with
menu, in the page header's actions part: beside the title in a wide head, under its text in a narrow one. The main
action copies the page as Markdown. The menu has View as Markdown, Open in ChatGPT and Open in Claude, which start a
chat that reads the page's Markdown. Below them, under "MCP server", are Add to Cursor and Add to VS Code, the editors'
links that install the MCP server, and an item that copies the Claude Code command. Each copy, and a copy that fails,
is announced in a snackbar. The words are in the site's six languages. Where no script runs, a link to the page's
Markdown takes the actions' place. The MCP server is the one the page on AI agents configures. Its name and package
come from `tanrei.config.json`.
