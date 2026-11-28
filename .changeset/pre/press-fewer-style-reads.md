---
'@tanrei/web': patch
---

A navigation drawer or bar no longer tells every destination what it is again when only words inside it change (a
label's text rewritten by the product): only an element added or taken away has it sync. The documentation's
Appearance panel rewrites the name on the drawer's look button with every choice, and each rewrite had the drawer go
through all of its destinations, in the task of the press. Choosing a theme there in CI's WebKit (40 presses each way):
from the press to the frame after the change, a median of 120 ms instead of 134, presses at or above 150 ms 10 of 40
instead of 16. Nothing is drawn differently.
