---
'@tanrei/docs': patch
---

Documentation site: the Tree view's previews are drawn as the package draws them. The chevron no longer lies under the
icon, and the supporting text stands apart from the label. The page had only the copy of `tree-view.css` that Theme
Studio's bundle carries, in `tanrei.components`, which comes before Starlight's layers, so Starlight's reset took the
tree's margins. Every page now loads the stylesheet into a layer of the docs' own, as it loads the content column's
other stylesheets.
