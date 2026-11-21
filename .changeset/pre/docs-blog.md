---
'@tanrei/docs': patch
---

Docs site: a blog, with no posts yet. A post is a Markdown file of `apps/docs/src/content/blog/` (English at its
root, every other language in its own folder) and exists only in the languages it is written in: nothing is
translated by a machine, and no language gets a page for a post it does not have. Every language has a list at
`/blog/` (`/ja/blog/`, …) of its own posts, newest first, which names the other languages that have posts and, while
it is empty, says so; and a feed, RSS 2.0, at `/blog/rss.xml`. A post's page says when it was published and who
wrote it, names only its own languages in its head (`hreflang`, `og:locale:alternate`), carries a `BlogPosting` in
its structured data, and has its image of a shared link, its Markdown, its place in the sitemap and its date from git
as every page does. The header's menu of languages leads from a post to that language's list where the post is not
written in it.
