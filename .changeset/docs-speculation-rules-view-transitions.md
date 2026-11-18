---
'@tanrei/docs': patch
---

Documentation site: a page asks the browser to load the site's own pages before a link is followed. Its speculation
rules prerender (and, in an engine that only prefetches, fetch) a page of the site once a pointer rests on its link or
presses it; the search's files, the built assets, the files that are not pages (the pages' Markdown, the index for
language models, the sitemap, the pictures), a link that downloads and every other site are left out. The host's
policy allows the rules as any inline script, and each page's own policy names their hash. Moving from one
page to the next is a view transition: the page cross-fades once, at the pace and on the curve of the motion tokens
(`sys.motion.role.state.large`, `sys.motion.easing.state`), and the header and the sidebar stay where they are. While
motion is reduced, a page replaces the last without a transition.
