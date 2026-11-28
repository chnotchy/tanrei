---
'@tanrei/web': minor
'@tanrei/react': minor
---

Toolbar: selection groups, fields, and items kept at the end while the items scroll.

- A `<tanrei-toolbar-group>` takes `selection` (`none`, `single`, `multiple`), `value` and `values`. Its toggle Buttons, each with a `value`, become one choice (`single`, such as text alignment) or a set of choices (`multiple`, such as formatting). A group whose selection is single is a radio group and its toggles radio buttons; one whose selection is multiple keeps its toggles as toggle buttons. The arrow keys only move focus, and Space or Enter chooses, as in the WAI-ARIA toolbar pattern. The group fires one `change` for each choice, with `detail.value` and `detail.values`, and a toggle's own `change` stops at the group. Selection groups are for tools; switching views, or a choice of one among a few options that are not tools, stays with Tabs.
- A horizontal toolbar takes `<tanrei-select>` and `<tanrei-number-input>` anywhere in its row, and one `<tanrei-text-input>` or `<tanrei-slider>` as its last item. A Select and a Number input are stops of the arrow keys and keep Up and Down Arrow; a Number input keeps Left and Right Arrow while they move its caret. The last Text input or Slider is a Tab stop of its own after the toolbar's and keeps every key. A field is never hidden into the overflow menu, and the overflow button stands before a last Text input or Slider. The toolbar gives a field no length: set one.
- With `overflow="scroll"`, the items at the end of the row whose `toolbar-overflow` is `never`, and a last Text input or Slider, stay in place at the end edge while the items before them scroll.
- Button: `value` is now a prop on every platform, not only the web's form value. It is never drawn or announced. A selection group reads it, and on the web a form is sent it with `name`, as before. A toggle that a group whose selection is single makes one of its choices is exposed as a radio button, checked or not, instead of a pressed toggle, and pressing it while it is checked keeps it checked and fires `click` alone.
- React: `ToolbarGroup` gains `selection`, `value`, `values` and `onChange`.
