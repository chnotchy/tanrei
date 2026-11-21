---
'@tanrei/web': patch
---

In WebKit, a dialog or a modal side sheet written open in the page's markup whose actions are stacked no longer fades
its scrim in as the page loads (MOT-4). The dialog was drawn open at once, but laying it out again in the task that
opened it had WebKit start the scrim's entrance from its starting style anew. A modal dialog opened before the
document's first paint now keeps its scrim from starting a transition until that paint.
