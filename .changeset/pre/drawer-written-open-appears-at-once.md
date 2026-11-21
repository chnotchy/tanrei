---
'@tanrei/web': patch
---

Navigation drawer and search: written open in the page's markup, a modal drawer and the search's dialog and
full-screen views appear at once, with no motion (MOT-4), as the other modal surfaces do. The modal drawer slid in and
its scrim faded in over the first frames, and the search's view and its scrim faded in, in every engine. The drawer is
now drawn at once when it opens before the document's first paint; the search opens its view with `openModal()`, whose
entrance, opened later, begins in the first frame drawn after the opening task as the other modal surfaces' does.
