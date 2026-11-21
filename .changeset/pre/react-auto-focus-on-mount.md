---
'@tanrei/react': patch
---

`autoFocus` on a wrapper now focuses the control when it mounts, as it does on a native `<input>`. React gives a
custom element's `autoFocus` to the browser as the `autofocus` attribute, and the browser answers it only while
nothing on the page has focus: a field revealed by a press on a button (`{editing && <TextField autoFocus />}`)
stayed unfocused, because the button had focus. The wrapper now calls the element's `focus()` as React does for a
native control, which the element keeps until it has drawn. As on a native control, nothing is focused when a page
rendered on the server is hydrated, and a later change of `autoFocus` focuses nothing. The attribute is still written,
so a dialog or a sheet that opens later still gives focus to the control marked with it.
