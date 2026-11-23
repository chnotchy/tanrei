---
'@tanrei/web': patch
---

Inline code in a Table's cell now wraps as the cell's text does. It used to break anywhere, as it does in running
text, so in a table narrower than its columns (a phone, a narrow column) the Table gave a column of names the width of
one character and drew `width` as `wi` / `dt` / `h`. A name with no space now stays whole and widens its column, and the
table scrolls sideways, as the Table does for any word it does not break. In a column marked `data-wrap="false"` the
run no longer wraps at its spaces either. Outside a table nothing changes. Browsers before Chrome 130 and Safari 18
still wrap a run at its spaces in a column marked `data-wrap="false"`.
