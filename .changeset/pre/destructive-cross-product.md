---
'@tanrei/web': minor
'@tanrei/react': patch
'@tanrei/react-native': patch
'@tanrei/swiftui': patch
'@tanrei/compose': patch
'@tanrei/flutter': patch
---

Destructive across the Button's forms and its hosts.

- **Button:** ten new fixtures show `destructive` beyond each variant at medium: small and large, a trailing icon,
  icon-only in tonal and outlined, narrow (filled, text) and wide (outlined), busy and full width. The BTN-40 tests now
  check every destructive fixture of the spec against its variant's destructive parts, and that each keeps the size and
  the place of every part of the same fixture without `destructive`.
- **Dialog, side sheet, popover, button group and toolbar:** the action and button items declare `destructive`, the
  Button's own, which the host leaves as set (on the web it was already the Button's attribute; the spec now names it).
  New fixtures: `dialog/destructive-confirmation` (an alert dialog, Cancel and a filled destructive Delete),
  `side-sheet/destructive-action`, `button-group/order-cancel-delete` and `toolbar/docked-destructive-item`.
- **Toolbar (TBR-20):** an action or a labelled Button hidden into the overflow menu is a destructive menu item while
  the Button draws destructive — not a toggle (BTN-41) and not a link (BTN-43). It used to be a plain row.
- **Where there is no destructive look**, the specs now say so in their notes: a segmented button, a filter chip and an
  action chip, the main action button and the FAB menu. An action that deletes is a Button with `destructive`, or a
  menu's destructive item.

New baselines (web, Chromium): the fourteen fixtures above, recorded on CI's Linux image.
