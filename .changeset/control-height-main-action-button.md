---
'@tanrei/tokens-build': minor
'@tanrei/web': minor
'@tanrei/react': minor
---

**The large main action button follows the control height.** `comp.main-action-button.container.height.large` is now
ten size units above the large step of the control height ladder (`add` of `sys.control.height.large`), where it was
24 size units on its own: small (the medium step) and medium (the large step) already followed it, so the three sizes
now keep their distances whatever the control height. At the control height of 40 it is 96, as it was, and no token
value of any shipped system changes; m3-like and cupertino pin their own large size.

- New behaviour: MAB-27. `main-action-button.test.ts` draws the three collapsed sizes at the control heights 32, 36 and
  40.
