---
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/react-native': minor
'@tanrei/swiftui': minor
'@tanrei/compose': minor
'@tanrei/flutter': minor
---

**Breaking — List.** The List is now a box for the product's own items, laid out as a column, a line, or lines that wrap
into a grid, and items can be dragged into another order.

- An item's content is its children (the default slot). The row parts are gone: `headline`, `overline`,
  `supporting-text`, `supporting-max-lines`, `trailing-text`, `leading-icon`, `trailing-icon`, `leading-media`, the
  `leading` and `trailing` slots and the item's `divider`. Put that content inside the item yourself. An item that is
  an action, a link or an option still pads its content and draws every state and the check. Its name is the new
  `label`, or else its content's text. A static item draws nothing of its own.
- New list props: `orientation` (`vertical` | `horizontal`), `wrap`, `gap` (`none` | `small` | `medium` | `large`) and
  `dividers` (a hairline between items, drawn only while not wrapping).
- `reorder="buttons"` and the up and down buttons are removed, and so are `move-up-label` and `move-down-label`.
  `reorderable` replaces them:
  - Every item draws a handle, and the whole item can be dragged: a mouse after a few pixels, a touch or a pen after a
    long press, or at once from the handle. The other items slide aside, the dragged item is lifted with the dragged
    fill and elevation, and it settles into its place when dropped.
  - The handle is a menu button with four moves: to the start, before, after, to the end.
  - With the keyboard, Space on the handle lifts the item, the arrow keys move it, Space or Enter drops it and Escape
    puts it back. Each step is announced.
  - The words are the product's: `drag-handle-label` (`{label}`), `drag-handle-hint`, `move-to-start-label`,
    `move-before-label`, `move-after-label`, `move-to-end-label`, `lifted-text`, `moved-text` and `cancelled-text`
    (`{label}`, `{position}`, `{count}`).
  - `move` still carries `{ from, to }`, and the product still reorders its items.
- Tokens: the row tokens are removed (the three line heights, the text roles of the headline, overline, supporting and
  trailing text, the icon, avatar, image and media tokens, `reorder.text-min-width`, `move-buttons.gap`,
  `handle.size` and `handle.color`). They are replaced by `container.height`, `content.typescale`, a per-condition
  `content.color`, and `gap.small`, `gap.medium` and `gap.large`. The default item height is 48. `m3-like` keeps 56
  and `cupertino` keeps 44.
- The web's status is alpha again. The native platforms still ship the previous list and are marked lagging.
