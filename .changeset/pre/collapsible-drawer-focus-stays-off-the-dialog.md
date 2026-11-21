---
'@tanrei/web': patch
---

Navigation drawer: focus no longer moves on its way through a collapsible modal drawer's opening and closing (NVD-19,
NVD-22, NVD-35, NVD-37, NVD-40).

- A pointer's press on the menu button of the open drawer moves no focus before the drawer closes. The press gave focus
  to the button (Chromium, Firefox) or to the dialog itself (WebKit), so the focused destination lost its focused color
  over the state motion before the drawer began to narrow, out of step with its width. Focus now stays where it is until
  the close is under way, and then goes back to the menu button with no focus indicator, as the press gave it before.
- Opened by the product while the selected destination in its column has focus, the drawer keeps focus there as it
  widens and as it narrows back. Before, the engines gave focus to the menu button (Chromium) or to the dialog (Firefox,
  WebKit) as the dialog was shown, and back. In WebKit the destination's focused color dropped at once in the first
  frame and climbed back over the widening. In Chromium the destination and the menu button each began a motion that
  ended in no time. Closing, focus left the destination and came back to it.

`openModal()` (the primitive every modal surface opens with) takes `keep`: an element inside the dialog that already
has focus as it opens, and keeps it.
