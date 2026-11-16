---
'@tanrei/web': patch
---

Navigation drawer: the platform's back (Android's back gesture or button) closes a drawer that an app shell with a
header holds open over the content again. The held drawer is a `<nav>`, not a `<dialog>`, so back had nothing to arrive
by and left it open. The drawer now makes a `CloseWatcher` while it is open over the content and destroys it as it
closes. Back closes it once, as the scrim does: `close` fires, the frame fires one `navigationopenchange` with false,
nothing stays inert, and focus goes back to the menu button. A dialog or a popover opened above the drawer hears back
first. An Escape typed in a field of the header still leaves the drawer open, as before. Where the browser has no
`CloseWatcher` nothing changes.
