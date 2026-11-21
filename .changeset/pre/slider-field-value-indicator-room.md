---
'@tanrei/web': patch
---

Slider field, and a Field around a Slider: a value indicator that is always shown (`value-indicator="always"`) no
longer lies over the label row. The Field put the track directly below the label row's gap, and the indicator, which
stands above the handle in the top layer, reached 14px up into the label row in the default system. A horizontal
slider whose indicator is always shown now tells the Field around it how far the indicator reaches above its box: half
the handle's height, the offset and the indicator's height, less half the slider's thickness (22px in the default
system, at every size). The Field keeps that room between the label row's gap and the slider, so the indicator now
sits 8px below the label row and 8px above the handle, over neither. With no label row, the room is at the top of
the field. The room stays while the slider is disabled, so disabling it moves nothing. A slider whose indicator is
shown only while it is pressed or focused (`active`) or never (`none`), a vertical slider, and a slider standing
alone keep the layout they had. The cloak (`cloak.css`) holds the taller field before it is defined.

Specs: new sentences FLD-34 (the Field keeps the room its control asks for above it), SLD-30 (the slider says how far
an always-shown indicator reaches) and SLF-15 (the slider field's indicator lies over neither the label row nor the
handle); FLD-1, SLD-17 and SLF-1 refer to them.

Baselines that move, because those fields are now 22px taller with the slider 22px lower: `field/slider-value-indicator`
and `slider-field/value-indicator`. No other baseline moves: the standalone slider's `value-indicator` keeps its
layout, and no preset baseline shows an always-shown indicator.
