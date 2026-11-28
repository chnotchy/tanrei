---
'@tanrei/studio': patch
'@tanrei/docs': patch
---

**Theme Studio: a layer comes in from a file only, and the gallery's examples start under "From the gallery".**

- The field to paste a layer into, under the file panel (**Import a layer**), is gone, with its words in every
  language. A layer is loaded from a file, through the start point's **Import a file…**; the page's API
  (`importLayer`) loads one by the same function. Breaks: `.ts-import`, `[data-import]` and `[data-import-apply]` no
  longer exist, and the dictionaries' `import` group is removed (`import.invalidJson` is now `source.invalidJson`).
- The start point's menu lists the theme gallery's examples under **From the gallery** (Japanese 「ギャラリーから始める」,
  Chinese 「从主题示例开始」, Spanish «Empezar desde la galería», Hindi "गैलरी से शुरू करें", Arabic «ابدأ من المعرض»),
  which reads after the first group's **Start from**. It was **Theme gallery examples**.
- A layer handed to the API without a file name is called "the layer" in what the panel says.
- The docs' Theme Studio page names the start the same way, and says a file is the one way in, in every language.
