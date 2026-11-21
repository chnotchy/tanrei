---
'@tanrei/web': patch
---

Link card: a change of `variant` is drawn at once. Before, switching a shown card between outlined and filled faded
its fill and its edge over the state motion; now the new look appears in the same frame, as the spec asks. A card that
was not a link and is given an `href` — as a prop, or on the product's own anchor — also appears as a card at once
instead of fading in. Hover, focus and press still move over the state motion as before.
