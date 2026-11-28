---
'@tanrei/web': patch
---

Slider (and Slider field, and a Field around a Slider): what an ancestor's `zoom` and `transform` do to the value
indicator in the top layer is now a requirement of the spec (SLD-29), tested in Chromium, Firefox and WebKit. Under an
ancestor's `zoom` the indicator is magnified with the content: twice as large under `zoom: 2`, twice the offset from its
handle, centred on it and kept inside the window. Under an ancestor's `transform` it keeps its own size, as every
overlay in the top layer does, and still stands the offset above the handle where the handle is drawn, centred on it.
The behaviour is unchanged; only the earlier note that a transform no longer scales it left out that zoom does.
