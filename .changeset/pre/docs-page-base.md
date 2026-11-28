---
'@tanrei/docs': patch
---

Documentation site: every page loads the page's base (`@tanrei/web/base.css`) as a product's page does, in a layer
of the site's own named before the framework's, so it fills only what neither the framework, the site nor its theme
sets: the root is on the surface in its text color, and the body is in the body role's size and weight. A fixture the
gallery draws in a window of its own (the app shell, a responsive drawer) is now drawn as its baseline is, without the
browser's margin around it and with its body in the body face, where it was inset by 8 pixels and cut off at its foot.
