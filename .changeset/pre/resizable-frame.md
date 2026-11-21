---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/react-native': minor
'@tanrei/swiftui': minor
'@tanrei/compose': minor
'@tanrei/flutter': minor
---

Resizable frame (`<tanrei-resizable-frame>`, React `ResizableFrame`): a box whose width and height a person changes by
a Handle on its edge or its corner, from the keyboard, or by pressing the handle without a drag. Built from Handle.

- Two looks: `outlined` (the default), a box with rounded corners and one hairline, its handles outside it so that they
  cover nothing and drawn at rest while a mouse is over the frame — where a preview is checked; and `plain`, which draws
  nothing of its own, the content filling the box with its own surface and each handle centred on its edge and out of
  sight until used — the edge of a navigation drawer or a side bar.
- `handles`: any of `start`, `end` (the default), `bottom` and `bottom-end`. `start` is for content at the end of a
  layout (a side bar); the box then stands at the end of its room.
- `width` and `height` (null: the layout's, or the content's height), `minWidth` (320 by default, the reflow width of
  WCAG 1.4.10), `maxWidth` (the room the layout gives), `minHeight`, `maxHeight`, `snapWidths` (a drag snaps to each),
  `step` and `largeStep`.
- Each handle is a separator whose value is its size in pixels (the window splitter pattern): the arrows, Page Up and
  Page Down, Home and End. Pressing it switches between the greatest size and the one before it, so no size depends on
  a drag (WCAG 2.5.7). A key or a press moves the size by the resize role; a drag is followed without a motion.
- Events: `resize` in every frame of a drag, `change` once a person has changed the size; neither for a size the
  product sets. While a drag lasts, no `<iframe>`, `<object>` or `<embed>` in the content takes the pointer.
- `sizeIndicator`: `none`, `active` (while a handle is held or has keyboard focus, the default) or `always` — a
  "390 × 640" label in the box's top-end corner, in the page language's digits, written left to right, hidden from
  assistive technology.

The spec schema has a new prop type, `numbers` (a list of numbers), which `snapWidths` is; `validate` checks a numbers
prop's fixtures.

New tokens `comp.resizable-frame.*` (the outlined box's corners and edge, the least width and height, the handles'
gap, the snap distance, the size indicator, the motions by role). No sys token is added. The web is the first platform;
SwiftUI, Compose, Flutter and React Native are planned. New baselines: one per Resizable frame fixture, and the
`indicator-always` fixture under each shipped preset. No existing baseline changes.
