---
'@tanrei/docs': patch
---

Documentation site: a component page's tokens table is drawn exactly as tall as the room it holds before it comes near
the view. The table is not laid out until then, and holds one line for each of its rows; but a value its column broke (a
shadow's layers, an easing's numbers) or a header in a narrow column took more lines, so the table grew when it was
drawn: by 280 px on the Select's page, 920 on the Chip's and 3000 on the FAB menu's, in every engine, language and width.
A browser without scroll anchoring (Safari) moved what the reader saw by that much as they scrolled up past it. No cell
of the table wraps now, its header cells included: a value stands on one line, as a stylesheet writes it, and the table
scrolls its columns sideways where they need more than its box.
