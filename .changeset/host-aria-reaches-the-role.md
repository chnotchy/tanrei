---
'@tanrei/web': minor
---

ARIA a product sets on a control now reaches the element that carries its role. On Button, Button with menu (its
leading half), Main action button, Copy button, Chip, Card, Checkbox, Switch, Radio button, Slider, Text input, Select,
Combobox, Search, Number input and Color input, the states and relationships written on the element itself —
`aria-describedby`, `aria-labelledby`, `aria-controls`, `aria-details`, `aria-errormessage`, `aria-expanded`,
`aria-haspopup`, `aria-invalid`, `aria-required`, `aria-readonly`, `aria-current`, `aria-keyshortcuts`, `aria-label`,
`aria-description` and the rest — are exposed on the native element inside, beside the component's own, except those
the component owns (a toggle's `aria-pressed`, a checkbox's `aria-checked`, `aria-disabled`, and the `aria-haspopup`,
`aria-expanded` and `aria-controls` of a control that opens a list). Before, only `aria-description` (and, on a Button,
`aria-invalid`) got through, and an id reference never did. An id reference is drawn with ARIA element reflection
(Chrome and Edge 135, Firefox 136, Safari 16.4); an engine without it is given the text of the elements named.

**Breaking:** the delegated attributes leave the host once the element has seen them, so the host is no second node
with the same name in the accessibility tree. The element still answers for them — `getAttribute()`,
`hasAttribute()`, `removeAttribute()`, `toggleAttribute()` and the ARIA properties (`ariaExpanded`,
`ariaDescribedByElements`, …) read and change what it keeps — but a stylesheet or a query that selects the host by one
of those attributes (`tanrei-button[aria-expanded="true"]`) no longer matches it. The internal `forwardedDescription`
and `forwardedInvalid` properties of Button and Main action button are removed.

An icon-only Button with an empty `label` that the product names with `aria-label` or `aria-labelledby` on the element
is named by it and no longer reported as nameless in debug builds (BTN-16); a `label` given is still the whole name,
over the product's `aria-labelledby`.
