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
