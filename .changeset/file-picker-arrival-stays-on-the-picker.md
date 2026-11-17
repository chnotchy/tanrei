---
'@tanrei/web': patch
---

A file picker that stands alone in the page no longer lets its internal `tanrei-file-picker-arrival` event bubble to
the document after every choice. The event, which is in no manifest, tells a file upload or a chat composer that holds
the picker that the `select` and `reject` of one arrival have all been emitted; they listen on the picker itself, so it
no longer bubbles. A choice reaches the page as `select` and `reject` alone (FPK-9).
