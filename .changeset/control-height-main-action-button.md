---
'@tanrei/tokens-build': minor
'@tanrei/web': minor
'@tanrei/react': minor
---

**The large main action button follows the control height.** `comp.main-action-button.container.height.large` is now
a third above the extra-large step of the control height ladder, on the size unit's grid (`mul` of
`sys.control.height.extra-large` by 1.3333, rounded to `dial.size.unit`), where it was 24 size units on its own: small
(the medium step) and medium (the large step) already followed it, so the three sizes move together with the control
height, and a size a layer adds from large still scales it. At the control height of 40 it is 96, as it was; m3-like
and cupertino pin their own large size.

- New behaviour: MAB-27. `main-action-button.test.ts` draws the three collapsed sizes at the control heights 32, 36 and
  40.
