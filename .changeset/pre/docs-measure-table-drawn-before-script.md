---
'@tanrei/docs': patch
---

Docs: a measure figure's table is laid out at its drawn size before any script runs, so it no longer grows in the
reader's view when the figure is drawn. Where a component does not draw a length as its token says, the table's row
says what it draws instead; that note was written in only once the figure had measured the component, on the length's
line, which is kept on one line: it pushed the first column as wide as the sentence and broke the tokens' column a few
letters to a line. The Japanese Select's table at a phone's width grew from 260 px to 1020 px, and with every element's
module held back 1 s the page moved by 0.67 as it was paged through (0.013 with the modules at once). The lengths each
figure does not draw are now recorded with the docs (`src/lib/visuals/lengths-not-drawn.json`) and written into the
table by the page, the note stands on lines of its own under the length's name as wide as the column is without it,
and the browser test of every figure fails when what a figure finds differs from the record. The same page now moves
by 0.0012 so (0.0000 with the modules at once).
