---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/react-native': minor
'@tanrei/swiftui': minor
'@tanrei/compose': minor
'@tanrei/flutter': minor
---

**Field — the error row opens and closes in one motion.** When a field's error text appears, goes or changes its words
and the field's height changes with it, the field now moves to its new height in one motion, in its layout, on the new
tokens `tanrei.comp.field.motion.resize-duration` (the role `sys.motion.role.resize.default`, 300 ms in the default
system) and `resize-easing` (`sys.motion.easing.spatial`). The rows are fixed to the field's top edge: the label, the
control and every line above the error text keep their places, and what stands below the field moves with it at every
frame. An error text that appears fades in over the field's state motion (`comp.field.motion.state-duration`,
`role.state.default`); one that goes is taken away at once and the row closes after it. Before, the row was drawn as it
then was in one frame. New words of the same height, an error text that takes the place of a help of the same height,
reduced motion and the field's first frames still change at once. Every composed field that draws its rows with a Field
follows: the text, number, color, slider, chip, one-time-code, select and combobox fields.

**Breaking:** on the web the supporting row now stands in an always-rendered `.supporting-box` inside the field's
shadow root, and a test that read the field's height, or the place of what stands below it, in the frame after its
error changed now reads it partway through the motion: wait for the field's transitions to finish.
