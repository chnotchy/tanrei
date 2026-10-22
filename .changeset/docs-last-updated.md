---
'@tanrei/docs': patch
---

Documentation site: every page says when it last changed, under its title and description ("Last updated October 22,
2026", in the page's language). The date is the one the sitemap gives the page — the newest merge into the published
branch of what the page is made from — read from the history once per build, never the time of the build. A
component's page now also changes when its component tokens change (its own group's file and any shared set that
names it), and a page that draws token tables when anything under `tokens/` changes; the sitemap's dates follow.
Broke: a page's `date` front matter and the "Published" line it drew are gone — no page carries a date of its own.
