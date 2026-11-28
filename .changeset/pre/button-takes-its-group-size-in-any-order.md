---
'@tanrei/web': patch
---

A button is drawn at the size its button group or toolbar sets whichever of their modules arrives first. A button
defined before its group or toolbar drew at its own size (medium) until the container was defined, then changed size:
a small group in the default system went from 36 to 28 px high. A component that takes its size from a container (the
size cascade) now reads the `size` attribute of a button group, a toolbar or a list that is not defined yet, as the
container will provide it once it is; a size of the component's own still wins, and the nearest container that sets
one still decides.

The cloak (`@tanrei/web/cloak.css`) holds a button that is not defined yet in a button group or a toolbar that is
defined at the size the container sets, and in a connected group at the target and the outer padding the group gives
it, so a connected row no longer grows when its buttons are defined.
