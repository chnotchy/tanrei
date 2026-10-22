---
'@tanrei/web': minor
---

Button: a component that draws a Button on a colored surface of its own — a status callout, an inverse or status
snackbar — can now give it that surface's content color, a tone, through the internal channel a Button already reads
from the component that places it. On a tone the Button draws its label, icon and state layer in that color and its
container, where its variant draws one at rest (filled, tonal, elevated), in that color at the new
`comp.button.tone.container.opacity` (the quiet selection's 16 % in the default system); outlined and text draw no
container, and an outlined edge takes the same translucent color. Hover, focus and press lay the tone over that
container at the system's state-layer opacities, disabled draws it at the disabled opacities, and the focus ring's
outer stroke is the tone (or the focus color the host gives). Size, shape, elevation, opacity and the answer to a press
stay the Button's own; a toggle and a destructive button keep their looks. A tone is not part of the Button's public
surface: no prop, attribute or custom property gives one, and nothing changes for a Button no host gives a tone to.
No shipped component gives one yet.
