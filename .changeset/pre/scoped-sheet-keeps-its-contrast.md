---
'@tanrei/web': patch
'@tanrei/cli': patch
---

A product that loads a system's sheet (`@tanrei/web/systems/<id>.css`, or the sheet `tanrei build` writes) shows that
system's colours when its reader asks for more contrast. Under `prefers-contrast: more`, with no
`data-tanrei-contrast` on the root, 27 to 29 custom properties of a `cupertino` or `m3-like` root used to take the
default system's high-contrast colours from `tokens.css`: the roles the system's own high level leaves as they are,
the fill of a checked menu row and of a select's or a combobox's chosen option, and the snackbar's inverse status
colours.

A system's sheet now declares again, in each of its contrast rules, every custom property the default system's
contrast rules declare, at the system's own value. Each system sheet grows by about 6 to 10 KB (under 1%).
