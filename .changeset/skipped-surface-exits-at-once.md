---
'@tanrei/web': patch
---

A surface that closes while `content-visibility` skips the box it is in — a select's or a combobox's list, a tooltip,
a popover, a menu or a docked date-time picker held in the same box as its anchor, which the product hides — now
leaves the top layer at once. Nothing of it is drawn there, so its exit has nothing to show, and the engines never play
an exit begun in a skipped subtree: Firefox leaves its transitions pending (Chromium the date-time picker's exit
animation) until the box is drawn again, and the surface stood in the top layer, drawn nowhere, for as long as the box
was hidden. `AppearController.exit()` resolves at once when its motion element is not drawn.

In Firefox a tooltip whose anchor `content-visibility` skips now closes too (TIP-9): Firefox keeps the last box of an
element in a skipped subtree, so the tooltip found its anchor where it was and stayed open. It is now told when its
anchor is no longer drawn, as the menu and the popover are.
