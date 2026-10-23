---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/tokens-build': minor
---

**Breaking — Toolbar: inline by default.** A `<tanrei-toolbar>` (React `Toolbar`) that does not say its `variant` is now
`inline`: it stands where the layout puts it, as long as its items need and never longer than its container, with no
surface, shadow or edge of its own in the default system, its items closed up as a floating toolbar's are. It no longer
spans the bottom edge or reads the bottom inset. Write `variant="docked"` where you want the bar across the bottom edge.
A variant a design system adds now takes the inline structure (it took the docked one). The toolbar moves from the
navigation category to actions: a toolbar is not a way to choose a destination.

A toolbar is now a container of related controls wherever it stands, as the WAI-ARIA toolbar pattern, React Aria, Primer's
action bar and Fluent 2 describe it:

- **Items:** Buttons (icon-only or labelled, toggles among them), a Button with a `<tanrei-menu anchor>` beside it (a menu
  button: the menu is not laid out), `<tanrei-button-with-menu>` (each half its own stop of the arrow keys), and the new
  `<tanrei-toolbar-group label>` (React `ToolbarGroup`) holding them; a `<tanrei-divider>` is a separator.
- **Separation:** two groups, or a group and an item, are set apart by a short line with space on each side, or by space
  alone, as `separation` (`auto`, the design system's `comp.toolbar.separation`, which follows
  `sys.behavior.separation`; `divider`; `gap`) says.
- **Overflow:** `overflow="menu"` (the default) hides items from the end, one at a time, behind an overflow button whose
  menu repeats them — a toggle as a checkbox item, a menu button as a submenu, a Button with menu as its main action and
  a submenu — and a row activates the hidden item itself. Name the button with `overflow-label`, or once with
  `setWords({ toolbarOverflowLabel })` (English word pack: "More actions"). `toolbar-overflow="never"` on an item keeps
  it. What is hidden is decided before a frame is drawn. **Breaking:** a toolbar whose items do not fit no longer scrolls
  by default and no longer reports that it scrolls; `overflow="scroll"` keeps the scrolling.
- Tokens: twelve new `comp.toolbar` tokens (the inline variant's members, `group.gap`, `divider.length`,
  `divider.thickness`, `divider.color`, `separation`); none renamed or re-valued.
- `<tanrei-button-with-menu>` in a toolbar keeps one of its halves at `tabindex="-1"`, as the toolbar's roving Tab stop
  says; outside a toolbar both halves are Tab stops as before.

SwiftUI, Compose, Flutter and React Native stay lagging: they keep the docked default, Buttons only and scrolling until
they catch up.

Baselines (web, recorded on Linux by the Record baselines workflow): nine new pictures, one per new fixture —
`toolbar/inline-formatting`, `inline-separation-gap`, `inline-overflow`, `inline-overflow-pinned`, `inline-menu-button`,
`inline-button-with-menu`, `inline-labelled-toggles`, `floating-vertical-groups` and `rtl-inline-overflow`. The seven
existing toolbar pictures state their variant and did not move.
