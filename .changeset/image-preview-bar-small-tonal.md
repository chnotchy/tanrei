---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/react-native': patch
'@tanrei/swiftui': patch
'@tanrei/compose': patch
'@tanrei/flutter': patch
---

Image preview: the bar's zoom out, zoom in and close controls are small tonal Buttons. **Breaking** (a look and a size
0.1.0-next.0 shipped): they were medium text Buttons.

Every close button is the same control: an icon-only Button of the small size with the close glyph, tonal unless a
system re-values it. The image preview's close control is drawn so, and the zoom controls beside it the same way, so
that one row of the same kind of control is drawn one way. Each is 32 × 32 in the default system (was 40), keeps the
Button's own minimum target, and answers hover, focus and a press as any Button does. Previous and next are not close
controls and stay medium.

- Changed token: `comp.image-preview.bar.button.variant` = tonal (was text).
- Changed token: `comp.image-preview.bar.gap` = `sys.space.space150`, 12 (was 4), so that a 32 control and the gap still
  make the 44 of `sys.target.pointer` and each whole target stays apart from the next.
- `m3-like` and `cupertino` set `comp.image-preview.bar.button.variant` to text, the look
  they had. The controls still take each system's small Button size (32 under `m3-like`, where they were 40), which a
  pin cannot keep.

SwiftUI, Compose, Flutter and React Native have no image preview yet; their generated tokens carry the new values.
Baselines: every image preview fixture draws the bar and is recorded again, in the default system and under each
preset; that is the intended result of this change.
