---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/react-native': patch
'@tanrei/swiftui': patch
'@tanrei/compose': patch
'@tanrei/flutter': patch
---

Side sheet: the close button is a small tonal Button, and the sheet draws it by default. **Breaking** (a size, a
default and an attribute 0.1.0-next.0 shipped).

Every close button is the same control: an icon-only Button of the small size with the close glyph, tonal unless a
system re-values it. The side sheet's was a medium Button (40 × 40); it is now small (32 × 32 in the default system),
keeps the Button's own minimum target, and answers hover, focus and a press as any Button does.

- `closable` defaults to **true**, in both variants: Material 3's side sheet has a close affordance in its standard and
  modal forms, and a standard sheet has no other way for the person to close it. Give every side sheet a `closeLabel`;
  a sheet without one is reported in debug builds. Turn the button off only where your own control or one of the
  sheet's actions closes it.
- On the web, the `closable` attribute is replaced by its inverse, `not-closable` (an HTML boolean attribute cannot
  default to true), as the chip's `not-removable` is. Markup that wrote `closable` can drop it; markup that relied on
  its absence to draw no close button writes `not-closable`. In React, pass `closable={false}`.
- `comp.side-sheet.close-button.variant` stays tonal; `m3-like` keeps its text pin. The button takes each system's small
  size: 40 under `m3-like`, Material 3's icon button, and 28 under `cupertino` (was 34).

SwiftUI, Compose, Flutter and React Native are lagging and still ship the earlier revision (a medium close button,
`closable` false by default); they owe this change with the rest. Baselines: the side sheet's six fixtures and each
preset's `modal` are recorded again; that is the intended result of this change.
