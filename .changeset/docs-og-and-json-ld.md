---
'@tanrei/docs': patch
---

Documentation site: every page has an image of its own for a shared link, and its head tells search engines what it
is. The image (1200 × 630, `/og/<page>.png`) is drawn at build time from the light scheme's colors and type tokens:
the wordmark, the page's title and description in the page's language, and on a component's page each platform's
status. English, Spanish, Japanese and Arabic pages have images in their own language; Simplified Chinese and Hindi
pages show the English page's, as the build has no face for those scripts. The single `/og.png` for every page is
gone. The head now says `og:locale` as `ja_JP` with the other languages as alternates, titles the first page by what
Tanrei is («Tanrei — design system for Web Components, SwiftUI, Jetpack Compose, Flutter and React Native», no longer
«Tanrei | Tanrei») with `og:type` `website`, titles a component's page «Button — accessible UI component | Tanrei
design system», and carries JSON-LD: the page's breadcrumb trail on every page, the site and its source code on the
first page, and the platform's language on each platform's getting-started page.
