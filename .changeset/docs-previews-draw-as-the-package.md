---
'@tanrei/docs': patch
---

Documentation site: every live example and spec fixture is drawn as the web package draws it.

- The Tree view's previews: the chevron no longer lies under the icon, and the supporting text stands apart from the
  label. The page had only the copy of `tree-view.css` that Theme Studio's bundle carries, in `tanrei.components`,
  which comes before Starlight's layers, so Starlight's reset took the tree's margins.
- The Accordion's spaced sets keep the space between their items (the same cause), and the Button page's paragraph
  in the body text style is drawn at its size (`text.css` was not loaded at all).
- The Radio button's selected fixtures are drawn selected: they shared one `name` in one page, so each unselected the
  one before it.

Every stylesheet the package ships is now loaded for every page into a layer of the docs' own, and the site's tests
compare every preview of the built pages with the package's own drawing in a browser.
