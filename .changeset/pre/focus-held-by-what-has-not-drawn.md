---
'@tanrei/web': patch
---

`focus()` on a control that what holds it has not drawn yet is no longer lost. A page that opens a dialog and focuses
its first field in the same task (`dialog.open = true; nameField.focus()`, or a dialog written `open` with the field
focused at once) found the field not shown yet: the call landed nowhere, and the dialog then gave focus to itself as
it opened. The same held for a side sheet or a bottom sheet, and for a Button an app bar holds, which the bar shows
only once it has seen what each of its slots holds. Every element now keeps a `focus()` that lands nowhere while it,
or a Tanrei element that holds it, still has an update to draw, and gives it once they have drawn — with its options
(`focusVisible`, `preventScroll`) — in place of the surface's own focus as it opens. As before it is not given where
the page moved focus elsewhere meanwhile, where `blur()` was called, where another control was focused after it, or
once the control left the page; a control that is drawn and shown and still takes no focus (a disabled one) is
answered at once, as the platform answers it.

For an element's author: `focus()` is now written once, in the base every element extends. An element that focuses a
part it draws overrides the protected `delegateFocus()` instead of `focus()` (the manifest still lists it as the
element's `focus()`), and `keepFocusUntilRendered()` is gone.
