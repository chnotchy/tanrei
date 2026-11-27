---
'@tanrei/web': patch
'@tanrei/react': patch
---

**A form's reset returns every control to the value it was first given, however it was given.** The form-associated
elements reset to their `value` or `checked` attribute as it stood at the reset, which is a native control's default
only where the product writes it in markup. A product that gives the value as a property — every React page through
`@tanrei/react`, and any client framework — has no such attribute, so a reset emptied the text inputs, fields, selects,
comboboxes, number, color and one-time-code inputs, unchecked the checkboxes, switches and radio buttons, and set sliders
and ratings to 0. A page rendered on a server returned to what the server wrote, but lost the lists no attribute carries
(a chip field's entries, a checkbox group's value, a combobox's `values`), and the same page rendered by the client
alone reset differently.

Now each element keeps its default as the HTML form-reset algorithm keeps `defaultValue` and `defaultChecked`: the value
it holds when it first draws — from its markup or from a property set before then — and, after that, an attribute the
product writes, as writing a native control's `value` or `checked` attribute does. A value set after the element first
drew, by the product or by the person, is the current value alone. `@tanrei/react` tells each element once it has
mounted with its first props, so a page rendered on a server and hydrated resets exactly as the same page rendered by
the client does, lists included. A rating also takes its first value from a property set after it was attached, where it
took it when it was attached, before React had given its props.
