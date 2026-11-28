---
'@tanrei/web': patch
---

Link card: the card marks the media picture it has drawn. Once the picture has loaded and the card has begun its fade
in, or drawn it at once (a picture the browser already held, or one that arrived while the card was out of the page),
the card writes `data-drawn` on the product's own `<img data-part="media">`. It takes the mark off when the picture is
given another address, until the picture at that address has loaded, when the picture is taken out of the card, and
when the picture fails. A mark the markup itself brings is taken off. The mark changes nothing drawn or exposed: the
stylesheet does not read it. It lets a test or a tool wait for the card's own state instead of for the order in which
a browser reports a picture complete and loaded. The spec adds this as LKC-37.
