---
'@tanrei/web': patch
---

`focus()` called on a control before its first update is no longer lost. A script that focuses a control as soon as it
creates it — React's `ref.current.focus()` right after mounting, a page that inserts a field and focuses it at once —
found nothing drawn to focus: the shadow root that delegates focus was still empty, and the part a control's own
`focus()` goes to (a text input's native input, a select's container, a composed field's control) was not there yet.
Every element now keeps such a call, with its options, and gives it once it has drawn, unless focus moved elsewhere
meanwhile, `blur()` was called, or the element left the page. A host that is focusable itself is focused at once, as
before.
