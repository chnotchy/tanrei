---
'@tanrei/docs': patch
---

Documentation site: text for language models and other programs that read the site, generated from each system's
components manifest and the specs, never from the site's pages. `/llms.txt` is the site's index in the llms.txt form:
the components the default system ships first (and its advanced parts), then apart the ones it does not ship — the
segmented button, which it leaves out (with what to use instead), and the FAB menu, which lives in the m3-like layer —
then the shipped design systems, the site's pages and an "Optional" section. Each shipped system has an index of its
own at `/systems/<id>/llms.txt`, which follows that system's manifest. `/components/<name>.md` is every component's
page as Markdown: its availability in each system, its names and status on each platform, its anatomy, props (with the
web attribute), events, slots, items, states, accessibility, every requirement in EARS form with its id, and its tokens
as written. `/llms-full.txt` holds the pages of every component the default system ships, in one file. A component's
page names its Markdown version in its head (`<link rel="alternate" type="text/markdown">`, in every language).
