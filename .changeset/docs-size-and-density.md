---
'@tanrei/docs': patch
---

Documentation site: a Foundations page on size and density, in the six languages. It says what `dial.density` moves
and what it leaves alone, shows the control height ladder (`sys.control.height.*`) and the Button's heights at
densities 0.75, 0.9, 1, 1.25 and 1.5 — evaluated by the token engine from the tokens' own rules, with the height the
minimum target holds and the one the rule gives before it — what each shipped system sets for `sys.target.minimum`,
`touch` and `pointer`, what the build checks, how a layer sets the two values, and how a button group's `size` is
passed to the Buttons it holds. The Accessibility page's target section now says what the components do: nothing
pressable drawn under `sys.target.minimum` (36 in the default system), and a mark that is smaller extending its hit
area to the touch and pointer targets; it said a small button was 32 high and answered 48 for touch and 44 for a
pointer. The dial table of Design systems no longer says `dial.size.unit` moves hit targets, and the English page counts
eight dials, as its table does.
