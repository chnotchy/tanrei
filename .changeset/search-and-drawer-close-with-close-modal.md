---
'@tanrei/web': patch
---

Search and navigation drawer: a closing modal view or drawer stays drawn until its exit has played, in every engine,
and gives focus back at once (MDL-5, MDL-7), as the dialog, the sheets and the other modal surfaces do. The search's
dialog and full-screen views closed with a bare `close()` and kept themselves drawn with a discrete `display` and
`overlay` transition, which only Chromium plays: in Firefox and WebKit the view and its scrim vanished with no fade.
They now close with `closeModal()`. The modal navigation drawer slid out while it was still modal, so the page behind
stayed inert and focus went back only when its motion ended; a drawer that slides now closes with `closeModal()` too,
and its slide and its scrim's fade begin in the first frame drawn after the task that opens or closes it. A
collapsible modal drawer still narrows to its column while it is modal, and gives focus back once the column has taken
the dialog's place.
