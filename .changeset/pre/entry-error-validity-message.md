---
'@tanrei/web': patch
---

Text input and number input: while an entry error lasts and neither the input's own words for it (`invalidText`,
`unavailableText`) nor a Field gives a message, the form's constraint validation is told the input's name, else what the
person entered — the date or time row as drawn, or the number input's text. The text input told it `invalid` or
`unavailable`, the name of the reason, which a browser shows in its validation bubble; the number input told it the
browser's message for a missing value, which says something other than what is wrong (TXI-30, NMI-21).
