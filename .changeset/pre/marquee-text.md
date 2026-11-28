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

Marquee text, a new component: one line of text that does not fit its place rests cut with an ellipsis and, while its
trigger holds, moves sideways at a steady pace to show all of it. It moves only while the text overflows, never where
motion is reduced, and is read once, whole.

- Web: `<tanrei-marquee-text>` (`trigger`, `loop`, `speed`, `start-pause`, `end-pause`, `iterations`, `paused`,
  `playback-control`, `play-label`, `pause-label`; event `pausedchange`); React: `MarqueeText`. SwiftUI, Compose,
  Flutter and React Native are planned: their generated tokens carry `comp.marquee-text`, and no component yet.
- `trigger`: `hover-or-focus` (the default), `hover`, `focus` or `always`. Focus is that of the control the line stands
  in; the line is never a focus stop. `loop`: `repeat` (a copy follows a gap behind) or `bounce`.
- The defaults can conflict with WCAG 2.2.2 Pause, Stop, Hide, and the docs say how to meet it: `always` draws no
  playback control unless `playback-control` is set (or the page's own pause control sets `paused`; a debug build
  reports a moving line with neither), and a hover or a focus plays passes until it ends unless `iterations` is set.
- Tokens: `comp.marquee-text` — `speed` (30 px/s), `motion.start-pause` and `motion.end-pause` (1200 ms, fixed: a speed
  and reading times the motion dial does not change), `motion.start-delay` (`sys.motion.role.show-delay`),
  `motion.easing` (`easing.linear`), `motion.return-duration` and `motion.return-easing` (`role.state.default`,
  `easing.state`), `gap`, `fade.extent`, `playback.gap`. No new sys token.
- The product's words gain `marqueePlayLabel` and `marqueePauseLabel` ("Play scrolling text", "Pause scrolling text" in
  the English pack): the carousel's `playLabel` and `pauseLabel` name a slideshow.
- Nothing is removed or renamed.
- Baselines: new images for the marquee text's 7 fixtures, and one per preset — new, not changed.
