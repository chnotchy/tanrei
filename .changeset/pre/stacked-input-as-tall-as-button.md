---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/tokens-build': minor
'@tanrei/react-native': patch
'@tanrei/swiftui': patch
'@tanrei/compose': patch
'@tanrei/flutter': patch
---

**Breaking — a stacked input box is as tall as a Button of the same size.** An input and a Button set side by side in
one row (a search box and its button, a code and Apply, a quantity and Add) now stand as tall as each other at one size
name. The stacked box — the one that draws no label inside it, and the only look the default system ships — is 32 / 40
/ 56 high at small, medium and large, where it was 40 / 48 / 56: the Button's heights. Filled and outlined boxes, which
float their label inside them, keep 40 / 48 / 56. This holds for every box drawn from `comp.input-box`: the text input,
the select, the combobox, the number input and the color input, and every field and composite that frames one (text,
select, combobox, number and color fields, the chip field, the field group, the search field).

- New tokens: `comp.input-box.stacked.container.height.{small,medium,large}`, which alias
  `comp.button.container.height.*` in the default system, and
  `comp.input-box.stacked.container.padding-block.{small,medium,large}` (4 / 6 / 14), so that a line of the size's
  text fits in the new heights. Both are members of the box's size axis. `comp.input-box.container.height.*` and
  `.container.padding-block.*` are now read by the filled and outlined boxes only. A layer that set those to resize its
  stacked boxes sets the stacked tokens instead.
- The token build (`pnpm validate`) refuses a default system whose stacked heights are not its Button's.
- `cupertino` and `m3-like` (and so `m3-expressive-like`) set the stacked tokens to their own `container.*` values:
  their fields keep the heights they had, and their pictures do not move.
- The hit area does not shrink: where a box is shorter than the minimum target, its target still reaches it.
- A small number input draws its steppers as small Buttons (they were medium at every size, NMI-25), so that it is
  as tall as a small text input beside it; at medium and large they stay medium Buttons.

The specs say it in `TXI-16`, `TXI-51`, `TXI-68`, `SEL-1`, `SEL-65`, `CMB-1`, `CMB-63`, `NMI-1`, `NMI-25`, `NMI-47`, `CLI-1` and
`CLI-45`, and in each `size` description. SwiftUI, Compose, Flutter and React Native receive the new tokens only; their
boxes are not built yet. Baselines: every default-system picture of a stacked small or medium box is recorded again
(the five boxes, their fields, the field and field group, the chip field and the search field); that is the intended
result of this change. The presets' pictures are unchanged.
