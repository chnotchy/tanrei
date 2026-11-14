---
'@tanrei/web': patch
---

Search: a view that closes keeps drawing its content while it fades out. Before this fix the suggestions' listbox was
emptied as soon as the view closed. In the dialog and full-screen views only the header faded, and the dialog view's
height dropped to the header's at once. The docked view faded out empty. Now the docked, dialog and full-screen views
draw the suggestions and the active row as they were at the moment of closing, even if the product adds or removes
suggestions meanwhile, until the fade ends. A group of results below the suggestions keeps its space above it. What the
search exposes changes when it closes, as before: the input is a search box again at once, without `aria-expanded`,
`aria-controls` or an active descendant, and the view that fades out is inert. Opened again before it has gone, the
view shows what the search holds now. Where motion is reduced it is gone at once, as before.
