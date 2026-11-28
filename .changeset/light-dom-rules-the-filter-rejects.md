---
'@tanrei/web': patch
---

Description list and prose: two rules of their light-DOM stylesheets are written so that a browser can rule them out
for an element at once, and they match the same elements as before. In Firefox a page with the description list's
stylesheet no longer restyles everything in `<body>` each time a script adds an element to `<html>` or takes one off.
On the docs Button page (about 10,000 elements) in Firefox, adding and removing one element on `<html>` went from
about 140 ms to 2 ms, and the load event came about 0.2–0.4 s sooner. WebKit and Chromium were unchanged.

- `description-list.css`: the rule that takes the space off above the first group of a stacked or stat list with one
  column was nested under a rule of two selectors. A browser cannot read the list's ancestors out of such a nested
  rule, so it asked `:first-child` of every `div` of the page. Firefox then marked each div's parent, `<html>` included,
  and any child added to or taken from `<html>` (a probe that measures the page, an element a browser extension adds)
  restyled the whole `<body>`.
- `prose.css`: the rule that places a task item's checkbox is two selectors instead of one list of two. A browser now
  asks `:first-child` only of an input inside a list item, not of every input of the page.

`test/keyed-selectors.test.mjs` now refuses a light-DOM rule whose last compound names no element, unless it is
listed with its reason. It also refuses a rule that asks where an element stands among its siblings without a named
ancestor that a browser can reject the element by.
