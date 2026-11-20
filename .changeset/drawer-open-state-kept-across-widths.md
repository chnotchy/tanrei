---
'@tanrei/web': minor
---

A responsive navigation drawer keeps `open` across every change of the window's width (NVD-54, NVD-55), and an app
shell keeps `navigationOpen` across every change of the window's class (APS-7). A drawer opened over the content in a
narrow window and then widened stands beside the content — its scrim gone at once, nothing inert, focus where it was —
and is over the content again, open, when the window narrows again: its scrim drawn at once without a fade, what lies
behind it inert, and focus that was in what became inert moved to the menu button that controls the drawer (or else to
its selected or first destination). Closing it beside the content (the product setting `open` to false) leaves it closed
when the window narrows. **Breaking**: the drawer no longer sets `open` to false nor fires `close` when the window
becomes wide enough for it to stand beside the content, and the app shell no longer sets `navigationOpen` to false nor
fires `navigationopenchange` then. A product that read either as "the navigation is put away" reads `presentation` (or
`windowClass`) instead.
