---
'@tanrei/web': patch
---

Combobox: a list closed by focus moving away is reported with the reason `tab` only for the focus move of a Tab press
itself. Before, the combobox remembered a Tab until a timer ran, and a browser may run that timer after later work: a
focus move the product made soon after a Tab — or after a Tab that something cancelled — was reported as `tab` rather
than `focus-out`. The Tab is now forgotten when its focus move is seen, when the key comes up without one, or when
another key goes down. What is resolved when focus leaves, and every other reason, is unchanged.
