---
'@tanrei/web': minor
'@tanrei/react': minor
---

Segmented button: `disabled` on the whole set, which disables every segment at once (SEG-31). While
`<tanrei-segmented-button disabled>` is set, no pointer, key or `click()` selects or clears a segment or fires
`change`, Tab passes over the set, every segment is drawn from the disabled tokens of its condition (the selected one
still shown selected, the outline and dividers in their own colors), and `value` and `values` are kept — the product
may still set them. The set's own element is exposed as a disabled radio group or group, and each segment as disabled
with its checked or pressed state. A segment is disabled while the set's `disabled` or its own is true; turning the
set's off never enables a segment disabled by itself. The spec gains the fixture `set-disabled`, whose baselines are
still to be recorded. Not built yet on SwiftUI, Jetpack Compose, Flutter and React Native.
