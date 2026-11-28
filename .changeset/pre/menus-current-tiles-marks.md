---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/react-native': patch
'@tanrei/swiftui': patch
'@tanrei/compose': patch
'@tanrei/flutter': patch
---

Menus, the menubar, chips, the segmented button, the tag group and the chip field follow the owner's web review.

- **Menu: the link item of the current page.** A link item takes a new `current` prop. It is exposed as the current
  page (`aria-current="page"` on its anchor) and drawn with the fill of a checked row
  (`comp.menu.selected.container.color`) and that condition's colors, with no check and no heavier label: the current
  page is where the person is, not a choice, and a fill alone marks it, as a navigation drawer marks its current
  destination. In forced colors, which remove the fill, a line in the link color marks it. The menu never sets it;
  without `href` it is ignored and reported. New fixture `links-current`.
- **Menubar: the current link item is filled, not bold.** It is drawn from a new `selected` condition
  (`comp.menubar.selected.*`, aliasing the menu's selected row), at its label's own weight, so the current page looks
  the same in the bar and in a menu; a folded one is the menu's own current link item. In forced colors a line in the
  link color marks it. The `link-current` baseline changes.
- **Menubar: an indicator on menus in a mixed bar.** While a bar holds both menus and bar items, each menu's title
  ends in the icon set's `expand_more` at the new `comp.menubar.indicator.size` (`sys.icon.small`), `container.gap`
  after the label, so a person sees which entries open a menu. A bar of menus only is unchanged. The `mixed`,
  `mixed-open`, `mixed-many` and `mixed-rtl` baselines change.
- **Menu: a gap cuts the sheet.** Under `separation="gap"` each group, and each run of items outside a group, is a
  sheet of its own (the surface's color, corners, padding and elevation), `comp.menu.group.gap` apart, instead of
  empty space on one sheet. The divider form, the default, is unchanged. The `groups-gap` and `group-titles-gap`
  baselines change.
- **Chip and segmented button: the check is a control's own mark.** The check of a selected filter chip and of a
  selected segment is drawn at new tokens `comp.chip.check.weight` and `comp.segmented-button.check.weight`, which
  alias `sys.icon.mark.weight` (500 in the default system, the checkbox's), instead of `sys.icon.weight` (300). The
  presets fix the mark weight to their icon weight, so they look the same. Baselines that show a selected filter chip
  or a selected segment change subtly.
- **Tag group: the default spacing is `chips`.** A set whose `spacing` is not written now stands as far apart as a
  set of chips must; a set of static tags says `spacing="tags"`. The tag group still gives each chip its own Tab stop;
  the docs show a toolbar of toggle buttons for a row of filters that should be one Tab stop.
- **Chip field: read-only ends with the chips.** A read-only text input with entries and no typed text keeps no room
  for typing, so a read-only chip field ends with its last line of chips (the `email-read-only` baseline is one line
  shorter). Disabled keeps that room. The spec now states the block padding the field already used: one line of
  entries keeps the size's height.

The vocabulary grows by `comp.chip.check.weight`, `comp.segmented-button.check.weight`, `comp.menubar.indicator.size`
and the menubar's `selected` condition. The native platforms are paused: their specs say what they lag behind.
