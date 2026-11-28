---
'@tanrei/web': minor
---

ARIA a product sets on the rest of the controls now reaches the element that carries their role, and each is one node
for assistive technology: the composed fields (Text field, Number field, Select field, Combobox field, Color field,
Slider field, Chip field, One-time-code field), Embedded text input, One-time-code input, a Segmented button's
segments, the FAB menu's toggle, the destinations and groups of a Navigation bar and a Navigation drawer (in both its
forms, the rail included) and the Tabs' tab list. As on Button and the others, each `aria-*` attribute written on the
element moves to the `data-aria-*` attribute of the same name and is exposed inside, except those the component owns,
which its spec names.

**Breaking:** select those elements by `data-aria-*` (`tanrei-navigation-bar-item[data-aria-describedby]`), and read
`data-aria-*`: `getAttribute('aria-…')` on them is `null`.

- A composed field passes the product's ARIA on to its control, beside its Field's description and states. Its name is
  its `label`: `aria-label` and `aria-labelledby` on it are moved and not exposed.
- An Embedded text input takes its name, description and states as props alone: `aria-label`, `aria-labelledby`,
  `aria-description`, `aria-describedby`, `aria-errormessage`, `aria-invalid`, `aria-required`, `aria-readonly` and
  `aria-disabled` on it are moved and not exposed.
- A destination's `aria-current`, a group's `aria-expanded` and `aria-controls`, a segment's `aria-checked` and
  `aria-pressed`, and the FAB menu's `aria-haspopup`, `aria-expanded` and `aria-controls` are their own.
- A product's `aria-description` on a navigation destination or group is read before the component's own description.
- A search drawn as an icon now says that it opens a dialog, whether it is open and its shortcut through its Button,
  which moves them and exposes them on its native button.

In a debug build, every control that moves the product's ARIA — these and the sixteen before them — reports once each
`aria-*` attribute it owns that the product sets (`console.warn`); what a Tanrei component writes on another (a Field on
its control, a tooltip on its anchor) is not reported. It replaces the report of an ARIA name on a composed field's or
an Embedded text input's host.
