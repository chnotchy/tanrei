---
'@tanrei/docs': patch
---

The fixture gallery's windows draw on the site again. The host sent `X-Frame-Options: DENY` with every document, which
refuses a frame of the same site too, so every window of a component page's Specs tab (`/fixtures/<component>/?id=…`)
stood empty. The fixture documents are now sent `X-Frame-Options: SAMEORIGIN` and the pages' `Content-Security-Policy`
with `frame-ancestors 'self'` (framed by this site, and by no other); every other document is still framed by no page, and the
pages' policy now allows a frame of the site's own documents (`frame-src 'self'`). A window the browser
refused to draw no longer makes the page's script throw and stay `inert`. The docs' browser tests serve the built site
with the host's headers, read as the host reads `_headers`, and a test asks that the windows of a component page draw
their fixtures.
