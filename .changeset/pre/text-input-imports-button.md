---
'@tanrei/web': patch
---

Text input: importing the text input's own module (`@tanrei/web/components/text-input`) defines the Button its date
and time picker button is drawn with. A product that imported that module, or `text-field` or `chip-field`, without
the package's entry got a `<tanrei-button>` that never upgraded: no picker button was drawn, and the field's first
update threw a `TypeError`. The package's entry defines every element, so a page that loads it was not affected.

Every component's module now defines each Tanrei element it draws through its own imports, and the package's tests
check that for every module a product can import.
