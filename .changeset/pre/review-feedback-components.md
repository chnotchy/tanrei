---
'@tanrei/web': patch
'@tanrei/react': patch
'@tanrei/react-native': patch
'@tanrei/swiftui': patch
'@tanrei/compose': patch
'@tanrei/flutter': patch
---

File item, snackbar, tooltip, empty state and the fixtures of the low-emphasis fills (web; the native platforms stay
lagging and their notes name what they owe).

- File item: the retry and remove actions stand far enough apart that each hit area reaches the minimum target in force
  (`comp.file-item.action.gap`, or twice what `sys.target` exceeds `action.size` by where that is more); the action at
  the row's end still reaches no further than the row. Where the glyph and the actions would leave a row's texts less
  than half its width (a narrow screen, enlarged text), the actions stand on a line of their own below the texts, at the
  row's end, and the name takes the whole width. A disabled row action keeps its resting ground, none, as a tile's
  keeps its disc: only the glyph fades. `video/mp2t` no longer decides the format, since it is guessed from `.ts`, which
  TypeScript shares: `index.ts` draws the code glyph.
- Snackbar: with the action on its own row and no control after the text, the text ends
  `container.padding-inline-end` (16) from the end edge, as in a snackbar without controls.
- Tooltip: a container larger than the room on its side is kept `comp.tooltip.window-margin` inside the window, as the
  spec says, over its anchor; only a window smaller than the tooltip gives up the margin, at its bottom and end edges.
- Empty state: a title given as text (`headline`) is exposed as a heading, because it is drawn as one; the new `level`
  prop (1 to 6, default 2) gives its level. A title in the `title` slot keeps the role and level the product gave it.
- Fixtures may name the surface role their stage is painted in (`surface` in `specs/component.schema.json`); the
  progress indicator, the slider and the skeleton each gain one on `surface-container-highest`, a filled card's tone.
- Slider: SLD-17's verify no longer claims the value indicator clears the round state layer; it may lie over it, and
  the focus ring stays clear of it.
- Docs: the radio group says how to show an unanswered required group's error in the product's words (`novalidate` on
  the form, then `error` and `errorText`); the progress indicator, slider and skeleton say to point their track or fill
  at a stronger role in a layer on the highest container tone.

Intended web baseline changes, re-recorded for this: the file item's `row-disabled` (no ground under its actions) and
every fixture with both actions (`row-error-retryable`, `tile-error-retryable` and the rows that draw retry), where the
actions now stand farther apart; the snackbar's `action-own-row`; the tooltip fixtures placed near the window's edge;
and new baselines for `linear-on-container-highest`, `continuous-on-container-highest` and
`text-lines-on-container-highest`.
