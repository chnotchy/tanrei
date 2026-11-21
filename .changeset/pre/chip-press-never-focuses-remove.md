---
'@tanrei/web': patch
---

**Chip.** Clicking an input chip and then pressing Enter no longer removes it in Safari on macOS. There a pressed
button takes no focus, and the press was handed to the first part of the chip that a click focuses: the remove action,
which is out of the Tab order by a tabindex. The next Enter or Space then pressed the remove action. Now a press
anywhere on an input chip but its remove action gives focus where the same press on an action chip does: the chip's
button where the browser focuses a pressed button, and nothing in the chip in Safari on macOS. The remove action still
takes focus from its own press and from assistive technology, and the Tab order is unchanged. Action and filter chips,
whose remove action is not drawn, were not affected. No baseline changes.
