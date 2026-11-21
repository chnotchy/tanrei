---
'@tanrei/web': minor
'@tanrei/react': minor
---

**Breaking — Popover: in a compact window a popover takes the bottom sheet's appearance.** This is Tanrei's rule for
every popover and every dialog in a window narrower than the component's `compact.window-width` (600 in the default
system). Below `comp.popover.compact.window-width` (new, an alias of `sys.breakpoint.medium`; 0 turns it off for a
system) a popover is no longer placed beside its anchor: it is drawn as the bottom sheet is drawn — at the window's
bottom edge, as wide as the window up to `comp.bottom-sheet.container.max-width`, in the bottom sheet's color,
elevation and top corners, square at the bottom, above the on-screen keyboard — and slides up and down with the bottom
sheet's motion (a fade where motion is reduced). It is the same element with the same props and events, and it is then
a modal dialog over the bottom sheet's scrim: everything behind it is inert, focus is kept in, and Escape, a press on
the scrim (`close` with the reason `outside`) and the close button close it; it never sends `focus-out` or
`anchor-hidden` there. It has no arrow and no drag handle, and `placement`, `offset`, `crossOffset` and `width` do not
apply to it. Crossing the width while it is open changes its form at once, keeping focus.

`compactPresentation` (`compact-presentation`, `sheet` by default) set to `own` keeps one popover beside its anchor in
every window; `initialFocus="anchor"` always does, because the field being typed in must stay usable. A popover that
must stay beside what it belongs to on a phone sets it.

The select's and the combobox's lists, the menus and the tooltip are unchanged: they stay beside their control in every
window.

Baselines: the popover's new fixtures `compact` (the sheet) and `compact-own` are drawn in a 360 × 640 window; no
existing popover baseline changes.
