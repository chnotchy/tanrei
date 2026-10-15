---
'@tanrei/web': minor
'@tanrei/react': minor
---

Carousel: previous and next controls over the ends of the row, so that a mouse can move the row with a single press
(WCAG 2.5.7) — before, a row without its dots moved under a mouse only with Shift and the wheel. They are icon-only
medium Buttons with the chevron glyphs, in the variant the new token `comp.carousel.navigation.button.variant` names
(tonal in every shipped system), named by the new `previousLabel` and `nextLabel` (`previous-label`, `next-label`;
the product's words `previousItemLabel` and `nextItemLabel`). Each moves the row one resting position, round under
`loop`; presses made while the row moves add up. Without `loop` the previous control is disabled at the first position
and the next at the last, keeping focus and their place in the Tab order.

The new `navigation` prop (reflected) says where they are drawn: `auto`, the default, draws them where the primary
pointer is fine and can hover and shows them while the carousel is hovered or holds focus, fading over the state
motion; `always` draws them on every device and shows them at all times; `none` draws neither. So every carousel now
has two more Tab stops on a desktop, after the playback control and before the items, as in the WAI-ARIA carousel
example. A press is the person's move: autoplay's interval starts again once the row is at rest. A carousel without
the two words reports them in debug builds.

At rest, with the pointer away, nothing changes in how a carousel looks; the new `navigation` fixture shows the
controls drawn (`always`). The vocabulary grows by the one token.
