---
'@tanrei/web': minor
---

A control's own label is now its whole name over the name a product writes on it, and the rule that moves the
product's ARIA from a host with no role to the element that carries the role covers the surfaces, the landmarks and
the rest of the hosts without a role.

**Breaking:** on the elements listed below, select by `data-aria-*` and read `data-aria-*`: `getAttribute('aria-…')`
on them is `null`. A `label` given now wins over your `aria-labelledby` and `aria-label`.

- **A given label wins.** Where a control's `label` is set (or the label of the Field that frames it), your
  `aria-labelledby` and `aria-label` on it are kept out of its name, as the Button's already were: the Text input,
  Select, Combobox, Number input, Color input, One-time-code input, Checkbox, Radio button, Switch, Slider, Search,
  Card, FAB menu, segments, navigation destinations and groups, the Navigation drawer and the tab list of Tabs and of
  a Tab view. The Chip, the Main action button, a Button with menu's leading half and a labelled Copy button, named by
  their content, now say that text as their `aria-label`, so it wins over your `aria-label` too. With `label` empty,
  your name is the name, as before.
- **A tab's label wins too.** A `tanrei-tab`'s host is the tab, so what you write on it stays there, but while its
  `label` is set your `aria-label` and `aria-labelledby` on it are held as `data-aria-label` and
  `data-aria-labelledby`, and given back as you wrote them when `label` is emptied. Removing one, or setting its ARIA
  property to `null`, takes the held value away.
- **More elements move your ARIA inside:** the Dialog, Modal layer, Image preview, Side sheet, Bottom sheet,
  Date-time picker and Popover (on their dialog, or their region while not modal); the Breadcrumbs, Pagination and
  Table of contents (on their navigation landmark); the Tag group (on its list); the Handle (on its separator or
  button; `aria-disabled` and `aria-expanded` are its own and reported); and the Calendar, Code block and File picker
  (on their group, which each now becomes while you name it). A name you give counts before a debug build reports a
  missing one.
- **No copy left behind.** When a template stops drawing the element a description was exposed on (a Text input turned
  multi-line), the hidden copy of that description goes with it.
