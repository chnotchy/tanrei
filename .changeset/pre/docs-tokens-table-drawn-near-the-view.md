---
'@tanrei/docs': patch
---

Documentation site: a component's page loads faster. Its tokens table — hundreds of rows, about half of the page's
elements — is not styled or laid out until it comes near the view (`content-visibility: auto`), and holds the room of
its rows until then; find in page still finds its words.

- A color's swatch and its value stand on one line in the tokens table (the value was broken under its swatch), so
  every row of the table is one line except a long shadow.
- Each row of the table is fewer elements (the "—" of a token with no alias is the cell's own text).
