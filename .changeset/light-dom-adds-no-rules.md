---
'@tanrei/web': patch
---

Skeleton: the element no longer adds style rules to the page. For a placeholder whose `data-lines` the stylesheet
does not read (more than 24 lines, or a value that is not a whole number of at least 1) it used to insert rules into a
sheet of its own and add that sheet to the document; in WebKit each such rule or sheet has the browser build every
rule of the page again. It now writes the lines in the placeholder's own style (`--_skl-lines`, and past 24 lines the
list of shadows the first bar draws, `--_skl-shadows`, which `@tanrei/web/skeleton.css` reads before its own), and
takes them off when the placeholder's `data-lines` becomes a value the stylesheet reads. Nothing a skeleton draws
changes.

Accordion: a size or a variant a design system added is no longer a sheet the element adds to the page. Its private
custom properties (read from that value's tokens, each falling back to the default's) are written in the element's own
style, and taken off when the accordion draws a value of the core again. The name the element asks its root for, to
tell whether the root has `accordion.css`, is now `--_acc-edge-color`, which only the stylesheet sets.

Figure: a variant a design system added is no longer a sheet the element adds to the page. Its fill is written in the
element's own style, and the ground a pattern is drawn on in the stage's (read there, as before, so that a stage scoped
to another system draws that system's); both are taken off for a variant of the core, and from a stage that is no
longer the figure's. The name the element asks its root for is now `--_figure-edge-color`.

Page header: a size a design system added is no longer a rule the element inserts into a sheet of the page. Its private
custom properties are written in the element's own style and taken off for a size of the core. The name the element
asks its root for is now `--_pgh-dot-color`.
