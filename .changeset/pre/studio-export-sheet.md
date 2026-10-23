---
'@tanrei/studio': minor
'@tanrei/docs': minor
---

**Theme Studio: Export, and the banner of a shared layer.**

- **Export**, in the bar, opens a side sheet. Its first line says whether the schema, the token engine and the build's
  checks accept the file (problems stop the download; warnings lead to Accessibility). A layer on an example of the
  theme gallery (m3-like, cupertino, m3-expressive-like) **depends on the example** by default, and can instead
  **write every value**: the file then holds what the example gives as well as what you changed, extends what the
  example extends, and builds to the same stylesheet, documents and warnings as the file that depends on it. A component
  that lives in the example (the FAB menu) is still included from it. Three tabs follow: **File** (copy, or download as
  `<id>.system.json`), **CSS** (the declarations of the stylesheet `tanrei build` writes for the web that differ from
  the base system's, as the build writes them, and the whole `<id>.css` to download) and **What next** (the commands,
  each one the CLI takes as it is, and a link to the layer to copy).
- **No one-line command.** The CLI takes no layer in a command (`tanrei init` takes an id and a shipped system), so
  Export shows none: What next runs `tanrei init`, then puts the downloaded file in place of the one it writes.
- **The banner of a shared layer** replaces the earlier notice. It says which layer came with the link and what it is
  built on, names the visitor's own layer, and keeps it until they keep the link's layer, edit it, or go back to theirs;
  it offers Export, so a layer that was sent can be taken as a file without replacing anything. A link opened where
  nothing was kept now shows the banner too, which may be closed.
- The file under every panel keeps its id, name and checks, with Export and Start over; its JSON, copy, download and
  next steps moved to Export. `mountStudio` takes `links.start` (the page that takes a product from a layer to every
  platform), and the page's API has `openExport(tab)` and `closeExport()`.
