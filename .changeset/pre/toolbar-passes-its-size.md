---
'@tanrei/web': minor
'@tanrei/react': minor
---

Toolbar: a new `size` (`small`, `medium`, `large`). Set on the toolbar, it is the size of every Button and Button with
menu in it that sets none of its own, in a group or not, and of its overflow button: `<tanrei-toolbar size="small">`.
Only a size set on the toolbar is passed down; an item's own `size` always wins, `medium` included. The toolbar draws
nothing of its own by it: an inline toolbar is still at least 40 high around small items (its container size is a
minimum, as before), and its gaps keep the items' targets apart from the lengths they are drawn at, as they did for
items that set their own size. A Select, Number input, Text input or Slider in a toolbar keeps its own size.

The overflow button sets no size of its own any more: it is drawn at the toolbar's size, and at `medium` where none is
set (as before). It no longer carries `size="medium"`.

Button with menu and Copy button: one without a `size` is drawn at the size its nearest container sets — a toolbar's or
a button group's — and at `medium` where none does; a size it does not have is taken as its nearest. Setting `size` to
any value, `medium` included, makes it its own; removing the attribute (or setting the property to `null`) gives it
back. Reading `size` while none is set still gives `medium`. A Copy button gives the size it is drawn at to the Button
it is drawn by.

What broke: a Button with menu and a Copy button that set no size no longer carry `size="medium"`, which they reflected
from their default; a page's style or script that reads `[size='medium']` on one finds no attribute. The React
wrappers of the two no longer pass a default `size`. The custom elements manifest no longer marks their `size` as
reflected by Lit: the element writes the size set on it itself.

New fixture: `toolbar/inline-small`. Nothing that was drawn before moves.
