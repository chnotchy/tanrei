# @tanrei/docs

## 0.1.0-next.1

### Patch Changes

- bf5b6de: App bar: a brand, the product's logo as the link to its first page (APB-19 to APB-24). `brand-href` (`brandHref`) is
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
- c7149b0: Documentation site: the brand marks reach the site. The header's link to the first page is the symbol, drawn inline
  in `sys.color.on-surface` so it follows the scheme and the contrast, at an icon's size in an icon button's box (its
  centre, its inset and its focus ring are the menu button's), with the site's name as its accessible name. The
  favicon is the symbol, following the reader's scheme and contrast by itself; the ICO (16, 32, 48), the home-screen
  icon (180) and a social image (the wordmark, 1200 × 630, now named by `og:image`) are rendered from the marks at
  build time. The marks live in `design/brand/`, are refreshed from Figma with `pnpm brand:pull`, and `pnpm generate`
  paints the copies an image needs (the README's header uses them).
- 21b2f2a: Documentation site: every fixture of every component is drawn.
  
  - The App shell, Code block, Inline code, Link, Menu, Navigation drawer, Previous and next links, Steps and Timeline
    pages drew none of their 258 fixtures ("Not available in the installed web build", which was not so: the site's own
    renderer did not know their markup). Each is now drawn alone in a window of its own.
  - A fixture drawn in a window — those, and every presented one (a modal dialog, a sheet, a tooltip) — is drawn from the
    web package's own document of it, the one its tests take each baseline from, at the size of that baseline: what the
    page shows is what every platform's baseline is compared with. A dialog's actions stand in its actions row, and a
    popover beside its anchor, as there.
- 9c3d438: Documentation site: a component's fixtures are a gallery of stages, not a table.
  
  - Every fixture stands on a stage of its own, named by its id, with the props that make it as its caption, grouped by
    the first token axis of the spec that tells its fixtures apart. Its header holds the stage's scheme (light or dark),
    a copy of the fixture's markup and a link to the fixture alone.
  - At a phone's width every fixture is in view: in the table, the drawing of most fixtures began past the table's
    visible box and could only be found by scrolling the table sideways.
  - A fixture as wide as its layout starts at the harness's width, fills its stage, and can be made narrower or wider
    with a handle on the stage's edge (a window splitter: drag it, or use the arrow keys, Home, End and Enter).
  - A presented fixture (a modal dialog, a sheet, a tooltip, a docked picker) is drawn presented, in a window of its own
    the size the web harness gives it, instead of an "Open" button. Nothing it opens leaves its window, and it never
    takes the focus from the page.
  - A horizontal divider, a linear progress indicator and a slider were drawn 0 px wide; they are drawn at the harness's
    length.
  - `/fixtures/<component>/` shows every fixture of a component on one page, and `?id=<fixture>` one fixture alone.
- 08ee59e: Documentation site: the header's language menus mark the language being read as the menu's current link item
  (`current`), not with a trailing check glyph. Assistive technology is now told which language is current
  (`aria-current="page"` on its link), and the row is drawn with the menu's current fill, as the menu specifies for the
  destination a person is at; a check belongs to a choice the menu holds, which a language link is not.
- 7692001: Documentation site: every live example and spec fixture is drawn as the web package draws it.
  
  - The Tree view's previews: the chevron no longer lies under the icon, and the supporting text stands apart from the
    label. The page had only the copy of `tree-view.css` that Theme Studio's bundle carries, in `tanrei.components`,
    which comes before Starlight's layers, so Starlight's reset took the tree's margins.
  - The Accordion's spaced sets keep the space between their items (the same cause), and the Button page's paragraph
    in the body text style is drawn at its size (`text.css` was not loaded at all).
  - The Radio button's selected fixtures are drawn selected: they shared one `name` in one page, so each unselected the
    one before it.
  
  Every stylesheet the package ships is now loaded for every page into a layer of the docs' own, and the site's tests
  compare every preview of the built pages with the package's own drawing in a browser.
- Updated dependencies [2cf22e1]
- Updated dependencies [132b7ce]
- Updated dependencies [bf5b6de]
- Updated dependencies [8d0e2b0]
- Updated dependencies [f799b0a]
- Updated dependencies [2b1b8a9]
- Updated dependencies [930031d]
- Updated dependencies [6b01d3e]
- Updated dependencies [d0d5136]
- Updated dependencies [5c2597b]
- Updated dependencies [6636594]
- Updated dependencies [88c14f0]
- Updated dependencies [d97b53b]
- Updated dependencies [aae9ddd]
- Updated dependencies [90c0631]
- Updated dependencies [fda53ad]
- Updated dependencies [78932fb]
- Updated dependencies [3b0cc7e]
- Updated dependencies [0a98a97]
- Updated dependencies [25dd0d0]
- Updated dependencies [8405fc9]
- Updated dependencies [7e694f4]
- Updated dependencies [a3f8151]
- Updated dependencies [0a27acd]
- Updated dependencies [bbd7afb]
- Updated dependencies [654a435]
- Updated dependencies [b0e55fb]
- Updated dependencies [2dd0327]
- Updated dependencies [da87128]
- Updated dependencies [397cd93]
- Updated dependencies [aaba9dc]
- Updated dependencies [0a27acd]
- Updated dependencies [6e9bc90]
- Updated dependencies [5287d31]
- Updated dependencies [7536862]
- Updated dependencies [72469f9]
- Updated dependencies [712e7d2]
- Updated dependencies [0a27acd]
- Updated dependencies [c9d76e2]
- Updated dependencies [25ecc35]
- Updated dependencies [fb1ce26]
- Updated dependencies [9fd9aba]
- Updated dependencies [2a2437f]
- Updated dependencies [6016e87]
- Updated dependencies [155b5de]
- Updated dependencies [6e23003]
- Updated dependencies [ca2160c]
- Updated dependencies [cb29df6]
- Updated dependencies [d0de4b8]
- Updated dependencies [cd48cda]
- Updated dependencies [77b361c]
- Updated dependencies [0a27acd]
- Updated dependencies [0a27acd]
- Updated dependencies [348b6be]
- Updated dependencies [e088124]
- Updated dependencies [d43dd75]
- Updated dependencies [07c7d78]
- Updated dependencies [0f0e1eb]
- Updated dependencies [5029351]
  - @tanrei/web@0.1.0-next.1
  - @tanrei/studio@0.1.0-next.1

## 0.1.0-next.0

### Patch Changes

- Updated dependencies [f181fc2]
  - @tanrei/web@0.1.0-next.0
  - @tanrei/studio@0.1.0-next.0
