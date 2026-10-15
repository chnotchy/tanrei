---
'@tanrei/web': minor
'@tanrei/react': minor
---

Menu: `trigger` (`anchor` | `context`, default `anchor`) makes a menu the context menu of an area. With `context`,
`anchor` names the area (a canvas, a list, a row), and a person asks for the menu at a point of it.

- **Asking.** A right-click, a touch or a pen held still for the long-press duration (500 ms) within the touch slop,
  Shift+F10 or the ContextMenu key on the element that has focus, or the context-menu command of assistive technology.
  The menu fires a cancelable `contextrequest` with `{ x, y, element, input }` (`pointer`, `long-press` or
  `keyboard`) and you set `open`, as you do from an anchor. It cancels the browser's own context menu for each request
  it answers; cancelling `contextrequest` leaves the request to the browser. After a long press, the release of that
  press activates nothing (MNU-60).
- **Placing.** The surface opens with a corner on the point and no offset, flipping to the other side of the point on
  each axis by itself near the window's edges, limited to the room and scrolled, and moving with the area; a key opens
  it against the focused element, as against an anchor (MNU-61).
- **Focus.** Items, keys, submenus and close reasons are unchanged. Focus returns to the element that had focus when
  the menu was asked for; a press anywhere outside the surface, in the area too, closes it (MNU-62).
- **Accessibility.** The area gets no `aria-haspopup`, `aria-expanded` or `aria-controls`, and the menu is named only
  by the `aria-label` you give it (MNU-63). An unknown `trigger` is `anchor`, reported in debug builds.
- SwiftUI, Compose, Flutter and React Native do not have the context trigger yet.

The long-press duration, the touch slop and the swallowed release after something opens under a press are now one
shared module that the list's reorder and the tooltip use too, with no change to either.

Snapshot baselines: none change; a context menu draws exactly as a menu opened from an anchor.
