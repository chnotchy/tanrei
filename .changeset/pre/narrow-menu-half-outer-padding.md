---
'@tanrei/web': patch
---

Button with menu: a narrow trailing half now takes the padding at its rounded outer end
(`comp.button-with-menu.container.outer-inset`), as the default width and the leading half already did. A slim half's
chevron sits nearer the curve, so without it the chevron looked pushed toward the end. In the default system the narrow
half is 4 wider (32 / 36 / 36 at small, medium and large) and its chevron stays 16 from the seam; a system that sets
the outer padding to 0 (cupertino and the m3 presets) draws it as before, exactly a narrow icon-only Button's width. The
web baselines of the eight narrow fixtures are re-recorded for this change.
