---
'@tanrei/web': patch
---

A popover shown as a sheet (in a compact window) and a search's full-screen or dialog view now open where every other
modal surface opens: in the write that follows the reads every component makes together. So when their `open` (a
search's `expanded`) is set in the same task as a dialog's, a modal layer's or a sheet's, the one set later is on top
and takes focus, whatever their kinds. Before this, the popover's sheet and the search's view opened in their own
update, under a dialog set open before them in that task.

Opened above a modal surface that holds its opener inert, the popover's sheet gives focus back on closing to where focus
was as it opened — where that surface gives focus — since its opener cannot take it (POP-22: the platform's default for a
closed overlay, which a native `<dialog>` gives too). The search's view does the same when the bar's input or the
trigger cannot take focus back. Before this, focus was lost in Firefox and WebKit.

The byte budget of `@tanrei/web/all` goes from 668000 to 668300 bytes gzip. It measures 668276, 286 more than before
this change: each of the two surfaces now waits for the write and reads the keyboard's cover with the other reads, and
keeps where focus goes back when its own target cannot take it. The popover's bundle grows by 181 bytes and the
search's by 161, both within their budgets.
