---
'@tanrei/web': minor
'@tanrei/react': minor
---

**Breaking:** what a form asks of a field is two booleans, `required` and `optional`. The three-valued `requirement`
is gone. There is no alias for it.

| Before | Now |
|---|---|
| `requirement="required"` | `required` |
| `requirement="optional"` | `optional` |
| `requirement="none"` (the default) | neither |

- **Where:** the Field and the Field group, and every component built from one: the text field, number field, select
  field, combobox field, color field, slider field, one-time-code field, chip field, checkbox group and radio group.
  React's `<TextField required />` and `<TextField optional />` type-check; `requirement` no longer does.
- **`required` is HTML's own name.** It exposes the control as required and draws the required mark. The chip field,
  the checkbox group and the radio group still report a missing answer to the form while it is set.
- **`optional` draws the optional tag** and adds `optionalText` to the description.
- **With both set**, the element is required: no optional tag is drawn, and a debug build reports that `optional` is
  ignored. A control is never both.
- **Unknown values:** a value of `requirement` that the element did not know (it behaved as `none` and was reported)
  is no longer possible.
- **Removed types:** `TanreiFieldRequirement`, `TanreiFieldGroupRequirement` and `TanreiRadioGroupRequirement`.
- **Unchanged:** the embedded text input, the file picker and the file upload keep the `required` they had.

Nothing is drawn differently: a field written with `required` draws what `requirement="required"` drew.
