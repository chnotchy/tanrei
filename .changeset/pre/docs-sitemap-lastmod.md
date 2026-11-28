---
'@tanrei/docs': patch
---

Docs site: every page of the sitemap says when it last changed (`<lastmod>`), as sitemaps.org defines it and as
search engines read it — only while it is accurate and follows a change to what the page says. The date is the newest
commit, along the first parents of the branch the site is built from, of the page's own source in its language (the
English page where a translation does not exist yet) and, for a component's page, of its spec; never the time of the
build. Each sitemap in the index is dated by its newest page. The history has to be there: the build stops in a
shallow clone instead of giving every page the date of its last commit, and the docs' checkouts in CI and in the
deployment fetch the whole history (`fetch-depth: 0`).
