---
'@tanrei/web': patch
---

Text input and text field: while the field is disabled — by its own `disabled`, its Field's or a `<fieldset>`'s — the
prefix and the suffix carry `aria-disabled="true"`, so they are exposed as part of the disabled control, as its native
element is. They are drawn beside that element, not inside it, so its `disabled` did not reach them: a contrast checker
(axe-core's `color-contrast`) held their faded text to 4.5 : 1, although WCAG 1.4.3 exempts the text of an inactive
control, and failed a disabled field with a prefix or a suffix in every variant. The affixes are still part of the
input's description. Nothing breaks.
