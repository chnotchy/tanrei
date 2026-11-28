---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/react-native': minor
'@tanrei/swiftui': minor
'@tanrei/compose': minor
'@tanrei/flutter': minor
---

Handle (`<tanrei-handle>`, React `Handle`): the mark a person drags, or moves from the keyboard, to change the size of
what it stands on — a sheet, a text field, a pane, a preview frame. It sizes nothing itself: it tells its owner what
happened, and the owner keeps the size.

- One axis is a short capsule with round ends (`axis` `vertical` for a height, `horizontal` for a width); `both` is a
  quarter-circle arc that bows toward its `corner` (logical: `bottom-end`, `bottom-start`, `top-end`, `top-start`) and
  shares its centre with a corner of radius `arc.radius` plus `inset`. Two sizes, `medium` and `small` (a text field's
  corner), an axis a design system may extend.
- Events: `resizestart` (`pointerType`), `resize` (`inline` toward the end edge, `block` downward, from the press, every
  frame the drag moves), `resizeend` (once, with `cancelled`), `step` (`axis`, `direction`, `amount`: `one`, `large`,
  or `limit` for Home and End) and `activate` (a press without a drag, Enter, Space).
- With a `value` it is a focusable separator, as the window splitter pattern has it (`min`, `max`, `valueText`, the
  orientation of its line); without one, a button with `expanded`. `activate` gives every owner a size that needs no
  drag (WCAG 2.5.7).
- Out of sight until it is used: drawn while a mouse is over it, while it has keyboard focus and while a press or a drag
  holds it, and always on a touch screen, which has no hover. It stays one Tab stop with its name and value, and keyboard
  focus brings it into sight with its focus ring. `revealed` draws it at rest (a sheet's grip).
- A press takes no focus and selects nothing; the drag follows the pointer past the window's edge. An owner that holds
  an iframe turns off its `pointer-events` between `resizestart` and `resizeend`.
- Its states and press answer are the Button's, at both sizes: the box carries the state layer; under a mouse and a
  press the line grows a little longer and thicker and darkens. It has no error color.

New tokens `comp.handle.*` (the box, the line at rest and while used, the arc's radius, the inset, the colors per state,
the motion), and two rules that darken the line under hover and press. New baselines: one per Handle fixture, and the
`both-bottom-end` fixture under each shipped preset. No existing baseline changes. The web is the first platform;
SwiftUI, Compose, Flutter and React Native are planned.
