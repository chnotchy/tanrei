---
'@tanrei/docs': patch
---

**Docs: every page's Markdown leads to the indexes for language models.** Each page's `<path>.md` now has one quoted
sentence between its front matter and its title that links to `/llms.txt` (the index of every page) and
`/llms-full.txt` (the default system's components in one file), so a program handed a single page can find the rest.
The sentence is in the language of the page's words, in the six languages, and a translation says the indexes are in
English. It is in the Markdown only; the HTML pages are unchanged.
