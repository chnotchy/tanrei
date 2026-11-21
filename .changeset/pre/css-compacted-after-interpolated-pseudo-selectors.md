---
'@tanrei/web': patch
---

The build now compacts the whitespace of every rule in a component's styles. A rule whose selector started with an
interpolation and a pseudo-class (`${selector}:not(…) {`, `${selector}::before {`) was read as a custom property
declaration, so it and every rule after it in the same template kept their spaces. File item, one-time code input and
switch ship a little smaller (gzip, bundled alone: file-item 50 bytes, switch 25, one-time-code-input 13,
`@tanrei/web/all` 105). No style changes.
