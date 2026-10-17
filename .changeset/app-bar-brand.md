---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/react-native': patch
'@tanrei/swiftui': patch
'@tanrei/compose': patch
'@tanrei/flutter': patch
'@tanrei/docs': patch
---

App bar: a brand, the product's logo as the link to its first page (APB-19 to APB-24). `brand-href` (`brandHref`) is
the address and `brand-label` (`brandLabel`) the product's name: the bar draws one link, named by it, around the images
the product gives, and hides the images from assistive technology. The images: one logo file (`slot="brand"`), the
symbol (`slot="brand-symbol"`), the wordmark (`slot="brand-wordmark"`), or both — side by side by default
(`brand-layout="lockup"`), or by the window's width (`brand-layout="responsive"`: the wordmark while the window is
medium or wider, the symbol while it is compact, the enclosing app shell's window class or, outside one,
`sys.breakpoint.medium`). The brand stands after the navigation item in an icon button's cell, so that a symbol stands
where an icon does, and takes `comp.app-bar.brand.color` where its images have no colors of their own. New tokens:
`comp.app-bar.brand.symbol.size` (`sys.icon.medium`), `brand.wordmark.height` (40), `brand.image.height`,
`brand.lockup.symbol.size` (the wordmark's height: a lockup's symbol stands at the wordmark's height, APB-24),
`brand.lockup.gap` (`sys.space.space100`), `brand.lockup.alignment` (`center` | `start` | `end`), `brand.shape`
(`sys.shape.corner.full`) and `brand.color` (`sys.color.on-surface`), in every platform's generated tokens; the native
platforms do not draw the brand yet, and their notes say so. A slot of a spec can now say its fixture strings are marks
(`mark`: `symbol` or `wordmark`, drawn from design/brand/). New baselines: app bar `small-brand`, `small-brand-symbol`,
`small-brand-wordmark`, `small-brand-lockup`, `small-brand-responsive`.

Brand: the wordmark as updated in the design file — the symbol's T followed by "anrei" in Outfit SemiBold — and the
copies, the social image and the README's header derived from it again.

Documentation site: the header shows Tanrei's wordmark as the app bar's brand at every width (it stood as a link in the
navigation slot, which holds one button). The brand page takes the place of Foundations › Principles in the six
languages, and the old address leads to it: the marks drawn from their files in light and dark, where each goes (the
wordmark wherever the name is read; the symbol only where a square or round shape is required, or for quiet promotion
and decoration), clear space and minimum size measured from the marks, the favicon as the one exception to the minimum
size, Do and Don't, the system's character, and the use of the marks by others.
