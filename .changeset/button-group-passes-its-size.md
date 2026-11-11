---
'@tanrei/web': minor
'@tanrei/react': minor
---

Button group: a new `size` (`small`, `medium`, `large`). Set on the group, it is the size of every Button in it that
sets none of its own, so a row of small actions is written once: `<tanrei-button-group size="small">`. Only a size set
on the group is passed down; a group that sets none leaves its Buttons at their own default. A Button's own `size`
always wins, `medium` included.

Button: a Button without a `size` is drawn at the size its nearest container sets, and at `medium` where none does. A
size it does not have is taken as its nearest (`extra-small` as `small`, `extra-large` as `large`). Setting `size` to
any value, `medium` included, makes it the Button's own; removing the attribute (or setting the property to `null`)
gives it back. Reading `size` while none is set still gives `medium`.

This is the first container of the size cascade: the system's density moves every height, a container's size picks
the step, and a component's own size wins. The density tests now hold the Button at densities 0.75, 1 and 1.5 and
minimum targets 24, 36 and 48.

A page's own style that selects `tanrei-button[size='small']` does not match a Button that takes its size from a group:
that Button has no `size` attribute.

New fixture: `button-group/small`. Nothing that was drawn before moves.
