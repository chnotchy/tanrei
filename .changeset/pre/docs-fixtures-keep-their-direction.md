---
'@tanrei/docs': patch
---

Documentation site: the Specs tab's tests now hold that every fixture that names a direction is drawn in it, whatever
the component — its stage carries the direction as `dir`, and in the browser each stage drawn in the page is drawn in
the direction its fixture names, or else in the page's. The Select's right-to-left fixtures (`open-rtl`,
`long-value-rtl`, `outlined-rtl`) are drawn right to left on its page, as on the Select field's. Nothing the site draws
changes, and no baseline changes.
