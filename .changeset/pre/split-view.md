---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/react-native': minor
'@tanrei/swiftui': minor
'@tanrei/compose': minor
'@tanrei/flutter': minor
---

Split view (`<tanrei-split-view>`, React `SplitView`): a region divided into two panes, side by side (`axis`
`horizontal`, the default) or one above the other (`vertical`), with a hairline between them and a Handle centred on
it. Built from Handle, which does not change.

- `primary` (`start` or `end`) names the pane that `value` measures and that folds away. `value` is its share of the
  region less the divider, in percent (50), held between `min` and `max` (10 and 90) and between `minSize` and
  `maxSize` in pixels (null: none); where the region is too small for both, the least wins, as `min-width` wins over
  `max-width` in CSS. A region that changes size keeps the share and counts the limits again.
- The Handle is the window splitter pattern's separator: its value is the share in whole percent, its minimum 0 while
  the pane can fold, and it controls the primary pane (`aria-controls`). The arrow keys move the line the way they
  point (in right-to-left too) by `step` (5 % of the region, as react-resizable-panels counts it), Shift and Page Up and
  Page Down by `largeStep` (20 %); Home and End give the primary pane its least and its greatest share.
- `collapsible`: Enter, Space or a press without a drag folds the primary pane away and brings it back where it was
  (`collapsed`), and a drag past half its least share folds it. A folded pane is inert and draws nothing; the line
  stands at the edge. Without `collapsible`, a press moves the line to `resetValue` (50) and the next press back, so two
  sizes are reached without a drag (WCAG 2.5.7).
- A drag and a key are followed at once; a fold, a press and a share or a fold the product sets move by the resize
  roles, at once where reduced motion is asked for.
- Events: `resize` in every frame of a drag, `change` once a person has changed the share, `toggle` once a person has
  folded or restored the pane, each with `{ value, collapsed }`; none for a value the product sets. While a drag lasts,
  no `<iframe>`, `<object>` or `<embed>` in either pane takes the pointer.

New tokens `comp.split-view.*` (the divider's color and width; the resize and collapse durations and their curve, by
role). No sys token is added. The web is the first platform; SwiftUI, Compose, Flutter and React Native are planned.
New baselines: one per Split view fixture, and the `horizontal` fixture under each shipped preset. No existing baseline
changes.
