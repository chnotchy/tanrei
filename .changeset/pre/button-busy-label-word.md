---
'@tanrei/web': patch
---

Button: `busyLabel` is read from the product's words, as the spec says it is. A busy button without its own
`busyLabel` takes the one given once with `setWords({ busyLabel })` (the set of its language first, then the
document's): it is the button's description while it is busy and what it announces when it becomes busy. Before, the
product's word was ignored and such a button said nothing. A busy button that has neither is now the missing word
`busyLabel` (`missingWords()`), and a debug build reports it once for the page, naming `busy-label` and `setWords()`,
as every other missing word is reported. An instance's own `busyLabel` still wins. Nothing drawn changes.
