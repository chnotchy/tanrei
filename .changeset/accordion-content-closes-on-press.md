---
'@tanrei/web': minor
---

Accordion: while an item is open, a press anywhere in its content closes it, as a press on its header does — the way a
whole card answers a press while the controls inside it keep their own. A link, a button, a field, a label or anything
else in the content that takes a press keeps it; selecting text, a drag, a press with a modifier key, another mouse
button, a second click, a click the product cancels and a press inside a nested accordion's item (which closes that
item only) close nothing. It is a pointer convenience of the element's script: the header stays the one button for the
keyboard and assistive technology, the content gets no role, focus stop, cursor or state layer, and without the script
only the header toggles. No fixture's look changes.
