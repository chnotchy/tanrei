---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/tokens-build': minor
'@tanrei/swiftui': minor
'@tanrei/compose': minor
'@tanrei/flutter': minor
'@tanrei/react-native': minor
'@tanrei/docs': patch
---

Scroll area, a new component, and one system-wide choice of how the edge of a box that scrolls is marked while content
lies beyond it.

- Web: `<tanrei-scroll-area>` (`scroll-edge`, `edges`, `label`); React: `ScrollArea`. It keeps the browser's own
  scrolling and scroll bars, and draws no fill, edge or corner of its own. While it scrolls and holds nothing focusable
  it is one focus stop and a region named by `label` (WCAG 2.1.1). SwiftUI, Compose, Flutter and React Native are
  planned: their generated tokens carry `comp.scroll-area` and the new choice, and no component yet.
- New core vocabulary: `sys.behavior.scroll-edge` — `shadow` (the default system's: a band in the color of the surface
  the box stands on, not a fixed shadow color), `fade` (the content itself fades out toward the edge, for a transparent
  surface, a picture or a video behind it), `line` and `blur` (a progressive blur). m3-like draws `line`, cupertino
  `blur`. Its amounts are `sys.scroll-edge.extent` (24) and `sys.scroll-edge.blur.extent` (48), `.radius` (8) and
  `.layers` (4). A platform that cannot blur draws `shadow`; forced colors draw the line in the text color.
- `sys.behavior.divider-visibility` is unchanged: it says when the line of a region that stays in place stands;
  `scroll-edge` says what marks the edge of a box that scrolls.
- Whether content lies beyond an edge is read from an intersection notice on a mark at each end of the content, never
  from a scroll listener or a layout read in a frame of a scroll.
- Tokens: `comp.scroll-area`. `comp.scroll-area.shadow.color` defaults to `sys.color.surface`; set it (on the web, the
  `--tanrei-comp-scroll-area-shadow-color` custom property) to the surface the area stands on.
- Nothing is removed or renamed.
- Baselines: new images for the scroll area's 7 fixtures, and one per preset — new, not changed.
