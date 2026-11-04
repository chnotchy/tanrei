---
'@tanrei/docs': minor
---

Documentation site: how the site looks is now one setting. It covers the color mode (your device's, light or dark),
the contrast and the design system the pages are drawn in. The header has a Dark mode toggle, and a button beside the
wordmark that names the current design system and opens the Appearance panel. In the panel you choose the color mode,
the contrast and the design system: Tanrei's own, or a showcase system that imitates another design system. You can
also copy a link to the page as it looks now, or go to Theme Studio. In a compact window the panel opens as a bottom
sheet, from the button at the top of the navigation drawer.

The setting is kept on your device and is in place from the first paint of every page, and other open tabs of the site
follow it. A link with `?look=…&mode=…&contrast=…` shows the page that way without changing your own setting; a
snackbar offers to keep it. Every live example, the lists of components and the fixtures' windows follow the setting.

What broke: the site's earlier header menus (the design system and the scheme/contrast menu) are gone, and a choice
kept by an earlier version of the site is not carried over.
