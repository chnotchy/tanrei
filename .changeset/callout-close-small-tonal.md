---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/react-native': patch
'@tanrei/swiftui': patch
'@tanrei/compose': patch
'@tanrei/flutter': patch
---

Callout: the close button is a small tonal Button. **Breaking**: the callout's own close-button tokens, which
0.1.0-next.0 shipped, are removed.

Every close button is the same control: an icon-only Button of the small size with the close glyph, in the variant its
host names. The callout's close button was a button of its own, drawn from 72 color tokens of the callout's; it is now
a `<tanrei-button size="small">` in the variant `comp.callout.close-button.variant` names — tonal in the default
system — that reads Button's own tokens and answers hover, focus and a press as every Button does. On a tonal callout it
is drawn in the callout's own text color (the body color of its status), as a translucent circle of that color with the
glyph in it, so that it shows on the fill of every status; its glyph keeps at least 6:1 against it in every status and
color scheme of the default system. On an outlined callout, which has no fill, it is the tonal Button as it is anywhere
else.

- Removed tokens: `comp.callout.close.*` (the container, content and state-layer colors of six forms, at rest and
  hovered, focused and pressed), `comp.callout.focus-ring.color.*` and `comp.callout.<status>.focus-ring.color.*`,
  `comp.callout.controls.height`, `.controls.shape`, `.controls.icon.size`, `comp.callout.motion.*` and
  `comp.callout.hovered.opacity`, `.focused.opacity`, `.pressed.opacity` — and their `--tanrei-comp-callout-*` custom
  properties. A layer that set one of them sets `comp.callout.close-button.variant`, or the callout's body colors, or
  Button's tokens instead.
- New token: `comp.callout.close-button.variant` (tonal). `m3-like` (and so `m3-expressive-like`) and `cupertino` set
  it to text, keeping the bare glyph they drew. The close button now takes each system's small Button size: 28 under
  `cupertino` and 40 under `m3-expressive-like`, where it was 32, and its glyph the small Button's.
- `cupertino` sets the hover and focus state-layer opacities to 0, as its rules already kept every container at rest;
  a Button on a colored surface and a carousel item over its image now draw no hover or focus layer there either. Its
  open menu bar title keeps its fill.
- The `close` CSS part is now `close-button`, as the popover's and the side sheet's are. The callout itself has no
  states.

SwiftUI, Compose, Flutter and React Native have no callout yet; they lose only the tokens. Baselines: the default
system's closable callouts (`closable`, `closable-outlined-info`, `closable-title-actions`, `closable-actions-rtl`,
`long-title`) and each preset's `closable-title-actions` are recorded again; that is the intended result of this change.
