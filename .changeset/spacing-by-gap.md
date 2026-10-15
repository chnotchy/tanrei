---
'@tanrei/web': patch
---

Avatar group, Toolbar and Search: a page's reset no longer changes their spacing. A page's rules beat the rules a
component gives the elements it slots, so a reset such as `* { margin: 0; padding: 0 }` (a documentation site's,
Tailwind's preflight) took away the avatar group's overlap, the space between a floating toolbar's items, the centring
of a docked toolbar's only item and the space before a search bar's trailing buttons. The component now makes that
spacing from its own box: the avatar group's row is a grid whose columns are each the side less the overlap, and a
floating toolbar and a search bar's trailing buttons are spaced by elements of the component's own between them.
Nothing is drawn differently, and the elements stand where they stood. The toolbar and the search bar no longer write
`--tanrei-kept-*` custom properties on the product's elements.
