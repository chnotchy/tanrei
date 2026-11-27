---
'@tanrei/web': patch
'@tanrei/tokens-build': patch
'@tanrei/react-native': patch
'@tanrei/compose': patch
'@tanrei/flutter': patch
'@tanrei/swiftui': patch
---

Under the cupertino preset, three components drew taller than their own height tokens. They now draw at those heights.

- Keyboard shortcut: a key cap's edge is drawn inside the cap, as KBS-6 says, in every system. Before, the edge's
  widths were added to the legend's line: a cupertino cap (1 on top, 2 at the bottom, a 22 line) was 24.98 tall where
  its height is 24. Now a cap is its height tall, or one line of its legend where that is taller (KBS-15), plus only
  the difference between the bottom edge and the top edge. That difference keeps the legend centred on the face, as
  before. The default system draws no edge and m3-like's caps already fit, so neither changes.
- Navigation bar (cupertino): the destination's title is set in Caption 2 (`caption-small`), not Caption 1. The 32 glyph
  box, the 2 gap and Caption 1's 16 line made 50, so the bar was 49.98 where its height is 49. Now the bar is 49.
- Segmented button (cupertino): the segments' block padding is 4 at medium (it was 6) and 2 at small (it was 4). The
  segments stand 2 inside the track, so with the old padding one Footnote line did not fit: the medium set was 33.98
  where its height is 32, and a small set was 30 where its height is 28. The medium set is now 32 with 28-high
  segments, and the small set is 28.

The token build's check that a control height holds its padding and one label line now counts a set's inset
(`set.padding`) above and below. Before, the check missed the segmented button's overflow.

This change is meant to move three cupertino baselines, and they have to be recorded again:
`keyboard-shortcut/keycap-standard`, `navigation-bar/badges` and `segmented-button/icons`.
