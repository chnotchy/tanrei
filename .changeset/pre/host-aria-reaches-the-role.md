---
'@tanrei/web': minor
---

ARIA a product sets on a control now reaches the element that carries its role, and the control is one node for
assistive technology. On Button, Button with menu (its leading half), Main action button, Copy button, Chip, Card,
Checkbox, Switch, Radio button, Slider, Text input, Select, Combobox, Search, Number input and Color input, every
`aria-*` attribute written on the element itself (`aria-label`, `aria-labelledby`, `aria-describedby`,
`aria-description`, `aria-controls`, `aria-details`, `aria-errormessage`, `aria-current`, `aria-expanded`,
`aria-haspopup`, `aria-invalid`, `aria-required`, `aria-pressed`, `aria-checked` and the rest) is exposed on the native
element inside, beside the component's own, except those the component owns (a toggle's `aria-pressed`, a checkbox's
`aria-checked`, `aria-disabled`, and the `aria-haspopup`, `aria-expanded` and `aria-controls` of a control that opens a
list). An id reference is resolved in the control's tree and drawn by ARIA element reflection (Chrome and Edge 135,
Firefox 136, Safari 16.4), and follows the element it names as it is added, removed or changed; an engine without
reflection is given the text of the elements named. `aria-errormessage` is read as part of the description while the
control is invalid. Before, only `aria-description` (and, on a Button, `aria-invalid`) got through, and an id reference
never did.

**Breaking:** each of those attributes **moves** to the `data-aria-*` attribute of the same name on the control
(`aria-current="page"` becomes `data-aria-current="page"`), so the control's own element is no second node with the
same name, description or state — which Chromium, Firefox and WebKit all made of it, and no role or style prevents.
For products:

- Select the control by the moved name: `tanrei-button[data-aria-current="page"]`, not `[aria-current="page"]`.
- `getAttribute('aria-current')` and the `ariaCurrent` property on the control are `null`; read `data-aria-current`.
- Removing the `aria-*` attribute you set (`removeAttribute`, `toggleAttribute`, or a React, Vue or Lit binding set to
  nothing) still takes it away; so does removing `data-aria-*`.
- An id reference must name an element in the same tree as the control or in a tree around it, never one inside
  another component's shadow root.
- `aria-hidden` stays on the control.
- Playwright's `getByRole({ name })`, `getByLabel()`, `ariaSnapshot()` and `toHaveAccessibleDescription()` see the
  name and the description; `toHaveAccessibleErrorMessage()` reads nothing, because the error message is part of the
  description.

The selected look of a `.tanrei-icon` reads `data-aria-pressed`, `data-aria-selected`, `data-aria-checked` and
`data-aria-current` on an ancestor too. The internal `forwardedDescription` and `forwardedInvalid` properties of Button
and Main action button are removed.

An icon-only Button with an empty `label` that the product names with `aria-label` or `aria-labelledby` on the element
is named by it and no longer reported as nameless in debug builds (BTN-16); a `label` given is still the whole name,
over the product's `aria-labelledby`.
