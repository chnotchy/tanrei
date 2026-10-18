---
'@tanrei/web': minor
'@tanrei/react': minor
---

`required`, HTML's name for "the form asks for an answer", works on every field. A form that writes the platform's
own word no longer needs Tanrei's.

- **The Field and the Field group take `required`.** So does every component built from one: the text field, the
  number field, the select field, the combobox field, the color field, the slider field, the one-time-code field, the
  chip field, the checkbox group and the radio group.
  - `<tanrei-text-field label="Email" required>` is the same as `requirement="required"`: the same mark, the same
    required state, the same validation.
  - `required` wins over any other `requirement`. `required` false leaves `requirement` alone.
  - In React, `<TextField required />` now type-checks.
- **The embedded text input, the file picker and the file upload take `requirement`**, in a Field's words: `required`
  behaves as `required` true. `optional` and `none` change nothing, because these controls draw no mark of their own.
  An unknown value behaves as `none` and is reported in a debug build.

Nothing that was written before changes what it draws.
