---
'@tanrei/docs': patch
---

Documentation site: a page whose look came too late says what it draws. Where the look's stylesheet is not in by the
reveal limit (the reader's own theme read slowly from IndexedDB, or a gallery example's file), the page is drawn in the
default system and the sheet is kept for the next page, as before; but the header's appearance button and the
Appearance panel went on naming the look asked for ("Appearance: My theme") over a page drawn in another. The head's
script now announces that change of look through the same `docs-appearance` event as any other, and the header reads
what is drawn from `<html>` on every one: the button and the panel name the default system, a line above the panel's
list says which look came too late and that it applies from the next page, and a Snackbar says the same, in the six
languages, with "Apply now", which puts it in on that page as choosing it in the panel does. A change of color mode or
contrast on such a page keeps the reader's look (it was stored as the default system's).
