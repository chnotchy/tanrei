---
'@tanrei/web': patch
---

The description list and the breadcrumbs no longer keep a measurement taken in a fallback face. A text laid out while
its face was loading was measured in the fallback face and measured again only when the set of fonts fired
`loadingdone` — which WebKit on Linux does not fire for a face already loading when the listener was added. The widest
term of an inline description list (where it stacks) and the width of a breadcrumb trail (which levels collapse) then
stayed the fallback's: in a test that withholds that event, 322.93 px where the face draws 276.27, and 278.77 px where
it draws 212.85. A measurement taken while `document.fonts.status` is `loading` is now taken again when
`document.fonts.ready` resolves, by one primitive the marquee text (which had this fix of its own), the accordion, the
table, the tree view and every component's own glyphs now share — with one subscription to the page's fonts for all
of them.
