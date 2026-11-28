---
'@tanrei/docs': patch
---

Docs site: every page, in all six languages, has a Markdown version beside it — `<path>.md` for the page at
`<path>/` (`/foundations/color.md`, `/ja/components/button.md`), and `index.md` for each language's home page — and
names it in its head (`<link rel="alternate" type="text/markdown">`). The page that was not found has none. The file is
written from the built page when the site is built, from the part the site's search reads, so it says what the page
says in the page's own language: headings, prose, lists, tables as GFM tables, code blocks as fenced blocks with their
language, notices as quotes with GitHub's alert mark, each tab of a set under its label, link cards as a list. The
examples the page draws are left out. It opens with a front matter — `title`, `description`, `url` and
`last_updated`, which is the date the sitemap gives the page, read once from the same history — then the title and
the description.

A component's page holds its own prose and, in its Specs section, the component's current spec as Markdown in place of
the tables drawn from it (in English, as the spec is written in every language): `/components/<name>.md` was the spec
alone and is now the whole page. `/llms-full.txt` still holds the specs alone. The head's link of a translated
component page now names that language's file, without `hreflang="en"`.
