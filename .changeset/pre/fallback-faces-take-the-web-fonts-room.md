---
'@tanrei/cli': patch
---

Theme Studio (`tanrei studio`) draws its text, until Inter, Roboto Mono and Noto Sans JP arrive, in metric-adjusted
fallback faces — "Inter Fallback", "Roboto Mono Fallback" and "Noto Sans JP Fallback": the platform's Arial, Courier
New or Japanese face with `size-adjust`, `ascent-override`, `descent-override` and `line-gap-override` computed from the
font files when the app is built. Text laid out before a font arrives takes the room it takes after, so the app no
longer jumps when the font loads. The documentation site does the same.
