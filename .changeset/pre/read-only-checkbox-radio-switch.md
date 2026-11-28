---
'@tanrei/web': minor
'@tanrei/react': minor
---

Read-only checkbox, radio button, radio group and switch: `readOnly` (the `readonly` attribute on the web). A
read-only control shows its answer in place and keeps it in the focus order, so that it is read with its form — a
review step, or a setting only some people may change — as React Aria's `isReadOnly` does for its Checkbox,
RadioGroup and Switch:

- It stays focusable and in the tab order, and nothing a person does changes it: a press, Space, a click on its label,
  assistive technology, `click()`, a drag along a switch's track, or an arrow key that lands on a read-only radio
  button (which moves focus there and selects nothing). It fires no `input` and no `change`. The product may still set
  its value.
- It is exposed as read-only: `aria-readonly` on the checkbox's and the switch's native element, and on the radio
  group's `radiogroup`. WAI-ARIA has no read-only state on the radio role, so a radio button says it through its
  group; options grouped by `name` alone say it on the container the product gives them.
- It is drawn as its value, from the enabled tokens of its condition — never the disabled ones — without the hover
  and press answers (no state layer, ripple or dim, and no pressed handle on a switch); keyboard focus still shows.
- It is submitted with its form, and a required one reports no missing value, because the person cannot give one.
  HTML's `readonly` does not apply to checkbox and radio inputs, which is why the components do this themselves.

`disabled` wins over `readOnly`. A radio group's `readOnly` makes each of its radio buttons read-only without
changing their own. The radio group's spec no longer says that it has no read-only state.

New baselines: `checkbox/read-only-selected`, `radio-button/read-only-selected` and `switch/read-only-selected`
(new fixtures, drawn as the enabled `selected` fixtures are). SwiftUI, Compose, Flutter and React Native do not have
`readOnly` yet.
