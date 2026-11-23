---
'@tanrei/web': patch
---

**More text under a component's own boxes is checked for contrast.** axe-core's `color-contrast` rule takes every
visible element with a size for one in front of the text it lies over, whatever its `pointer-events`, and leaves that
text unchecked. In `<tanrei-tabs>` (and so `<tanrei-tab-view>`), the selected tab's own icon and label, which the
active indicator's cut leaves undrawn under the covered copy, are hidden while the cut takes them whole, so the copy
that is drawn is the one checked; the tooltip of a truncated label, laid over the whole tab, lies under the label,
which takes no pointer of its own, so the pointer over the label is still over the tooltip. In
`<tanrei-date-time-picker>`, each wheel's control (the spin button on its middle row) is transparent until something
is typed into it, when it draws what was typed as before, and the dial's arm and the copy of its numbers inside the
handle, boxes as large as the dial that draw nothing themselves, are hidden with what they hold still drawn. In
`<tanrei-image-preview>`, the stage, which draws nothing, lies under the images and the error text, which take no
pointer, so a press on them still reaches it, and the boxes that carry the stage's and the caption's focus indicators
draw them by their `::before`. Each still takes focus, the pointer and the keys as it did.
Nothing a component draws changes, in any fixture, theme, hover or focus, in Chromium, Firefox or WebKit.
