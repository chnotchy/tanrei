---
'@tanrei/web': patch
---

Text input, Number input, Search, Combobox, Color input and every other component that edits text in a native
element: an input method's composition that ends with the value as it began (cancelled with Escape, say, or one that
committed nothing) no longer emits an `input` as it ends. The component used to send one with the unchanged value
whenever the browser sent none after `compositionend`, and Firefox's own `input` after the end reached the page too.
Both are gone now, because no value changed (TXI-1, TXI-4). A committed composition still ends with exactly one
`input` that is not composing. Where the last `input` during the composition reported a value the field no longer
holds (the limit cut the commit back to where it began), one `input` reports the value again.

Search and Combobox had their own check for this, used only when the view or the list closed between the end of a
composition and that `input`. It is gone, because the shared rule now covers it. Combobox: a composition that
inserted nothing in a field the person had not edited yet no longer opens the list. `NativeTextController` takes a
`reported` option (the value the component's `input` reports, where the element shows a suggestion or a completion
in its place), and its `settled` hook now receives whether an `input` closes the composition.
