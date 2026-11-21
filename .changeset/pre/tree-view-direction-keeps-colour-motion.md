---
'@tanrei/web': patch
---

Tree view: a change of the layout direction draws only an open chevron's turn at once. It turned off every transition
of the open chevrons for that moment, so a change of their colour made in the same task — a theme switched with the
language, a hover — was drawn at once too; that colour now moves over the state's motion as it does at any other time.
