---
'@tanrei/web': minor
---

**Hit areas that stand beside each other meet at the middle of the gap, in the navigation drawer and the bottom sheet.**

- A navigation drawer's cell and a group's chevron lay their hit area out by its insets instead of centring it with a
  transform. The transform was not rounded as the layout is, so in a collapsed drawer with short labels, whose cells are
  a fraction of a pixel short of a whole height, a press a pixel short of the middle of the gap went to the next row.
- The rows a drawer pins at the top of its items (NVD-77) now stand the gap between two cells apart, as they do in the
  list, the gap drawn on the pinned rows' color. Pinned rows that touched could not each keep half a gap in their hit
  area: a press on the outer row's lower edge went to the inner one. The last pinned row's hit area reaches no further
  below it than half the room between it and the first row shown under it, which the rows scrolling under it change,
  and the drawer measures that room again when a group's size changes as well as when the items scroll. **Breaking**
  (a layout 0.1.0-next.0 shipped): the pinned rows take one gap more of the items' height, and their pictures change.
- A Handle's target stops toward a pressable its owner lays beside it at the cap the owner sets (HDL-5, as BTN-5 caps
  a Button), and only its owner's caps reach it. The bottom sheet caps its drag handle's target below the handle at
  half of `handle.margin-block` (BSH-15), so under targets of 48 a press nearer the content goes to the content.
