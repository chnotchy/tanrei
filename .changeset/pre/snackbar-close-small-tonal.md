---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/react-native': patch
'@tanrei/swiftui': patch
'@tanrei/compose': patch
'@tanrei/flutter': patch
---

Snackbar: the expand and close buttons are small tonal Buttons in the snackbar's tone. **Breaking**: the snackbar's
own close-button tokens are removed.

Every close button in Tanrei is now one control: an icon-only Button of the small size, tonal unless a system says
otherwise. On a snackbar it stands on a bar that has a color of its own, so the snackbar gives it that bar's text color
as its tone: the glyph is the text color, on a circle of that color made translucent, in all ten forms (on a surface or
inverse, with a status or without). The expand button is drawn the same way, beside it. In the default system the glyph
keeps at least 8.0:1 against its circle at rest and 6.2:1 focused or pressed.

- Web: the expand and close buttons are `<tanrei-button size="small">` elements in the shadow root (their parts
  `expand` and `close` are those Buttons; a Button's own parts are `container` and `icon`). They go from 36 to 32 pixels
  and their glyph from 24 to the small Button's own (16 in the default system). Their hover, focus and press are a
  Button's, laid over the tone; their focus ring is the form's `focus-ring-color`, as before. The expand button's
  `aria-expanded` is on the Button's own native button, which names the text it controls by element.
- The action is as tall as the small Buttons beside it: `comp.snackbar.controls.height` is now the small Button's height
  (`comp.button.container.height.small`, 32 in the default system), down from 36.
- New: `comp.snackbar.close-button.variant` (`--tanrei-comp-snackbar-close-button-variant`), the Button variant of the
  expand and close buttons: tonal in the default system, text (a bare glyph) in the Material and Cupertino presets, as in
  their originals.
- Removed: every `comp.snackbar.close.*` token (the close button's container, content and state-layer colors in each
  form and state; `--tanrei-comp-snackbar-close-*`) and `comp.snackbar.controls.icon.size`
  (`--tanrei-comp-snackbar-controls-icon-size`). A layer that set them sets `comp.snackbar.close-button.variant` and
  each form's `supporting-text.color` and `focus-ring.color`, which the snackbar gives the Buttons as their tone.
- Cupertino draws no hover or focus layer, now also where a layer is computed where it is drawn (a Button given a tone,
  the carousel's layer over an image): `sys.state.hover-state-layer-opacity` and `sys.state.focus-state-layer-opacity`
  are 0 in that preset, and the menubar's open title keeps the fill it had.

SwiftUI, Compose, Flutter and React Native still draw their earlier snackbar and lose the tokens it read; they stay
lagging. Baselines: every web snackbar fixture with a close or an expand button or an action changes (the 32-pixel
row), and the three presets' `action-closable`; this is the intended result of the change.
