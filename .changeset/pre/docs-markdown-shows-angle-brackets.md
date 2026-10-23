---
'@tanrei/docs': patch
---

Documentation site: a component's page as Markdown (`/components/<name>.md`) and `/llms-full.txt` escape a `<` that a
spec's text writes outside a code span, so a placeholder such as `comp.tag.<variant>.disabled.container.color`, or an
element named in prose such as `<dialog>`, is read as text and not swallowed as an HTML tag.
