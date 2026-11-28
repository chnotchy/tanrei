---
'@tanrei/web': minor
---

Button: a link button ignores `destructive`. **Breaking** for anyone building from the main branch: a
`<tanrei-button href="…" destructive>` that was drawn in the error color is now drawn as the link of its variant
without it, at rest and in every state, and on a tone a host gives it as any link is. A debug build reports the pair
once per button.

A link only leads somewhere; following it deletes nothing. The action that deletes is the one at its destination, the
Delete button on the page the link opens, and that is the one to mark `destructive`. A link to that page is an ordinary
link whose label says where it goes. An address the Button refuses (a `javascript:` URL) makes no link, so such a
Button still takes `destructive`. An icon-only button and a dialog's action keep taking it as before.

No baseline changes: no fixture draws a destructive link.
