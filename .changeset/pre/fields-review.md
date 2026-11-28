---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/react-native': minor
'@tanrei/swiftui': minor
'@tanrei/compose': minor
'@tanrei/flutter': minor
---

Fields, after the web review.

- **The error text takes the help's place.** While a field is in error its error text now stands where its help stood,
  as the supporting row's first line, so a form in error is no taller than at rest; the help comes back when the error
  goes, and the control's description follows what is drawn. Where it stands is a new choice of kind,
  `comp.field.error-text.placement` (`replace`, the default, or `append`, which keeps the help and draws the error text
  below it, as before). Every shipped system uses `replace`, as Material and Carbon do; a layer that imitates a system
  that keeps the help in view (GOV.UK) sets `append`. Vocabulary: one new token.
- **A disabled field's requirement tag fades with its label.** The Tag has a `disabled` prop that draws it as part of
  something disabled, from new per-look disabled tokens (`comp.tag.<variant>.disabled.*`, an outlined tag keeping no
  fill); it changes nothing else and exposes no state. A field and a field group set it on their requirement tag while
  they are disabled. Vocabulary: the Tag's disabled state tokens.
- **Fields in a row wrap.** In a horizontal field group of fields, each field is never narrower than the new
  `comp.field-group.field.min-width` (144, from the size scale): the next field moves to a line of its own instead of
  being squeezed. Vocabulary: one new token.
- **`small` text input.** The text input, the combobox, the number input and the color input (and the text, combobox,
  number and color fields) take `size="small"`: the box's 40-high step the small select already had, its text 14, for a
  bar, a toolbar or a dense row of controls. The hit area still meets the minimum target.
- **The optional word in a floating label.** A filled or outlined text input framed by a Field whose requirement is
  optional draws `optionalText` after its floating label, resting and floated with it, as a stacked field draws the
  optional tag. The field no longer reports that it cannot.
- **Date and time segments keep one width.** Each segment is as wide as the wider of its placeholder and its widest
  value, whatever it holds, so the row no longer moves when the first digit is typed.
- **The grip changes the width without a drag.** On a manually resized field that resizes both ways, a click, Enter
  or Space on the grip also makes the field as wide as its place, and the next one gives back its width (WCAG 2.5.7).
- **A prefix and its value read as one string right to left.** Beside a prefix, the value (and the placeholder) of an
  email, URL, phone, number or password input stands against the prefix, at the start of its run, in every layout
  direction: `https://` and the address no longer stand at the two ends of the field.

Baselines recorded again on Linux, each the intended result of one of the changes above: the fields with help and an
error text (the error text in the help's place), the disabled fields and field groups with a requirement tag (the tag
faded), the date and time fields (segment widths), the right-to-left inputs with a prefix (the value beside it), and the
new fixtures (the Tag's disabled fixtures, the small inputs, the optional word in an outlined field). The native
platforms are not built for these yet; their specs say so.
