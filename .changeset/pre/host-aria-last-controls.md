---
'@tanrei/web': minor
---

ARIA a product sets on the last elements whose host has no role now reaches the element that carries their role, and
each is one node for assistive technology: the Field group, the Checkbox group and the Radio group (on their group or
radio group), the Chat composer and the File upload (on their group), the Navigation drawer itself (on its navigation
landmark, or its dialog while it is a modal drawer that is shown) and the Tab view (on the tab list of the row it
draws). Each `aria-*` attribute written on the element moves to the `data-aria-*` attribute of the same name and is
exposed inside, except those the component owns, which its spec names.

**Breaking:** select those elements by `data-aria-*` and read `data-aria-*`: `getAttribute('aria-…')` on them is
`null`.

- A group's, a Chat composer's and a File upload's name is its `label`, and its states are its props: `aria-label`,
  `aria-labelledby`, `aria-disabled`, `aria-required`, `aria-invalid`, `aria-errormessage` (and a Chat composer's
  `aria-busy`, a Radio group's `aria-readonly`) on it are moved, not exposed, and reported in a debug build. This
  replaces their report of an ARIA name on the host.
- A Tab view linked to tabs placed elsewhere draws no row, so what is written on it reaches nothing: it is moved and
  reported. Write it on the linked `tanrei-tabs`.
- Setting a moved name's ARIA property to `null` on any of these controls, and on every other control that moves the
  product's ARIA (`el.ariaLabel = null`, `el.ariaDescribedByElements = null`, Lit's `.ariaLabel=${nothing}`), now takes
  the moved value away, as removing the attribute does. Setting it to a value moves it as before; the getters read
  `null` on the element.
- A control whose `label` is empty and that the product names by `aria-label` or `aria-labelledby` is no longer
  reported unnamed in a debug build: the Text input, Select, Color input, Number input, Combobox, One-time-code input,
  Checkbox, Radio button, Switch, Slider, Search, Chip, Card, icon-only Copy button, Main action button, Button with
  menu, FAB menu, a Tab, the destinations of a Navigation bar and a Navigation drawer, a drawer's group and a modal
  drawer. A Tab keeps the `aria-label` the product writes on it while its `label` is empty, and a FAB menu named so
  names its list by its toggle.
- The debug report of an `aria-*` attribute a control owns cites the id of the control's own spec sentence for this
  rule (`BTN-46`, `TXF-68`…), not `host-aria`.
