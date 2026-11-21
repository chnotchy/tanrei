---
'@tanrei/web': patch
---

Popover and side sheet: a close button that neither its `close-label` nor the product's words name is reported as the
missing word `closeLabel`, as every other word a component lacks is: a debug build warns once for the page, however
many popovers or sheets lack it, and the warning names `close-label` and `setWords()`. The popover and the side sheet
each made a report of their own for every element before. The button is still drawn and works (POP-13, SSH-5).
