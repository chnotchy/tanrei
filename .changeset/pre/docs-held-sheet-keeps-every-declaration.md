---
'@tanrei/docs': patch
---

Documentation site: an element a figure holds in a state (the state matrix's cells, a color role map's held state, the
anatomy figure reading a focus ring) draws exactly what the component draws in that state.

- The copies of its sheets are written from the text the component's style was written as, not from the browser's
  serialization of its rules, which dropped a shorthand with `var()` that a later longhand of the same rule overrides:
  a role's `font` (a navigation drawer item's trailing text was drawn at the page's 16px, not 13px, and sixteen other
  texts, a badge's label, an avatar's, a field's counter and a select's value among them, lost their type the same
  way) and the slider handle's `background` (drawn without its fill). It also wrote `all: unset` out as every longhand.
- A state condition inside `:is()`, `:where()` or `:has()` is held too, at the same specificity, and so is the
  `data-hovered` a hover controller writes: the slider's handle and a drawer item were drawn without their focused and
  hovered state layers, and a drawer item without its focus ring. One inside `:not()` is still left alone.
- The anatomy figure no longer puts the component's own sheets back after it reads the focus ring: the copies draw the
  same.
