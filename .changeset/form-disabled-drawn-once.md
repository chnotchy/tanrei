---
'@tanrei/web': patch
---

Form-associated elements other than the Button: the platform's word that the element is disabled no longer draws it
a second time. They read a fieldset's part of their disabled state from the platform where they render (`:disabled`,
less their own attribute), and draw again only when the platform's word changes what was drawn, so the word for their
own reflected `disabled` attribute draws nothing. A change of `disabled` — their own, or a fieldset's around them — is
now drawn in one update instead of two by the text, number, color and one-time-code inputs and fields, the select and
select field, the combobox and combobox field, the chip field, the embedded text input, the chat composer, the search,
the file upload, the checkbox, the checkbox group, the switch, the slider and the slider field; the radio button and the
radio group drew three times for some changes and now draw at most twice. A select and a combobox no longer read their
options again when an attribute of their own changes.
