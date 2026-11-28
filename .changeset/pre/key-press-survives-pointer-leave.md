---
'@tanrei/web': patch
---

Every pressable control: a press made with Enter or Space now stays pressed for as long as the key is held down, wherever
the pointer goes. Before, a mouse resting over the control ended the key's pressed state and its ripple as soon as it
left the control — because the mouse moved, or because the control moved out from under it (Enter on a bottom sheet's
handle raises the sheet, and the handle went up out from under the pointer). A key that goes down and up while the
pointer holds a control down no longer ends the pointer's press either: it ends when the pointer lets go or leaves.
