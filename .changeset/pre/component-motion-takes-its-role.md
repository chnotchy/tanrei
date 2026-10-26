---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/react-native': minor
'@tanrei/swiftui': minor
'@tanrei/compose': minor
'@tanrei/flutter': minor
---

**Component motion takes its role.** Every component duration and curve that a motion role describes now aliases that
role (`sys.motion.role.*`, `sys.motion.easing.{enter,exit,state,spatial}`) instead of a step of the duration scale, a
spring or a curve of the scale. A product re-times a kind of change — every state change of a small control, every
sheet's entrance — in one line of its layer. **Breaking**: the default system's motion changes, and five component
token names are replaced.

- **The default system (and cupertino, which takes its motion) is timed by role**: a change of state takes 200 ms on a
  small control and 250 ms on a medium control or a large surface (was 150 ms everywhere); a check mark or a radio
  button's dot 250 ms; a switch's handle, the tabs' and the navigation bar's indicator, a slider's handle and the time
  picker's dial travel over 250 ms on the standard curve (were 350–500 ms on a spring that overshoots), and so do a
  list's items changing place; a text field and the copy button change size over 300 ms, the main action button, the
  drawer's width and an expanding snackbar over 400; an accordion, a tree, a table of contents and a drawer's group
  open over 400 ms; the search view and the docked picker appear over 300 ms and leave over 250; a tooltip appears
  over 250 ms and leaves over 200; dialogs, the image preview and the modal picker over 350 / 300; sheets and the modal
  drawer over 400 / 350; the snackbar over 350 / 300. Surfaces enter on the standard curve and leave on the
  accelerating one. The ripple (450 ms) and the loading indicator's and the skeleton's wait (300 ms) are unchanged.
- **m3-like and m3-expressive-like draw exactly what they drew**: their roles are Material 3's durations and curves, and
  where a component's role holds another value in the preset, the preset pins that component token to the value it
  had, with its reason (25 tokens: the app bar's scroll change, the tabs' indicator and the tab view's switch, the
  selection curves of the checkbox, the radio button, the chip and the segmented button, the snackbar's and the
  tooltip's exit curve, among others).
- **Replaced token names** (the state duration follows the size): `comp.button.motion.state-duration`,
  `comp.main-action-button.motion.state-duration` and `comp.segmented-button.motion.state-duration` become
  `….state-duration.{small,medium,large}`; `comp.chip.motion.state-duration` becomes `….state-duration.{small,medium}`;
  `comp.input-box.motion.state-duration` (the text input, select, combobox, number input and color input) becomes
  `….state-duration.{small,medium,large}`. Small reads `role.state.compact` (200 ms), the others `role.state.default`
  (250 ms; Button's, the main action button's and the segmented button's large read `role.state.large`, also 250 ms). A
  layer that set the single token sets the size's. The CSS custom properties follow:
  `--tanrei-comp-button-motion-state-duration-small` and so on.
- Component tokens that no role describes keep their values: cycles (a loading indicator's turn, a skeleton's pulse, a
  progress bar's indeterminate cycle), a progress bar moving to its value, the calendar's and the image preview's paging,
  the carousel's scroll, the image preview's zoom, the time picker's wheel, the FAB menu's open and close (Material's),
  and every delay and interval.
- The scrim of a modal layer, a dialog, the image preview and the modal picker share the modal role: their enter and
  exit tokens still alias the modal layer's, so one value re-times them all. A sheet and the modal drawer, whose scrim
  is drawn with their own tokens, take the sheet's role, and no longer follow the modal layer's motion tokens (the
  modal layer's spec and page say so).

SwiftUI, Compose, Flutter and React Native: their generated tokens carry the new values, and the five state durations
move to each component's size members. Baselines are unchanged: the fixtures are drawn at rest.
