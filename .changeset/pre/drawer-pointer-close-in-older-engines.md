---
'@tanrei/web': patch
---

Navigation drawer: in Chrome and Edge before 145 and Safari before 18.4, closing an open collapsible modal drawer with a
pointer's press on its menu button no longer draws a focus indicator on the button (NVD-22, NVD-37). Those browsers do
not know `focus()`'s `focusVisible` option, so the focus given back after the press was drawn as a script's focus, with
the indicator, after a drawer opened from the keyboard. There the press now gives focus itself, as the browser does,
with no indicator; browsers that know the option are unchanged.

`hasFocusVisibleOption()` (a primitive) says whether the browser's `focus()` reads the option.
