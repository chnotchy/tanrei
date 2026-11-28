---
'@tanrei/web': patch
---

Snackbar: F6 reaches it. A snackbar's controls stand at the end of the focus order, where its host is, so reaching an
Undo from the keyboard meant a walk to the end of the page. Now F6 or Shift+F6, while `<tanrei-snackbar-host>` shows a
snackbar with a control, moves keyboard focus to its first control (the text while it scrolls, else the action, the
expand button or the close button) with its focus indicator, from anywhere in the page or in the modal surface the
snackbar shows in, and F6 or Shift+F6 from inside it moves focus back to where it was. Closing it still gives focus
back the same way. While no such snackbar is shown the key is left alone, so the browser's own F6 goes on, and a
product that gives F6 a meaning of its own keeps it by handling the key first (`preventDefault()`). For a shortcut of
its own (an Undo on Command+Option+Z), a product calls the new `focusCurrent()` on the host, which returns whether focus
moved.
