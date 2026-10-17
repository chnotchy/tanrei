---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/react-native': patch
'@tanrei/swiftui': patch
'@tanrei/compose': patch
'@tanrei/flutter': patch
'@tanrei/docs': patch
---

App bar: a brand, the product's link to its first page drawn as its mark (APB-19 to APB-22). By default the bar takes
one image (`slot="brand"`) and shows it at every width; `brand-layout="split"` (`brandLayout`) takes the symbol and the
wordmark separately (`slot="brand-symbol"`, `slot="brand-wordmark"`) and shows the wordmark while the window is medium
or wider and the symbol while it is compact, never both — the enclosing app shell's window class, else the window's
width against `sys.breakpoint.medium` — moving focus to the brand it shows when the class changes under it. The bar
places the brand after the navigation item in an icon button's cell and gives it `comp.app-bar.brand.color` where the
product's own styles set no color; the product draws its mark `comp.app-bar.brand.size` high. New tokens
`comp.app-bar.brand.size` (`sys.icon.medium`) and `comp.app-bar.brand.color` (`sys.color.on-surface`), in every
platform's generated tokens; the native platforms do not draw the brand yet, and their notes say so. No fixture and no
baseline changes.

Documentation site: the header's symbol is the app bar's brand in its default layout (it stood in the navigation
slot, which holds one button); its boxes are the same as before. The brand page takes the place of Foundations ›
Principles in the six languages, and the old address leads to it: the marks drawn from their files in light and dark,
their color, clear space and minimum size measured from the marks, the favicon as the one exception to the minimum
size, Do and Don't with misuses made from the marks, the system's character, and the use of the marks by others.
