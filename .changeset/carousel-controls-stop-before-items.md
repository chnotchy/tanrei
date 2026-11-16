---
'@tanrei/web': patch
---

Carousel: the indicator and the playback control no longer reach up over the row of items. Where the controls row is
taller than the controls (`comp.carousel.controls.height` follows `sys.target.touch`, so 48 over 40 under the m3-like
preset), the indicator's hit area was as tall as the whole controls row, and the playback control's centred target
reached as far. Both touched the items above, so a press just below an item went to a control. Both now stop halfway
across the space the controls row leaves above them. The indicator still reaches the bottom edge of the row. CRL-37
now says this. Nothing is drawn differently.
