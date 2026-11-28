---
'@tanrei/docs': patch
---

Documentation site: a state matrix, the live component in each of its states.

- The button's Specs section shows every variant, at rest and selected, enabled, disabled, hovered, focused and
  pressed, in one table drawn under the default system, with the design system and contrast switches in its header.
  The states it does not draw (loading) are named under it.
- Hovered, focused and pressed are the browser's own states, which no attribute of a component can set: the site
  restyles them on its side, copying each of the component's rules for that state onto a docs-only attribute at the
  same specificity. The component's public surface is unchanged. A press is drawn as the chosen system answers one.
- A cell is a picture: it cannot be focused or used, and says in words what it shows. Each cell holds the room of the
  component's baseline before its script arrives, so nothing on the page moves.
