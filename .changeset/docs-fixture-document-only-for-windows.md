---
'@tanrei/docs': patch
---

Documentation site: a fixture's own document is only what a window of the fixtures' gallery draws.

- A stage no longer has the action that opened its fixture alone in a new tab, and the gallery no longer begins with
  "Every fixture on a page of its own" (in every language).
- `/fixtures/<component>/?id=<fixture>` draws that fixture, as a window shows it; without `?id` it draws nothing (it
  drew every fixture of the component), and `?theme=` is gone (the document takes the site's stored scheme, and a
  window sets its own).
- The sitemap no longer lists the 90 pages under `/fixtures/`; each still says `noindex` and stands outside the site's
  frame.
