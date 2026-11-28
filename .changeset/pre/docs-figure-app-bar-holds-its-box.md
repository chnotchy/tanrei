---
'@tanrei/docs': patch
---

Documentation site: an app bar in a figure holds the box it will be drawn in before its element is defined. The site
header's stand-in for its own bar applied to every app bar, so a large bar in a figure was held at the small bar's
height (82 px where it is drawn at 138); it now applies to the header alone, and a figure's bar keeps the package's
stand-in (`@tanrei/web/app-bar.css`).
