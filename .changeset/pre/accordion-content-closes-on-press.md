---
'@tanrei/web': minor
---

Accordion: an open item is one target, as a whole clickable card is. A press anywhere in its content closes it, as a
press on its header does. Under a pointer the whole item — header and content, to the item's edges — shows the hovered
and pressed states with the pointer cursor (the ripple grows over the whole item), and keyboard focus on the header
rings the whole item. A link, a button, a field, a label or anything else in the content that takes a press keeps its
own press, cursor and states, and the item shows none while the pointer is over it; selecting text, a drag, a press
with a modifier key, another mouse button, a second click, a click the product cancels and a press inside a nested
accordion's item (which closes that item only) close nothing. The header stays the one button for the keyboard and
assistive technology, and the content gets no role or focus stop. It needs the element's script: without it only the
header toggles, and the content shows no pointer and no state. The look at rest is unchanged in every shipped system;
the hovered, pressed and focused looks of an open item now cover the whole item.

Where the browser cannot move a height to `auto` in CSS, an item no longer keeps an empty `style` attribute after
its height motion.
