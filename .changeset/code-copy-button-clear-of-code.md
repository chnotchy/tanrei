---
'@tanrei/web': minor
---

Code block: the copy button no longer stands over the code. A block with `copy` and no title or language label used to
draw the button over the top end corner of the code, so a first line wider than the room before the button ran under
it (the end of an import at 390 px wide, for example). Now a block of more than one line always draws its header's row
when it has a copy button, with the button alone there where there are no words, and the code begins below that row.
A block of one line with no title and no language label (an install command) has no header: the button stands at the
end of that line's row, centred on it, and the line scrolls or wraps beside it. In both forms nothing passes under the
button, at every width, wrapped or not, scrolled or not, in either direction. One line is the code's own count, so
`code.css` draws the same form before the element is defined where the page writes the lines (`highlightToHtml` or
`highlightToNodes` with `lines`); a one-line block whose code is plain text is drawn with the header's row until then.
What breaks: a block of more than one line with copy and no words is one header row taller; the padding after the
longest line and the wrapped rows are no longer widened for the button, and the patch the button stood on is gone. The
visual baselines of the code block's copy fixtures without a title change with it.
