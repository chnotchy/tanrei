---
'@tanrei/web': patch
---

Search: the bar's trailing Buttons keep their spaces when a product forwards them with a slot of its own
(`<tanrei-search><slot slot="trailing"></slot></tanrei-search>` in a wrapper's shadow root). The search used to give
forwarded Buttons no space at all, and wrote its own custom properties onto the product's elements. Text among the
trailing Buttons, which such a slot forwards or an element of `display: contents` holds, no longer moves the space kept
for a Button onto the wrong side of it: the text is laid out where it is written, and the space SRC-34 keeps stands
right before each Button. A debug build now reports text in the trailing slot (SRC-27), since the slot holds icon-only
Buttons.
