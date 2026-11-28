---
'@tanrei/web': patch
---

Fewer forced style and layout passes when many components are built at once. A component that read a choice of kind
(a Button variant, an axis, an arrangement) from the cascade in its own update had the browser style the page for it
there, once for each instance: a hundred calendars built in one task styled the page a hundred times. The calendar's
axis, the carousel's, the chat composer's and the snackbar's Button variants, an open image preview's control variants
and the one-time code input's row marks are now read after the renders of the task, together with every other
component's, and written after all of them — once for all of them, before any frame, and read again at every update
(never kept). A side sheet, a popover, a dialog, an image preview and tabs read several choices with one computed
style, and a closed popover reads none. A hundred calendars, or a hundred one-time code fields, now cost the passes ten
do. Nothing drawn changes.
