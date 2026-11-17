---
'@tanrei/web': patch
---

Snackbar, callout and bottom sheet: a close button that neither its `close-label` nor the product's words name is
reported as the missing word `closeLabel`, and a bottom sheet's drag handle that neither `handle-label` nor the
product's words name as the missing word `handleLabel`, as every other word a component lacks is: a debug build warns
once for the page, however many elements lack it, the warning names the attribute and `setWords()`, and
`missingWords()` lists the key. Each element made a report of its own before. The button and the handle are still drawn
and work (SNK-20, CLO-31, BSH-29, BSH-11).
