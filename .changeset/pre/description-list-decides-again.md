---
'@tanrei/web': patch
---

Description list: an inline list chooses between its terms beside and above their values again whenever its width
changes. A list that was measured while it was drawn stacked — connected while it had no width or too little, in a
panel or a tab not shown yet, or a list a page lays out late — read its longest value as its widest term, wrote a
width it was always narrower than, and stayed stacked whatever room it was given later. It now measures its terms in
the two columns whatever it draws at that moment, so it decides from its width as a list that had its width from the
start does. No baseline changes: every fixture is laid out at its width from the start.
