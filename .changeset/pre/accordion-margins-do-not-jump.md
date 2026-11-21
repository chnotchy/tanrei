---
'@tanrei/web': patch
---

Accordion: content that starts or ends with a margin, such as paragraphs, no longer jumps when an item opens or
closes. The first paragraph's top margin used to reach out above the content's box. In every browser the item grew
by that margin at once in the first frame of an opening, and shrank by it at once after the last frame of a closing.
In Firefox and Safari the opening also went that margin past the open height and fell back at the end, and the
closing started that margin above it. The content's box now holds its
content's margins, so the motion starts and ends at the heights the item rests at. An item at rest is drawn as
before. Where a design system sets the space under the content to 0, the last paragraph's margin now stays inside
the item instead of reaching past its lower edge.
