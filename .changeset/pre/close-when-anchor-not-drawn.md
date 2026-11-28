---
'@tanrei/web': patch
---

Menu and docked date-time picker: an open surface whose anchor is no longer drawn asks to be closed. This covers an
anchor taken out of the page, given `display: none` (on itself or an ancestor) or `visibility: hidden`, or skipped by
`content-visibility`. Each sends `close` once, with the new reason `anchor-hidden` (the reason the popover, the select
and the combobox already use). The surface is not placed against the missing anchor in the meantime. If focus was in
the menu and the anchor cannot take it back, focus no longer stays in the closed menu. A menu whose anchor is drawn
again before you close it follows it again. Before, the menu stayed open and was placed against the window's corner
or the anchor's last box.

The button with menu passes `anchor-hidden` on as its own `close` reason. `TanreiMenuCloseReason` and
`TanreiDateTimePickerCloseReason` gain the value. `TanreiFabMenuCloseReason` leaves it out, because the FAB menu never
sends it.
