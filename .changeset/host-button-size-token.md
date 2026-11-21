---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/tokens-build': minor
'@tanrei/swiftui': minor
'@tanrei/compose': minor
'@tanrei/flutter': minor
'@tanrei/react-native': minor
---

**Breaking — a host's own Buttons take their size from a token.** The Buttons a component draws itself were drawn at a
size written into the component; each now takes the size a component token names, next to the variant it already
names. The new tokens (each an index into the core Button sizes, small · medium · large; platforms receive the name):

- `comp.popover.close-button.size`, `comp.side-sheet.close-button.size`, `comp.callout.close-button.size`,
  `comp.bottom-sheet.close-button.size`, `comp.snackbar.close-button.size` (the close and the expand button) — small in
  the default system;
- `comp.image-preview.bar.button.size` (zoom out, zoom in, close) — small; `comp.image-preview.navigation.button.size`
  (previous, next) — medium;
- `comp.carousel.navigation.button.size` (previous, next) — medium;
- `comp.date-time-picker.actions.size` (Cancel and OK) — medium.

The default system and cupertino draw what they drew before. **m3-like** draws the close buttons of the popover, side
sheet, callout and bottom sheet, the image preview's bar controls and the snackbar's close and expand buttons at medium
(40, Material's standard icon button) instead of small (32, Material's extra small), and its snackbar's action as tall
(`comp.snackbar.controls.height` now aliases the medium Button height under m3-like).

What broke: the vocabulary grows by nine tokens (`tokens/vocabulary.lock.json`). A system that set a host's close button
apart from its other icon buttons by restyling it now sets the size token instead. Under m3-like the snackbar is taller
by the difference between the two heights wherever its controls set the bar's height. The m3-like baselines of
`popover/arrow-actions`, `callout/closable-title-actions`, `image-preview/several-rtl`, `side-sheet/modal` and
`snackbar/action-closable` change for that reason; no baseline of the default system changes. The fidelity map of
m3-like measures each host's size against the Material component it reproduces. SwiftUI, Compose, Flutter and React
Native receive the tokens and do not read them yet.
