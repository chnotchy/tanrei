---
'@tanrei/web': patch
---

Search and Combobox: a view or list that closes between the end of an input method's composition and the `input`
that closes the composition now stays closed. That `input` arrives in a later task, so an Escape pressed in the gap
(or the product closing the view) was followed by the view opening again and an `input` that changed nothing. Now
that `input` opens nothing, and it is emitted only where the composition changed the value or the text. What the
person types next opens the view as before.
