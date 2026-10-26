---
'@tanrei/docs': patch
---

Documentation site: the brand marks reach the site. The header's link to the first page is the symbol, drawn inline
in `sys.color.on-surface` so it follows the scheme and the contrast, at an icon's size in an icon button's box (its
centre, its inset and its focus ring are the menu button's), with the site's name as its accessible name. The
favicon is the symbol, following the reader's scheme and contrast by itself; the ICO (16, 32, 48), the home-screen
icon (180) and a social image (the wordmark, 1200 × 630, now named by `og:image`) are rendered from the marks at
build time. The marks live in `design/brand/`, are refreshed from Figma with `pnpm brand:pull`, and `pnpm generate`
paints the copies an image needs (the README's header uses them).
