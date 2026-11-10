---
'@tanrei/web': minor
'@tanrei/swiftui': minor
'@tanrei/compose': minor
'@tanrei/flutter': minor
'@tanrei/react-native': minor
'@tanrei/tokens-build': minor
'@tanrei/mcp': patch
'@tanrei/cli': patch
---

**Breaking — the default system's minimum target is 36, for a mouse and for a finger, and nothing a person presses is
drawn below it.** The default system no longer keeps a 48 touch target (or a 44 pointer target) by adding space:
`sys.target.minimum` is 36, and `sys.target.pointer` and `sys.target.touch` alias it, so one value sets all three. A
product that follows a platform guideline sets `touch` or `pointer` above the minimum in its layer; the build refuses
either below it. The m3-like and cupertino presets keep the targets they had (48 / 44, and their own minimums).

What moves in the default system (and in the root layer, which shares these values):

- **Held at 36** (from 32): the small Button, Button with menu, Copy button and segmented button; the small stacked
  input boxes (text input, select, combobox, number input, color input and their fields); the medium chip; small Tabs;
  small Pagination; the snackbar's controls; the compact rows of the tree view, navigation drawer (and its collapsed
  column), table of contents, menu, select, combobox, search and list. Their block paddings take half of what the box
  gained (a small Button has 8 above and below its label, where it had 6), and so do the small Button with menu's
  trailing half, the medium chip's avatar and remove ends and the compact collapsed drawer cell, which stay square and
  concentric with the taller box. The space between a field's clear button and the chevron or button after it
  (`comp.combobox.container.action-gap`, which the select and the text input alias) grows from 4 to 6 the same way, so
  the 36 clear button meets its neighbour instead of overlapping it.
- **Hit areas** shrink from 44 (pointer) and 48 (touch) to 36 everywhere: a control that is drawn at least 36 reaches
  nothing past what it draws. A mark keeps its size and still reaches the target (a checkbox's and a radio button's 40
  containers already hold it; a small chip, 24, reaches 36).
- **Spaces that existed only to keep a 48 target whole are 0:** the standard button group's gap, the docked toolbar's
  gap and the search bar's gap (each `sys.target.touch` less a small Button, never below 0), so their items now touch.
  The radio button's option row is its 40 container high (it was 48), and the carousel's controls row is 40, the
  height of its controls (it was 48).
- The invariant that a stacked input box is as tall as a Button of the same size is now the general rule it was an
  instance of: in the default system every height that reads a step of `sys.control.height` is as tall as that step,
  or as `sys.target.minimum` where it is floored.
- Web: the app bar's brand cell is as large as the navigation item's (the larger of the target and a medium icon-only
  Button), so its symbol still stands where the icon does; a list that is dragged near its edge reads the width of its
  scrolling band from `sys.target.touch` in pixels, whatever unit the token is written in (it read `2.25rem` as 2.25).

Every web baseline of the default system that shows one of these heights, hit areas or gaps is re-recorded; the
presets' baselines do not move. `dial.size.unit` no longer scales any target: it scales control heights and glyphs.
