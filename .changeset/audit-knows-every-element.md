---
'@tanrei/cli': patch
'@tanrei/mcp': patch
---

`tanrei audit` and the MCP server's `check_usage` no longer say that Tanrei has no `<tanrei-snackbar-host>` or
`<tanrei-avatar-group>`. The component catalog knew a component's own element and the elements it draws among its
children, but not the other elements its module defines beside it: the snackbar's host, which queues and places
snackbars, and the avatar's group. Both are now the elements of their components, wherever code names them, and the
check holds every element the web package defines to be one the catalog knows.
