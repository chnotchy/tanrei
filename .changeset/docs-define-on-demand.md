---
'@tanrei/docs': patch
---

Documentation site: a page loads the scripts of the elements it draws, and no others. A page's demos used to import
the whole of `@tanrei/web`, which defines every element of the package, and every page's content column imported the
Table, the Callout and the Code block whether it had one or not. Each page now asks for the module of each element it
holds that is not defined yet, from a table made from the web package's Custom Elements Manifest when the site is
built; an element added later, or drawn in a component's shadow root, is defined the same way. The home page's
script falls from 608 KB to 179 KB compressed, a component's page (Button) from 611 KB to 306 KB. In the browser's
console, the whole package is `await tanrei`; it is fetched only when asked for.
