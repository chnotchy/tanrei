---
'@tanrei/cli': patch
---

Theme Studio (served by `tanrei studio`, and on the documentation site): dragging inside a colour picker or along a
slider no longer makes the page heavy. Every move of the pointer used to compute the whole layer and write the
preview's stylesheet again — about 200 ms each — so a one-second drag across the brand color took the page tens of
seconds to follow. A value is now shown at the next frame, the latest one only; a palette's color (a seed, a hue and
chroma, a fixed tone) is drawn from the palette alone while it moves, and the layer is computed when the picker
closes or the pointer rests. The same final color gives the same theme. A fixed tone's colour field previews while it
is picked and is written when the picker closes, as the seed's is.
