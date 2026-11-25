---
'@tanrei/docs': patch
---

Docs: a measure figure finds a component's box again where the component draws it as no element (hidden, drawn by its
`::before`, so that a contrast checker still checks the text under it). The Tabs' container is drawn so since its label
is checked for contrast, and its figure had lost the container's height and inline padding: the table said the
component draws no such box.
