---
'@tanrei/compose': minor
'@tanrei/swiftui': minor
'@tanrei/flutter': minor
'@tanrei/react-native': minor
'@tanrei/tokens-build': minor
'@tanrei/web': minor
'@tanrei/react': minor
'@tanrei/docs': patch
---

**Fields, pickers and the segmented button are drawn at the control height.** The search bar, a filled and an
outlined input box, the one-time-code input's cells, the date-time picker's range fields, the calendar's view toggle
and a year's container, and the segmented button now read `sys.control.height.medium` in their default size, and are
marked `"dev.tanrei.aligned": "control"`. At a control height of 32 they are 32 tall; at 36, 36.

- **The default system changes, as intended:** at the default control height of 40 the search bar goes from **56 to
  40** (`comp.search.container.height`, now as tall as its button trigger), a filled or an outlined box of medium size
  from **48 to 40** (`comp.input-box.container.height.medium`, as tall as a stacked box), a one-time-code cell from
  **48 to 40**, a range field from **48 to 40**, the calendar's view toggle and a year's container from **36 to 40**
  (as a day's container already was), and a medium segmented button from **36 to 40**.
- **The other sizes read the step of their size**: a small filled or outlined box is the small step, 36 (was 40, the
  medium step), and a large segmented button the large step, 56 (was 40), so that a set and the Buttons of its size
  stand at one height (36, 40 and 56).
- **Block paddings give up half of what a box loses below 40**, so that one line always fits: a filled or outlined
  box's padding is 6 at small and medium (were 8 and 10), a stacked box's; the padding of a filled box that shows its
  label stays 2 at small and 4 at medium. A filled box that shows its label holds the floated
  label above the value's line, and is as tall as the two lines and that padding where that is more than the control
  height: 50 at 40, 42 at 32.
- **What is no control on a row keeps its own height**, and its spec says why: the calendar's cell (48), the pitch of
  the grid that holds a touch target for every day; a wheel's row (48), the pitch of one wheel, five rows beside the
  dial; the time display's selectors and the dial, Material's time picker's faces; and the search view's header (72),
  the frame of a view. The controls inside them follow the control height.
- **The presets keep their originals' heights**, pinned with the reason: m3-like and m3-expressive-like keep Material
  3's 56 search bar, its 56 filled and outlined fields, its 40 segmented button and its 72 × 36 years, and the small
  field (40), the 32 and 48 sets, the 36 view toggle and the 48 range field they drew; cupertino keeps the 34 and 44
  fields, Apple's 28 and 32 segmented controls and the 40 set, and the 36 view toggle, 36 years and 48 range field it
  drew. Their paddings stay as they were.
- The spec and the docs say what had stayed: a search's medium row is at the control height (40, not 48), a small
  select is 36 high, and the web's suggestion rows are the control height under a mouse.
- The web baselines of these components, and of what embeds them, move with this change; they are not recorded in it.
- New behaviour: SRC-59, TXI-74, SEL-75, CMB-85, NMI-50, CLI-48, OTC-32, DTM-53, CAL-37 and SEG-32 say a default
  control is as tall as the control height; `src/control-height-fields.test.ts` draws each at 32, 36 and 40 in
  Chromium, Firefox and WebKit.
