# @tanrei/compose

## 0.1.0-next.1

### Minor Changes

- 8d0e2b0: App shell: `footerHidden` (`footer-hidden`, React `footerHidden`) decides whether the footer is shown. The footer was
  shown exactly while the product filled the footer region; a screen that is a task rather than a page of the site (a
  checkout, a sign-in, an editor) can now leave the site's footer out without taking it out of the markup. While it is
  true the footer takes no space, draws no line, is no content-information landmark and has no stop of the keyboard, the
  navigation and the aside stay in view to the end of the page, and focus that was in the footer moves to the main
  region. A footer slot left unfilled is still never drawn and never a landmark. Pages that do not set it are unchanged. The
  spec names the prop on every platform; SwiftUI, Compose, Flutter and React Native have not implemented the app shell
  yet.
- 02031c4: **Avatar — the picture fades in.** When an avatar's picture arrives it fades in while the initials or the glyph fade out
  beneath it, one cross-fade of opacity on the new tokens `tanrei.comp.avatar.motion.picture-duration` (the role
  `sys.motion.role.state.default`, 250 ms in the default system) and `picture-easing` (`sys.motion.easing.state`).
  Nothing changes place or size, and reduced motion keeps the fade, since a change of opacity is not motion. Before, the
  picture took the fallback's place in one frame. A picture the browser already holds when the avatar asks for it, and
  one that loads while the avatar draws its first frames, are still drawn at once; a new `src` still draws the fallback at
  once until its picture arrives.
  
  **Breaking:** a test or a stylesheet that read the picture as whole the moment its `loaded` class appeared now sees it
  partway through the fade: wait for the avatar's transitions to finish. The initials and the glyph stay in the avatar's
  shadow root under a loaded picture, hidden, rather than being removed.
- 90e6108: **Component motion takes its role.** Every component duration and curve that a motion role describes now aliases that
  role (`sys.motion.role.*`, `sys.motion.easing.{enter,exit,state,spatial}`) instead of a step of the duration scale, a
  spring or a curve of the scale. A product re-times a kind of change — every state change of a small control, every
  sheet's entrance — in one line of its layer. **Breaking**: the default system's motion changes, and five component
  token names are replaced.
  
  - **The default system (and cupertino, which takes its motion) is timed by role**: a change of state takes 200 ms on a
    small control and 250 ms on a medium control or a large surface (was 150 ms everywhere); a check mark or a radio
    button's dot 250 ms; a switch's handle, the tabs' and the navigation bar's indicator, a slider's handle and the time
    picker's dial travel over 250 ms on the standard curve (were 350–500 ms on a spring that overshoots), and so do a
    list's items changing place; a text field and the copy button change size over 300 ms, the main action button, the
    drawer's width and an expanding snackbar over 400; an accordion, a tree, a table of contents and a drawer's group
    open over 400 ms; the search view and the docked picker appear over 300 ms and leave over 250; a tooltip appears
    over 250 ms and leaves over 200; dialogs, the image preview and the modal picker over 350 / 300; sheets and the modal
    drawer over 400 / 350; the snackbar over 350 / 300. Surfaces enter on the standard curve and leave on the
    accelerating one. The ripple (450 ms) and the loading indicator's and the skeleton's wait (300 ms) are unchanged.
  - **m3-like and m3-expressive-like draw exactly what they drew**: their roles are Material 3's durations and curves, and
    where a component's role holds another value in the preset, the preset pins that component token to the value it
    had, with its reason (25 tokens: the app bar's scroll change, the tabs' indicator and the tab view's switch, the
    selection curves of the checkbox, the radio button, the chip and the segmented button, the snackbar's and the
    tooltip's exit curve, among others).
  - **Replaced token names** (the state duration follows the size): `comp.button.motion.state-duration`,
    `comp.main-action-button.motion.state-duration` and `comp.segmented-button.motion.state-duration` become
    `….state-duration.{small,medium,large}`; `comp.chip.motion.state-duration` becomes `….state-duration.{small,medium}`;
    `comp.input-box.motion.state-duration` (the text input, select, combobox, number input and color input) becomes
    `….state-duration.{small,medium,large}`. Small reads `role.state.compact` (200 ms), the others `role.state.default`
    (250 ms; Button's, the main action button's and the segmented button's large read `role.state.large`, also 250 ms). A
    layer that set the single token sets the size's. The CSS custom properties follow:
    `--tanrei-comp-button-motion-state-duration-small` and so on.
  - Component tokens that no role describes keep their values: cycles (a loading indicator's turn, a skeleton's pulse, a
    progress bar's indeterminate cycle), a progress bar moving to its value, the calendar's and the image preview's paging,
    the carousel's scroll, the image preview's zoom, the time picker's wheel, the FAB menu's open and close (Material's),
    and every delay and interval.
  - The scrim of a modal layer, a dialog, the image preview and the modal picker share the modal role: their enter and
    exit tokens still alias the modal layer's, so one value re-times them all. A sheet and the modal drawer, whose scrim
    is drawn with their own tokens, take the sheet's role, and no longer follow the modal layer's motion tokens (the
    modal layer's spec and page say so).
  
  SwiftUI, Compose, Flutter and React Native: their generated tokens carry the new values, and the five state durations
  move to each component's size members. Baselines are unchanged: the fixtures are drawn at rest.
- aae9ddd: Content components, after the review of the web components:
  
  - Avatar: the avatars of a group overlap by 2, 4 and 8 (small, medium, large; were 6, 10 and 14), so that two
    initials side by side stay whole and are not misread. The overflow box reads "99+" above 99 at every size (was
    "999+" above 999), so it never holds more than three characters; the exact number stays in `overflowLabel`. The spec
    now says what was built for enlarged text: initials grow with the text up to the glyph's box of their size.
  - List: a reorderable list moves its buttons below the text only where they would leave the text narrower than the new
    token `comp.list.reorder.text-min-width` (96 px at the default text size, growing with the text), in place of "less
    than half the row", so a row with two move buttons and a remove button stays on one line at the default text size;
    where the line under the text is too short, the trailing control goes to a further line. A selected option's fill
    is, in the default system, a layer of the row's content color at 16% (as a menu's checked item), and its overline,
    supporting text, trailing text and trailing icon take the fill's content color; m3-like and cupertino keep their
    look.
  - Code block: an added line and a removed line draw a faint band of their kind (new tokens
    `comp.code-block.line.added.container.color` and `…removed.container.color`) behind the line, besides the bar and
    the sign; code keeps its syntax colors, which the build holds at 4.5:1 (7:1 in high contrast) on the bands. No band
    in forced colors, and none in cupertino.
  - Table: the checkbox of the selection column stands with its box, not its round container, at the cell's padding,
    where the text of the other cells starts; the column is narrower (50 in the default system). The spec of a wrapped
    sortable header now says what was built: the mark stands after the label's box, on its last line.
  - Tree view: a disabled row that has keyboard focus draws its focus ring at full strength; the row stays faded.
  - Prose: Japanese running text is set at a line height of 1.85 (new token `comp.prose.japanese.line-height`), the
    space between lines near one character, as JLREQ recommends for lines of the measure's length.
  - Image preview: the spec records the web's edge resistance (three tenths of the drag past the first or last image).
  
  Baselines re-recorded for these intended changes: avatar groups, list reorder and selected rows, code block diffs,
  table selection, and Japanese prose.
- d8fb809: **Density is one number, and nothing pressable is drawn below a minimum target — in the tokens. The values do not
  change: at the defaults every resolved value in every system and scheme is what it was, and no picture moves.**
  
  New tokens:
  
  - `tanrei.dial.density`, a number, 1 by default: how much room a product gives its controls and rows. Below 1 they
    are drawn closer, above 1 they get more room. On the web it is `--tanrei-dial-density`, and the heights, paddings
    and gaps that follow it are live CSS, so setting it on `:root` moves them.
  - `tanrei.sys.target.minimum`, 32: the least height (and, for an icon-only control, width) at which anything a person
    presses is drawn. It is fixed: the developer's value, which no dial scales. `sys.target.pointer` (44) and
    `sys.target.touch` (48) keep their values and their rules. The cupertino preset sets the minimum to 28, the least
    height it draws a pressable at.
  - `tanrei.sys.control.height.{extra-small, small, medium, large, extra-large}`: the height ladder, 24 / 32 / 40 / 56 /
    72 — the size unit × 6 / 8 / 10 / 14 / 18 × the density, on the size unit's grid.
  
  Tokens whose rule changes shape (their values do not):
  
  - Every height of a box or a row a person presses (61 component tokens: Button, Button with menu, the input boxes,
    Pagination, Chip medium, Tabs, Segmented button, Menubar, the inline Toolbar, Search's trigger, Main action button,
    the calendar's cells, One-time code input, the date and time picker's range field and wheel row, and the rows of
    tree view, navigation drawer, table of contents, menu, select, combobox, search suggestions, list, list row and
    accordion) follows the density and is never below `sys.target.minimum`; one whose default equals a ladder step
    reads it. Heights nobody presses (Tag, Keyboard shortcut, Badge, the navigation drawer's headings, the plain
    tooltip) follow the density with no minimum.
  - The block paddings of those boxes are derived with `pad` from their box's height (49 tokens); the block paddings of
    boxes sized by their content and the gaps between rows (the table's cells, the description list's facts, the
    timeline's entries, the navigation drawer's items) are multiplied by the density.
  - The gaps that keep a whole target between neighbours — the standard button group's, the docked toolbar's and the
    search bar's — are derived as `sys.target.touch` less the small Button's height, never below zero (16, as before).
  
  What else changes:
  
  - The rule language: `pad` takes an optional `by`, a coefficient on its padding, which a layer's `scale` multiplies;
    a size a layer adds to a component measures its `pad` paddings from its own height. A size a layer adds by scaling
    a floored height keeps the floor (a Button size scaled 0.75 from small is held at the minimum, 32).
  - The build checks the target floor in every system: the three target tokens at WCAG 2.5.8's 24px or more and every
    floored height at the minimum or more (an error in the default system, a warning in a product layer, information
    in an imitation preset), and `pointer` and `touch` at the minimum or more and the density above zero (refused in
    every system, a product build too). `targetFloors` and `TARGET_THRESHOLDS` are exported from the invariants.
  - The native token types gain `density` among the dials and `minimum` among the targets (`TanreiDials`, the target
    struct of each platform): code that constructs them by hand adds the new fields.
  - Theme Studio lists the density among the dials (0.75 to 1.5), and its rule editor keeps and shows a `mul`'s
    `times`, `round` and `min` instead of dropping them when a rule is edited.
  - On the web, a product of the density gains a ten-thousandth of its unit before it is rounded, so a height on a tie
    of its grid (4 × 10 × 0.95 = 38) rounds upward in every browser, as the build rounds it; Firefox, which holds the
    density as a 32-bit float, rounded it down.
  - `sub`-derived gaps get no `-pill` companion in the web's stylesheets; only a `sub` that is a corner inside another
    does.
- 0a27acd: A new component, the drop zone (`<tanrei-drop-zone>`, React `DropZone`): it wraps any part of a screen — a list, a
  table, an app's main region — so that files can be dropped anywhere on it, while everything it holds is used exactly as
  before. It draws nothing at rest and adds no hover, no press, no focus stop and no role. While files (and only files)
  are dragged over it, one overlay covers its box above all its content — a scrim, an edge and a panel with the upload
  glyph and the product's message — without taking a press or a scroll; the panel stands in the part of the zone that is
  in view. On the drop it judges the files by the File picker's rule (`accept`, `max-size`, `multiple`, `max-files`) and
  emits the File picker's `select` and `reject`, so a product can hand them to a File upload's `add()` or to a list of its
  own; the innermost zone, or a File picker's drop area inside it, takes a drop. One polite live region says how many files
  were accepted and refused, in the product's words (`dropped-text`, `refused-text`, or `silent` where a File upload says
  them). The spec requires every screen with a drop zone to also offer a File picker or a File upload, since dragging has
  no keyboard equivalent, and a debug build reports a page that has none. New tokens `comp.drop-zone.*` (scrim, edge,
  panel, glyph, message, refusing, motion), all aliases of system tokens, and four new keys of the product's words
  (`dropZoneText`, `dropZoneRefusingText`, `filesDroppedText`, `filesRefusedText`). The File picker's judging moved to a
  shared module that both use; its behaviour is unchanged. Web only; the native platforms are planned. New baselines are
  the drop zone's six fixtures and its preset representative; no existing baseline changes.
- bbd7afb: Fields, after the web review.
  
  - **The error text takes the help's place.** While a field is in error its error text now stands where its help stood,
    as the supporting row's first line, so a form in error is no taller than at rest; the help comes back when the error
    goes, and the control's description follows what is drawn. Where it stands is a new choice of kind,
    `comp.field.error-text.placement` (`replace`, the default, or `append`, which keeps the help and draws the error text
    below it, as before). Every shipped system uses `replace`, as Material and Carbon do; a layer that imitates a system
    that keeps the help in view (GOV.UK) sets `append`. Vocabulary: one new token.
  - **A disabled field's requirement tag fades with its label.** The Tag has a `disabled` prop that draws it as part of
    something disabled, from new per-look disabled tokens (`comp.tag.<variant>.disabled.*`, an outlined tag keeping no
    fill); it changes nothing else and exposes no state. A field and a field group set it on their requirement tag while
    they are disabled. Vocabulary: the Tag's disabled state tokens.
  - **Fields in a row wrap.** In a horizontal field group of fields, each field is never narrower than the new
    `comp.field-group.field.min-width` (144, from the size scale): the next field moves to a line of its own instead of
    being squeezed. Vocabulary: one new token.
  - **`small` text input.** The text input, the combobox, the number input and the color input (and the text, combobox,
    number and color fields) take `size="small"`: the box's 40-high step the small select already had, its text 14, for a
    bar, a toolbar or a dense row of controls. The hit area still meets the minimum target.
  - **The optional word in a floating label.** A filled or outlined text input framed by a Field whose requirement is
    optional draws `optionalText` after its floating label, resting and floated with it, as a stacked field draws the
    optional tag. The field no longer reports that it cannot.
  - **Date and time segments keep one width.** Each segment is as wide as the wider of its placeholder and its widest
    value, whatever it holds, so the row no longer moves when the first digit is typed.
  - **The grip changes the width without a drag.** On a manually resized field that resizes both ways, a click, Enter
    or Space on the grip also makes the field as wide as its place, and the next one gives back its width (WCAG 2.5.7).
  - **A prefix and its value read as one string right to left.** Beside a prefix, the value (and the placeholder) of an
    email, URL, phone, number or password input stands against the prefix, at the start of its run, in every layout
    direction: `https://` and the address no longer stand at the two ends of the field.
  
  Baselines recorded again on Linux, each the intended result of one of the changes above: the fields with help and an
  error text (the error text in the help's place), the disabled fields and field groups with a requirement tag (the tag
  faded), the date and time fields (segment widths), the right-to-left inputs with a prefix (the value beside it), and the
  new fixtures (the Tag's disabled fixtures, the small inputs, the optional word in an outlined field). The native
  platforms are not built for these yet; their specs say so.
- f744584: Navigation drawer and tree view: a filter field. `filterable` draws a search field above the rows (the drawer's below
  its header, the tree's pinned at the top of its scrolling box); what a person types narrows them to the rows whose label
  holds every word, in any order, without regard to case, width or marks, and the groups that hold a match open for as
  long as the filter is there — `open` is not written and no `toggle` fires, so emptying the field puts everything back.
  What does not match is hidden, and nothing in the rows that are left is marked: they are the answer, as in a code
  review's file tree and a documentation site's sidebar, each drawn as it is without a filter, and the tree never touches
  the product's own text in its labels. As in the search, the first row that matches is ready to take while focus stays in
  the field: Enter takes it as Enter on its row would, and Down Arrow moves focus to it. It is drawn as the focused row
  and not read out until the person moves to it: the field names no active descendant. "/" reaches the field — from
  anywhere in the window for the drawer, from a row for the tree (`filterShortcut` changes or removes the key); Escape
  empties the field. A quiet line at the top of the results draws how many rows match (`filterCountText`) or that none
  does (`filterEmptyText`), and a status says it once typing pauses; `filterCountHidden` leaves the count undrawn and
  still said. The words are the product's: `filterLabel`, and `filterPlaceholder`, `filterCountText`, `filterEmptyText`
  and `filterClearLabel` (the product's `clearLabel`), with three new keys in the English word pack. `filterValue` and
  `filterchange` keep the text; `focusFilter()` moves focus to the field. The app shell opens a narrow window's closed
  drawer for its chord and puts focus in its field. New tokens: `comp.navigation-drawer.filter.{gap,status.*,shortcut.*}`,
  `comp.tree-view.filter.{gap,status.*}`, and how a match is marked in the combobox.
  
  A match is now marked the same way in the search and the combobox: the stronger text color, a raised weight and a quiet
  fill behind the matched letters. The combobox's matched run, which was heavier only, gains its color and fill
  (`comp.combobox.option.match.color`, `.container.color`, and `.selected.color` and `.selected.container.color` for the
  chosen option, whose own fill is the quiet one), and is drawn in the platform's marked-text colors under forced colors.
  Its look changes in every filtered list.
  
  The filter is on the web; the spec names its props on every platform, and SwiftUI, Compose, Flutter and React Native
  have not implemented it yet.
- b0e55fb: The edge of a region that stays in place is drawn at rest. The app bar's bottom edge, the dividers below a dialog's
  or a popover's header and above its actions, and the divider below a side sheet's header came and went with the
  scroll position; each parts a fixed region from content that scrolls, so an app shell's header, for one, showed its
  line only once the page had moved. In the default system the app bar now draws its edge in both conditions, a dialog
  and a popover draw both dividers for as long as their content scrolls (at its top included; none while everything
  fits), and a side sheet draws the divider below its header whenever the header is drawn, as it already drew the one
  above its actions.
  
  A new choice of kind, `sys.behavior.divider-visibility` (`always` | `scroll`), read through
  `comp.app-bar.outline.visibility` and `comp.{dialog,popover,side-sheet}.divider.visibility`, and a
  `dividerVisibility` prop (`auto` | `always` | `scroll`, the `divider-visibility` attribute on the web) on the four
  components: `scroll` draws what they drew before. `cupertino` and `m3-like` choose `scroll`, as Apple's bars and
  Material's top app bar and dialogs do, so nothing changes under those presets. Lines that say there is more to scroll
  to — a table's sides and sticky header, a tree's or a drawer's pinned rows — are not this choice and still follow the
  scroll.
  
  The vocabulary gains these five tokens. The web draws the choice; SwiftUI, Compose, Flutter and React Native receive
  the tokens and the typed enumeration but do not draw the choice yet, and keep the scroll form. Baselines: the default
  system's app bar fixtures now show the bottom edge at rest, the dialog's and the popover's `scrolling` fixtures both
  dividers, and the side sheet's fixtures with a header the divider below it — the intended result of this change.
- 377bc4a: Handle (`<tanrei-handle>`, React `Handle`): the mark a person drags, or moves from the keyboard, to change the size of
  what it stands on — a sheet, a text field, a pane, a preview frame. It sizes nothing itself: it tells its owner what
  happened, and the owner keeps the size.
  
  - One axis is a short capsule with round ends (`axis` `vertical` for a height, `horizontal` for a width); `both` is a
    quarter-circle arc that bows toward its `corner` (logical: `bottom-end`, `bottom-start`, `top-end`, `top-start`) and
    shares its centre with a corner of radius `arc.radius` plus `inset`. Two sizes, `medium` and `small` (a text field's
    corner), an axis a design system may extend.
  - Events: `resizestart` (`pointerType`), `resize` (`inline` toward the end edge, `block` downward, from the press, every
    frame the drag moves), `resizeend` (once, with `cancelled`), `step` (`axis`, `direction`, `amount`: `one`, `large`,
    or `limit` for Home and End) and `activate` (a press without a drag, Enter, Space).
  - With a `value` it is a focusable separator, as the window splitter pattern has it (`min`, `max`, `valueText`, the
    orientation of its line); without one, a button with `expanded`. `activate` gives every owner a size that needs no
    drag (WCAG 2.5.7).
  - Out of sight until it is used: drawn while a mouse is over it, while it has keyboard focus and while a press or a drag
    holds it, and always on a touch screen, which has no hover. It stays one Tab stop with its name and value, and keyboard
    focus brings it into sight with its focus ring. `revealed` draws it at rest (a sheet's grip).
  - A press takes no focus and selects nothing; the drag follows the pointer past the window's edge. An owner that holds
    an iframe turns off its `pointer-events` between `resizestart` and `resizeend`.
  - Its states and press answer are the Button's, at both sizes: the box carries the state layer; under a mouse and a
    press the line grows a little longer and thicker and darkens. It has no error color.
  
  New tokens `comp.handle.*` (the box, the line at rest and while used, the arc's radius, the inset, the colors per state,
  the motion), and two rules that darken the line under hover and press. New baselines: one per Handle fixture, and the
  `both-bottom-end` fixture under each shipped preset. No existing baseline changes. The web is the first platform;
  SwiftUI, Compose, Flutter and React Native are planned.
- da87128: Number input, one-time-code input, search, color input and date-time picker: rules settled by the web review.
  
  - Number input (and number field): Page Up and Page Down step ten steps on the grid of `step`, as a slider's page keys
    and the platform's `stepUp(10)` do — with a step of 2, 42 goes to 62 and 82, no longer to the next multiple of 20
    (60). Where the place is too narrow for the input's line and the steppers side by side (text at 200% in a window
    320 wide, with a prefix and a suffix), the steppers move to a row of their own below the line, at the container's
    end, instead of making the box wider than the window; they are never hidden, because on touch they are the only way
    to step.
  - One-time-code input: the caret's width is a token of its own, `comp.one-time-code-input.caret.width` (new
    vocabulary). The default system keeps the hairline; `m3-like` and `cupertino` draw it 2 wide, as their platforms'
    text carets are. The spec now says what the default system does at 200% text in a layout 288 wide: two rows of
    three, because the paddings and gaps grow with the text.
  - Search: a match in an excerpt is told by a fill as well as by its color and weight —
    `comp.search.result.mark.container.color` now aliases `sys.color.secondary-container` instead of being transparent —
    so it is found in every script, also where the reader's font has no weight between regular and bold. The match's
    color keeps at least 7:1 on the fill in every scheme of every shipped system. The docs add that a product that binds
    a single character key such as `/` gives people a way to turn it off or change it (WCAG 2.1.4).
  - Color input (and color field): while the picker button is shown, a press on the swatch does what a press on the
    button does; the swatch still takes no focus and draws no answer, and the keyboard's way stays the button. A commit
    reads three hexadecimal digits (`#fff`, `F0A`) as the six they stand for and writes them in the value's form
    (`#ffffff`, `#ff00aa`), with `input` and then `change`; while typing, three digits are still no color.
  - Date-time picker: while the period has focus, typing the first letter of a period's name in the locale (A or P in
    English) sets that period; where both names begin with the same character (午前, 午後) it changes the period.
  
  The native platforms are paused: their generated tokens carry the new and changed values, and each platform takes the
  behaviour when it catches up with the spec.
- 0a27acd: **Breaking — List.** The List is now a box for the product's own items, laid out as a column, a line, or lines that wrap
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
- 6e9bc90: List row (`<tanrei-list-row>`, React `ListRow`): the row most lists are made of, as a component of its own. The List
  stays a box of the product's items; the row is what one item shows, or it stands alone.
  
  - An overline, a headline and one or two lines of supporting text (`supportingLines`), each cut with an ellipsis where
    it does not fit and shown whole in a tooltip on hover and on the item's keyboard focus; assistive technology always
    gets the whole text.
  - A leading glyph (`leadingIcon`) or the `leading` slot (an avatar, a picture, or in a static row a control); the
    trailing text (never more than half of the row), the `trailing` slot and a trailing glyph (`trailingIcon`).
  - One-, two- and three-line heights in two densities, `regular` (56, 72, 88) and `compact` (40, 56, 72), an axis a
    design system may extend. New tokens `comp.list-row.*`; m3-like sets the headline in body-large and 24 after the last
    part, cupertino the headline in body-large and a row of one line 44 tall.
  - The row draws no fill, edge or state and is never pressable: a row that opens something is the content of an
    `interactive` or `href` list item, a row that is chosen the content of an option.
  
  List: a list item now tells a List row that is its direct child what the item is — an action, a link or an option
  (which pads the row, so the row drops its own padding and keeps its height), an item of a reorderable list (the handle
  stands in place of the row's start padding), a selected option (the row takes the selected content color), disabled —
  and an item without a `label` takes its name from the row's headline (its accessible name, its handle's name,
  typeahead, announcements); an action, a link or an option is described by the row's other texts.
  
  New baselines: one per List row fixture, and the `all-parts` fixture under each shipped preset. No existing baseline
  changes. The web is the first platform; SwiftUI, Compose, Flutter and React Native are planned.
- 1a22c3c: Marquee text, a new component: one line of text that does not fit its place rests cut with an ellipsis and, while its
  trigger holds, moves sideways at a steady pace to show all of it. It moves only while the text overflows, never where
  motion is reduced, and is read once, whole.
  
  - Web: `<tanrei-marquee-text>` (`trigger`, `loop`, `speed`, `start-pause`, `end-pause`, `iterations`, `paused`,
    `playback-control`, `play-label`, `pause-label`; event `pausedchange`); React: `MarqueeText`. SwiftUI, Compose,
    Flutter and React Native are planned: their generated tokens carry `comp.marquee-text`, and no component yet.
  - `trigger`: `hover-or-focus` (the default), `hover`, `focus` or `always`. Focus is that of the control the line stands
    in; the line is never a focus stop. `loop`: `repeat` (a copy follows a gap behind) or `bounce`.
  - The defaults can conflict with WCAG 2.2.2 Pause, Stop, Hide, and the docs say how to meet it: `always` draws no
    playback control unless `playback-control` is set (or the page's own pause control sets `paused`; a debug build
    reports a moving line with neither), and a hover or a focus plays passes until it ends unless `iterations` is set.
  - Tokens: `comp.marquee-text` — `speed` (30 px/s), `motion.start-pause` and `motion.end-pause` (1200 ms, fixed: a speed
    and reading times the motion dial does not change), `motion.start-delay` (`sys.motion.role.show-delay`),
    `motion.easing` (`easing.linear`), `motion.return-duration` and `motion.return-easing` (`role.state.default`,
    `easing.state`), `gap`, `fade.extent`, `playback.gap`. No new sys token.
  - The product's words gain `marqueePlayLabel` and `marqueePauseLabel` ("Play scrolling text", "Pause scrolling text" in
    the English pack): the carousel's `playLabel` and `pauseLabel` name a slideshow.
  - Nothing is removed or renamed.
  - Baselines: new images for the marquee text's 7 fixtures, and one per preset — new, not changed.
- d1611cc: Meter, a new component: where a known value stands in a known range — storage used, a battery's charge, a quota, a
  password's strength — as a bar or a ring that looks like the progress indicator, without saying that anything is under
  way.
  
  - Web: `<tanrei-meter>` (`variant`, `size`, `separation`, `status`, `value`, `min`, `max`, `label`, `value-text`);
    React: `Meter`. The host is a meter (`role="meter"`, `aria-valuemin`, `-max`, `-now`, `aria-valuetext`), never a
    progressbar and never busy. SwiftUI, Compose, Flutter and React Native are planned: their generated tokens carry
    `comp.meter`, and no component yet.
  - `status` (`default`, `info`, `success`, `warning`, `error`) changes the indicator's color and nothing else. The meter
    has no thresholds: the product decides what a value means, and says it in `valueText` too.
  - Tokens: `comp.meter`. Its sizes, track, separation, stop indicator, default indicator color and motion alias the
    progress indicator's, so the two match side by side and a layer can set either apart; the four status colors are the
    status roles.
  - The token build holds every meter indicator color — the default and the four statuses — 3:1 against the meter's track
    and against every surface role, in every scheme (WCAG 1.4.11).
  - The progress indicator's determinate drawing is now a shared web primitive; nothing it draws changes.
  - Baselines: new images for the meter's 18 fixtures, and one per preset — new, not changed.
- 0a27acd: Modal layer: a new advanced component, the layer under every modal surface — the scrim over the window, everything
  behind it inert and kept from scrolling, focus moved in, kept and given back, and a close request on Escape, the
  platform's back or a press on the scrim. On the web it is `<tanrei-modal-layer>` (`ModalLayer` in React), for a modal
  surface Tanrei does not have (a command palette, a takeover of the window); the other platforms have it planned.
  
  The dialog, the modal side sheet, the modal bottom sheet, the modal navigation drawer, the image preview, the modal
  date-time picker and the search's modal views are built from it and cite its rules; the dialog, the side sheet, the
  bottom sheet and the navigation drawer are therefore composed components now. Their scrim colors and their enter and
  exit motion tokens alias the layer's new tokens (`comp.modal-layer.scrim.color`, `comp.modal-layer.motion.*`), so a
  product restyles what lies under every modal surface in one place, and each gets a `scrim.blur` token that aliases
  `comp.modal-layer.scrim.blur` (0, no blur, in every shipped system). Values are unchanged: nothing looks or moves
  differently, and no baseline of an existing component changes. The search's views keep their own open and close
  motion, which their docked view shares. Vocabulary: twelve new tokens (the layer's six, and a scrim blur for each of
  the six overlays that draw a scrim).
- 25ecc35: Navigation drawer: the row model shared with the tree view, a compact density, groups that are destinations, and the
  main action on the icons' line.
  
  - The rows take the tree view's parameters, with its names and meanings: `chevron` (`start`, the default, `end` or
    `none`), `guides` (`none`, `shown`, `hover`), `indent` (auto, or a number), `highlight` (`indented`, the default, or
    `full`), `iconSpace`, `expandable`, `labelWrap` and `supportingWrap`, a row's `supportingText` and
    `supportingPosition`, a group's trailing text and slot, `openIcon` and `loading` (named by the drawer's
    `loadingLabel`), and `stickyParents` (off by default) with `stickyMax` (2). Labels and supporting text are one line
    by default, cut, with the whole text in a tooltip on hover and keyboard focus only where cut. A collapsible drawer
    draws a start chevron at the end, so its icons keep their places in both forms. Visual change: groups now draw their
    chevron at the start by default, a nested row's fill begins at its indent, and a long label is one line — every
    drawer baseline with groups or long labels is recorded again.
  - `density`: `regular` (the default, the menu item's 48 row) or `compact`, a tree view's compact row for a tool used
    with a pointer whose drawer lists many places: 32 rows with 16 glyphs, 8 paddings, a 2 gap between cells, 28
    headings, and a 56 column of icons when collapsed. No density changes the gap between the icon and the label. Both
    forms follow it, and a nested icon stands where its group's label starts. For touch a compact row is drawn at least
    the touch target high; for a pointer its hit area is the row and half the gap around it.
  - The vocabulary changed: thirteen tokens now hold one value per density (`regular`, `compact`) —
    `comp.navigation-drawer.container.gap`, `item.container.height`, `item.padding-inline`, `item.nest-indent`,
    `item.icon.size`, `item.icon-indicator.width`, `item.icon-indicator.height`, `item.label.typescale`,
    `item.trailing-icon.size`, `collapsed.container.width`, `collapsed.item.container.width`,
    `collapsed.item.container.padding-block` and `heading.height`. A layer that set one of them sets its `.regular` value
    now (the shipped presets do); the CSS custom properties gain the same suffix
    (`--tanrei-comp-navigation-drawer-item-container-height-regular`). The Figma variables are renamed in place. New
    tokens: `item.padding-block` (per density), `item.supporting-text.typescale` and each condition's
    `item.supporting-text.color`, `guide.color` and `guide.width`, `sticky.container.color`, `sticky.divider.color` and
    `sticky.divider.width`.
  - `selectableGroups` (off by default): a group with a `value` or an `href` is then a destination as well. Its row
    chooses it — `change` or `reselect`, the current page, a link with an `href` — and never opens or closes it; its
    chevron (or, without one, its icon) is a control of its own, after the row in the focus order, that alone opens and
    closes it (the WAI-ARIA Authoring Practices' disclosure navigation menu with top-level links). Collapsed, its cell
    chooses it. `revealSelected` also opens a group that is itself the selected destination.
  - The main action's glyph stands on the destinations' icon line in both forms, at every size of the button, in both
    densities and every shipped system, in either direction, and with a start chevron: the drawer places the button from
    its own tokens by a margin on its own box around the slot, so a page's reset no longer moves it. A collapsed square
    wider than the column (the large main action in the default system) and a trailing glyph are reported.
  - Web: all of it, with tests. SwiftUI, Compose, Flutter and React Native stay lagging: none of it is built there yet,
    and their drawers still read the drawer tokens by the names they had before this change.
- fb1ce26: Tabs, navigation drawer, page header and app shell: decisions from the web review.
  
  - Tabs: the selected tab answers hover and press. Its state layer is drawn over the active indicator, in the color of the
    content the indicator covers: `comp.tabs.primary.selected.state-layer.color` and
    `comp.tabs.secondary.selected.state-layer.color` now alias their `selected.covered-label.color`, as the tonal one
    already did.
  - Tabs: the selected label can gain weight, so that a selection drawn by a faint indicator is not told by color alone
    (WCAG 1.4.1). New tokens `comp.tabs.primary.selected.label.emphasis`, `comp.tabs.secondary.selected.label.emphasis`
    and `comp.tabs.tonal.selected.label.emphasis`: 0 for primary and secondary, and `sys.typescale.emphasis.label` for
    tonal in the default system, in every contrast and theme. Every tab keeps the width its label needs at the heavier
    weight, so nothing in a row moves when the selection does.
  - Tabs: whether a primary tab stacks its icon above its label is a token of each size, `comp.tabs.icon.placement.medium`
    (`stacked`) and `comp.tabs.icon.placement.small` (`inline`). A size a design system adds declares its own, and one
    that declares none is drawn as medium is.
  - Navigation drawer: a nested destination's item container — its fill, state layer and focus ring — keeps the full width
    of a top-level row; only its icon and label start `comp.navigation-drawer.item.nest-indent` further in per level.
  - Navigation drawer: the header slot gives what it holds an inherited text style and color, new tokens
    `comp.navigation-drawer.header.typescale` (`sys.typescale.heading-5`) and `comp.navigation-drawer.header.color`
    (`sys.color.on-surface`): plain text placed there is no longer drawn in the browser's default font, and an element
    that sets its own style keeps it.
  - Page header: one row of actions beside the title stays centred on the title's first line, however tall, as before;
    actions that wrap onto more than one row now start at the line's top and the head grows to hold them, instead of
    standing out of the head above and below. The element marks this with the `data-actions-wrapped` state attribute;
    the stylesheet alone keeps centring every row.
  - App shell: the web note now says that with `scroll="main"` an aside stacked above or below the main region does not
    yet scroll with it.
  - Docs: the sidebar opens only the groups that hold the page being read.
  
  The vocabulary grows by the tokens named above (`tokens/vocabulary.lock.json`). The tonal-icons fixtures' first tab is
  now "Board", so the row still fits its stage at the heavier label.
  
  Web baselines re-recorded for these intended changes: the tonal tabs fixtures (the heavier selected label and the room
  kept for it), the navigation drawer fixtures with nested destinations or text in the header slot. No page header baseline changes: its fixtures' actions fit on one row.
- 07507aa: Number ticker, a new component: a number that changes — a count, a price, a score, a dashboard's figure — shown by
  moving each changed digit to its new value, so that a person sees that it changed, which way and roughly by how much,
  while assistive technology is told only the value it settles on.
  
  - Web: `<tanrei-number-ticker>` (`value`, `number-style`, `currency`, `unit`, `notation`, `fraction-digits`,
    `sign-display`, `locale`, `trend`, `animation`, `start-value`, `duration`, `live`, `label`; event `settle`); React:
    `NumberTicker` (`onSettle`). The number is written by `Intl.NumberFormat` in the locale (its digits, separators,
    symbols and short forms), in the text style of where it stands, in tabular figures. SwiftUI, Compose, Flutter and
    React Native are planned: their generated tokens carry `comp.number-ticker`, and no component yet.
  - `trend`: `auto` by default — every changed digit moves the way the whole number moved, so 19 to 20 moves both digits
    up — or `digit`, `up`, `down`. `animation`: `slide` (the default system's), `blur`, `blur-slide`, `flip` or `none`;
    `auto` reads `comp.number-ticker.animation`.
  - The width moves with the digits (the shared size transition); a change during another goes on from what is drawn;
    under reduced motion the new number is there at once. Not a live region by default; `live="polite"` tells the
    settled value once per change.
  - Tokens: `comp.number-ticker` — `animation`, `motion.duration` (the large resize role), `motion.easing` (spatial),
    `motion.stagger`, `motion.reduced-duration` (the reduced role), `blur.radius`, `blur-slide.distance`. No new `sys`
    token.
  - Glyph list: `flip` and `percent` join the names the components may draw, as values of the ticker's props.
  - Baselines: new images for the ticker's 7 fixtures, and one per preset — new, not changed.
- 2087222: Resizable frame (`<tanrei-resizable-frame>`, React `ResizableFrame`): a box whose width and height a person changes by
  a Handle on its edge or its corner, from the keyboard, or by pressing the handle without a drag. Built from Handle.
  
  - Two looks: `outlined` (the default), a box with rounded corners and one hairline, its handles outside it so that they
    cover nothing and drawn at rest while a mouse is over the frame — where a preview is checked; and `plain`, which draws
    nothing of its own, the content filling the box with its own surface and each handle centred on its edge and out of
    sight until used — the edge of a navigation drawer or a side bar.
  - `handles`: any of `start`, `end` (the default), `bottom` and `bottom-end`. `start` is for content at the end of a
    layout (a side bar); the box then stands at the end of its room.
  - `width` and `height` (null: the layout's, or the content's height), `minWidth` (320 by default, the reflow width of
    WCAG 1.4.10), `maxWidth` (the room the layout gives), `minHeight`, `maxHeight`, `snapWidths` (a drag snaps to each),
    `step` and `largeStep`.
  - Each handle is a separator whose value is its size in pixels (the window splitter pattern): the arrows, Page Up and
    Page Down, Home and End. Pressing it switches between the greatest size and the one before it, so no size depends on
    a drag (WCAG 2.5.7). A key or a press moves the size by the resize role; a drag is followed without a motion.
  - Events: `resize` in every frame of a drag, `change` once a person has changed the size; neither for a size the
    product sets. While a drag lasts, no `<iframe>`, `<object>` or `<embed>` in the content takes the pointer.
  - `sizeIndicator`: `none`, `active` (while a handle is held or has keyboard focus, the default) or `always` — a
    "390 × 640" label in the box's top-end corner, in the page language's digits, written left to right, hidden from
    assistive technology.
  
  The spec schema has a new prop type, `numbers` (a list of numbers), which `snapWidths` is; `validate` checks a numbers
  prop's fixtures.
  
  New tokens `comp.resizable-frame.*` (the outlined box's corners and edge, the least width and height, the handles'
  gap, the snap distance, the size indicator, the motions by role). No sys token is added. The web is the first platform;
  SwiftUI, Compose, Flutter and React Native are planned. New baselines: one per Resizable frame fixture, and the
  `indicator-always` fixture under each shipped preset. No existing baseline changes.
- 590e070: Scroll area, a new component, and one system-wide choice of how the edge of a box that scrolls is marked while content
  lies beyond it.
  
  - Web: `<tanrei-scroll-area>` (`scroll-edge`, `edges`, `label`); React: `ScrollArea`. It keeps the browser's own
    scrolling and scroll bars, and draws no fill, edge or corner of its own. While it scrolls and holds nothing focusable
    it is one focus stop and a region named by `label` (WCAG 2.1.1). SwiftUI, Compose, Flutter and React Native are
    planned: their generated tokens carry `comp.scroll-area` and the new choice, and no component yet.
  - New core vocabulary: `sys.behavior.scroll-edge` — `shadow` (the default system's: a band in the color of the surface
    the box stands on, not a fixed shadow color), `fade` (the content itself fades out toward the edge, for a transparent
    surface, a picture or a video behind it), `line` and `blur` (a progressive blur). m3-like draws `line`, cupertino
    `blur`. Its amounts are `sys.scroll-edge.extent` (24) and `sys.scroll-edge.blur.extent` (48), `.radius` (8) and
    `.layers` (4). A platform that cannot blur draws `shadow`; forced colors draw the line in the text color.
  - `sys.behavior.divider-visibility` is unchanged: it says when the line of a region that stays in place stands;
    `scroll-edge` says what marks the edge of a box that scrolls.
  - Whether content lies beyond an edge is read from an intersection notice on a mark at each end of the content, never
    from a scroll listener or a layout read in a frame of a scroll.
  - Tokens: `comp.scroll-area`. `comp.scroll-area.shadow.color` defaults to `sys.color.surface`; set it (on the web, the
    `--tanrei-comp-scroll-area-shadow-color` custom property) to the surface the area stands on.
  - Nothing is removed or renamed.
  - Baselines: new images for the scroll area's 7 fixtures, and one per preset — new, not changed.
- cb29df6: Tokens: `sys.state.selected-state-layer-opacity` (0.16, twice the hover layer) is the quiet selection's step. A
  list's selected option, a menu's current link item and its checked row (at medium and high contrast), the chosen
  option of a select and a combobox, the tonal tabs' indicator and the tint inside a checked radio ring now take it,
  where each wrote 16 % itself; a design system that sets it moves them all together. The vocabulary grows by this one
  token (CSS `--tanrei-sys-state-selected-state-layer-opacity`, and `selectedStateLayerOpacity` in each platform's
  state group). Every shipped system keeps the value it drew, so nothing looks different and no baseline moves.
- 1f0c823: **Breaking — Switch, Radio button, Tabs, Tab view.** A state prop is named as HTML names it, in the specs and on the
  web, so a person who knows a native control knows Tanrei's.
  
  - Switch: `selected` is now `checked`, as on a native checkbox: `<tanrei-switch checked>`, `<Switch checked={on}>`.
    The attribute is still the default a form reset returns to. `selected-icon` / `selectedIcon` and `unselected-icon` /
    `unselectedIcon` are now `checked-icon` / `checkedIcon` and `unchecked-icon` / `uncheckedIcon`. `change` carries
    `detail.checked` instead of `detail.selected`. The old names are gone: there is no alias, and an old attribute or
    property does nothing.
  - Radio button: the spec's `selected` is now `checked`, the name the web element already had. Nothing changes on the
    web.
  - Tabs and Tab view: the spec's `selected` is now `value`, the name the web elements already had, as a `<select>`'s.
    Nothing changes on the web.
  
  SwiftUI, Jetpack Compose, Flutter and React Native keep their own names for these props (`isOn`, `checked`, `value`,
  `selection`, `selectedValue`, …); only the specs' names changed. The fixtures and the tokens keep the conditions they
  draw (`selected`, `unselected`), so no baseline changes.
- 0a27acd: Swatch: a new component that shows a color as a sample with its name beside it (`specs/swatch.spec.json`,
  `<tanrei-swatch>` on the web, `Swatch` in React). The sample is exactly the color it is given — the hexadecimal
  notation every platform reads (`#0f766e`, `#0f766e80` with an alpha), and on the web any CSS color, a role's custom
  property included — over a checkerboard that a translucent color lets through, edged by the divider's hairline so that
  a color close to the surface still shows where it ends. Three sizes (16, 24, 32), a square or a circle. Because a color
  is never told by its sample alone, the name is drawn beside the sample by default, with an optional supporting line
  for the value; `labelHidden` draws the sample alone and makes the name its accessible name, and `decorative` hides a
  swatch that stands beside the same name in text. It is not a control and not a picker. New component tokens:
  `comp.swatch.*` (container size and shape, checkerboard, outline, gap, label and supporting text). Implemented on the
  web; the native platforms are planned. New web baselines are recorded for every swatch fixture and for the translucent
  fixture under each shipped preset.
- 348b6be: Table: a body row that can be chosen is one target for a pointer, as a clickable card is. With `selection="multiple"`,
  a press anywhere on the row — its text, its padding, its row header — changes the row's checkbox, with the same
  `selectionchange` as a press on the checkbox. A link, a button, a field, a label or anything else in a cell that takes
  a press keeps its own press and cursor, and the row is drawn at rest while the pointer is over it; a drag, a release
  that ends a text selection (the text stays selectable and copyable), a press with a modifier key, another mouse
  button, the second click of a double click and a click the product cancels change nothing. The header's checkbox
  keeps its own cell, and a footer row, a placeholder row and a row without a value take no such press. The keyboard
  stays on the checkbox: the row gets no role, no focus stop and no selected state.
  
  Under a fine pointer the row is drawn hovered as a whole, with the pointer cursor, and a press draws it pressed for
  press-hold, from new tokens of the row's own — `comp.table.row.unselected` and `comp.table.row.selected`, each with a
  `state-layer.color` and hovered and pressed container and text colors — laid over the stripe or the chosen fill.
  Under a system whose press is a ripple the row takes the pressed fill (a ripple has no one box across a row's cells),
  and under `cupertino` the row has no hover and dims when pressed. It needs the element's script: without it a row
  shows neither a state nor the pointer cursor (the selection cell no longer shows the pointer without script either),
  and a press beside the checkbox changes nothing. The look at rest is unchanged in every shipped system.
  
  The native packages carry the new row tokens in their generated table tokens (plain fields such as
  `rowSelectedHoveredContainerColor`); their table is not implemented yet.

### Patch Changes

- 4e905c9: Popover, Select and Combobox: an anchored surface appears as every surface does, and leaves the way it came. **Breaking**
  (a motion 0.1.0-next.0 shipped): the open and close motions of the three change in the default system, and reduced
  motion is a fade instead of an appearance at once.
  
  - The popover's container and the select's and the combobox's list start from `sys.motion.appear.*` — opacity 0 and
    scale 0.96 under the default system — grown from the middle of the edge that faces the anchor (from their centre
    where `sys.motion.appear.origin` is center, or while they cover their anchor), and leave the same way back. They no
    longer unfold from a height of 0, and no longer only fade as they close.
  - Under the `unfold` appearance (m3-like and m3-expressive-like) they unfold from that edge at their full width, and
    fold back the same way, on Material's durations and curves as before.
  - Where motion is reduced they fade in and out over `sys.motion.role.reduced` (100 ms), with no scale, distance or blur.
  - A popover written open in the page's markup appears in the first frame without its motion; one mounted open after
    the page was first painted plays its entrance.
  - Changed tokens: `comp.popover.motion.open-duration`, `comp.select.motion.open-duration` and
    `comp.combobox.motion.open-duration` alias `sys.motion.role.appear.anchored.enter` (300 ms in the default system,
    was 200); the `close-duration` tokens alias `role.appear.anchored.exit` (250 ms, was 100); the `open-easing` tokens
    alias `sys.motion.easing.enter` (standard, was emphasized-decelerate) and the `close-easing` tokens
    `sys.motion.easing.exit` (standard-accelerate, was emphasized-accelerate). The menu's four open and close tokens alias
    the same role and curves (a select's list keeps the menu's values): the menu opens and closes as it did, on the
    anchored role's durations and curves. m3-like's roles give the values the four drew before.
  - The popover's arrow elevation filter is set on its placed box, so that the moving part keeps `filter` for the
    appearance's blur. `anchoredSurfaceStyles()` takes `enter` and `exit` (was `open` and `close`).
  
  SwiftUI, Compose, Flutter and React Native have no popover, select or combobox yet; their generated tokens carry the
  new values. Baselines are unchanged: the fixtures are drawn at rest.
- bf5b6de: App bar: a brand, the product's logo as the link to its first page (APB-19 to APB-24). `brand-href` (`brandHref`) is
  the address and `brand-label` (`brandLabel`) the product's name: the bar draws one link, named by it, around the images
  the product gives, and hides the images from assistive technology. The images: one logo file (`slot="brand"`), the
  symbol (`slot="brand-symbol"`), the wordmark (`slot="brand-wordmark"`), or both — side by side by default
  (`brand-layout="lockup"`), or by the window's width (`brand-layout="responsive"`: the wordmark while the window is
  medium or wider, the symbol while it is compact, the enclosing app shell's window class or, outside one,
  `sys.breakpoint.medium`). The brand stands after the navigation item in an icon button's cell, so that a symbol stands
  where an icon does, and takes `comp.app-bar.brand.color` where its images have no colors of their own. New tokens:
  `comp.app-bar.brand.symbol.size` (`sys.icon.medium`), `brand.wordmark.height` (40), `brand.image.height`,
  `brand.lockup.symbol.size` (the wordmark's height: a lockup's symbol stands at the wordmark's height, APB-24),
  `brand.lockup.gap` (`sys.space.space100`), `brand.lockup.alignment` (`center` | `start` | `end`), `brand.shape`
  (`sys.shape.corner.full`) and `brand.color` (`sys.color.on-surface`), in every platform's generated tokens; the native
  platforms do not draw the brand yet, and their notes say so. A slot of a spec can now say its fixture strings are marks
  (`mark`: `symbol` or `wordmark`, drawn from design/brand/). New baselines: app bar `small-brand`, `small-brand-symbol`,
  `small-brand-wordmark`, `small-brand-lockup`, `small-brand-responsive`.
  
  Brand: the wordmark as updated in the design file — the symbol's T followed by "anrei" in Outfit SemiBold — and the
  copies, the social image and the README's header derived from it again.
  
  Documentation site: the header shows Tanrei's wordmark as the app bar's brand at every width (it stood as a link in the
  navigation slot, which holds one button). The brand page takes the place of Foundations › Principles in the six
  languages, and the old address leads to it: the marks drawn from their files in light and dark, where each goes (the
  wordmark wherever the name is read; the symbol only where a square or round shape is required, or for quiet promotion
  and decoration), clear space and minimum size measured from the marks, the favicon as the one exception to the minimum
  size, Do and Don't, the system's character, and the use of the marks by others.
- f1e78ee: App bar: a `context` slot for one control of the product's context after the brand (APB-25) — a Button, or a Button
  that opens a Menu, that says and changes the workspace, the project or the design system the screen is in. The bar
  places it `comp.app-bar.actions.gap` after the brand's cell (after the navigation item where there is no brand), centred
  on the row, before the title block and the actions in reading order, and never restyles it. Additive: nothing changes
  for a bar without it, and no token is new. The native platforms do not draw it yet, and their notes say so.
- 48873d6: Bottom sheet: a header with a headline and a small tonal close button.
  
  Every close button is the same control: an icon-only Button of the small size with the close glyph, tonal unless a
  system re-values it. The bottom sheet had none — its ways out were the drag handle and, for a modal sheet, the scrim —
  so a standard sheet, or a sheet without a handle, needed a Close button of the product's own.
  
  - New props, with the side sheet's names and meanings: `headline` (drawn in a header below the handle's row, a heading
    that names the sheet where `label` is empty), `closable` (false by default: the handle and the scrim stay the sheet's
    ways out), `closeLabel` (the close button's name; on the web `close-label`) and `dividerVisibility` (`auto`, `always`,
    `scroll`; on the web `divider-visibility`). The header stays while the content scrolls, and the sheet's heights count
    it.
  - `close` gains the reason `close`: a press of the close button, in either form and whatever `dismissible` says, since
    it is a way out the product chose to draw.
  - Debug builds report a close button without a name, a sheet with neither `label` nor `headline`, and a sheet with no
    handle and no close button that can still be dismissed (nothing on screen says how).
  - New tokens: `comp.bottom-sheet.header.height`, `.header.gap`, `.header.padding-inline-end`, `.headline.typescale`,
    `.headline.color`, `.divider.color`, `.divider.width`, `.divider.visibility` and `.close-button.variant` (tonal).
    `m3-like` (and so `m3-expressive-like`) sets the variant to text, Material 3's standard icon button; `cupertino` keeps
    the tonal circle.
  
  SwiftUI, Compose, Flutter and React Native are lagging and do not draw the header yet. Baselines: three new fixtures,
  `modal-header`, `no-handle-header` and `standard-header`; the existing ones do not change.
- 930031d: Button: `destructive` marks an action that deletes or discards something a person may not get back (Delete, Discard,
  Remove member). It goes with every variant and keeps that variant's emphasis, in the error color role: filled is the
  error color with on-error, tonal the error container with on-error-container, and elevated, outlined and text keep
  their own container with the label, the icon (and an outlined button's edge) in the error color. Disabled, a
  destructive button looks like any disabled button of its variant. A toggle ignores it, and a debug build reports the
  pair. It adds a color and no semantics: the label still says what is destroyed. An icon-only button and a dialog's action
  that takes the dialog's variant take it too; the Button group's and the dialog's guidance now name it
  as the look of a destructive confirming action.
  
  The vocabulary grows: `comp.button.<variant>.destructive.{container,label,icon,outline,state-layer}.color` and their
  per-state tokens, in every platform's generated tokens and in every shipped system, where they follow the error roles.
  The native platforms map the prop (SwiftUI: `role: .destructive`) and do not draw it yet; their notes say so.
  
  New baselines, the intended result of this change: button `filled-destructive`, `tonal-destructive`,
  `elevated-destructive`, `outlined-destructive`, `text-destructive`, `filled-destructive-leading-icon`,
  `text-icon-destructive`, `filled-destructive-disabled` and `outlined-destructive-disabled`. No existing baseline
  changes.
- 6b01d3e: Button: the `inline` variant of the previous prerelease work is withdrawn before any release carried it. An action
  drawn as a link that is not a link only leaves people unsure what it will do: an action that belongs to a passage of
  text is a text Button after it, and a destination is a Link. The `comp.button.inline.*` tokens go with it (in every
  platform's generated tokens), and Theme Studio and the docs hero use text Buttons again.
  
  Button and Main action button: `full-width` (`fullWidth`) makes the control as wide as its container, at the height of
  its size, its icon and label centred and a label that does not fit wrapped. A Button that a host lays out — a button
  group, a toolbar, the actions of a dialog or a popover — takes the host's width and ignores it; a full-width Main action
  button stays extended. New baselines: button `full-width` and `full-width-leading-icon`, main action button
  `filled-full-width` and `filled-full-width-collapsed`. The native platforms do not draw `fullWidth` yet; their notes
  say so.
- 68c45ed: Button with menu: `destructive` marks a main action that deletes or discards something a person may not get back
  (Delete, with "Delete all versions" in its menu). Both halves keep the variant's emphasis and take the error color role
  in it, as a destructive Button of the same variant does: filled is the error color with on-error, tonal the error
  container with on-error-container, and elevated and outlined keep their own container with the label and the chevron
  (and an outlined one's edge and divider) in the error color. Each half shows hover, focus and press from the destructive
  parts of its own state. Disabled, it looks like any disabled button with menu of its variant. It is not passed to the
  menu's items: an item that deletes carries its own `destructive`. It adds a color and no semantics: both halves keep
  their roles, names and states, and the label says what is destroyed.
  
  The vocabulary grows: `comp.button-with-menu.<variant>.destructive.{container,label,outline,divider,state-layer}.color`
  and their per-state tokens, in every platform's generated tokens and in every shipped system. Container, label and
  outline alias Button's `comp.button.<variant>.destructive.*`, so the two components agree; the divider keeps the
  variant's own (an outlined one's is its edge color, as without destructive). The native platforms map the prop
  (SwiftUI: `role: .destructive`, on the leading half) and do not draw it yet; their notes say so.
  
  New baselines, the intended result of this change: button-with-menu `filled-destructive`, `tonal-destructive`,
  `elevated-destructive`, `outlined-destructive`, `filled-destructive-gap`, `filled-destructive-narrow`,
  `filled-destructive-disabled` and `filled-destructive-open`. No existing baseline changes.
- d5e0409: Callout: the close button is a small tonal Button. **Breaking**: the callout's own close-button tokens, which
  0.1.0-next.0 shipped, are removed.
  
  Every close button is the same control: an icon-only Button of the small size with the close glyph, in the variant its
  host names. The callout's close button was a button of its own, drawn from 72 color tokens of the callout's; it is now
  a `<tanrei-button size="small">` in the variant `comp.callout.close-button.variant` names — tonal in the default
  system — that reads Button's own tokens and answers hover, focus and a press as every Button does. On a tonal callout it
  is drawn in the callout's own text color (the body color of its status), as a translucent circle of that color with the
  glyph in it, so that it shows on the fill of every status; its glyph keeps at least 6:1 against it in every status and
  color scheme of the default system. On an outlined callout, which has no fill, it is the tonal Button as it is anywhere
  else.
  
  - Removed tokens: `comp.callout.close.*` (the container, content and state-layer colors of six forms, at rest and
    hovered, focused and pressed), `comp.callout.focus-ring.color.*` and `comp.callout.<status>.focus-ring.color.*`,
    `comp.callout.controls.height`, `.controls.shape`, `.controls.icon.size`, `comp.callout.motion.*` and
    `comp.callout.hovered.opacity`, `.focused.opacity`, `.pressed.opacity` — and their `--tanrei-comp-callout-*` custom
    properties. A layer that set one of them sets `comp.callout.close-button.variant`, or the callout's body colors, or
    Button's tokens instead.
  - New token: `comp.callout.close-button.variant` (tonal). `m3-like` (and so `m3-expressive-like`) and `cupertino` set
    it to text, keeping the bare glyph they drew. The close button now takes each system's small Button size: 28 under
    `cupertino` and 40 under `m3-expressive-like`, where it was 32, and its glyph the small Button's.
  - `cupertino` sets the hover and focus state-layer opacities to 0, as its rules already kept every container at rest;
    a Button on a colored surface and a carousel item over its image now draw no hover or focus layer there either. Its
    open menu bar title keeps its fill.
  - The `close` CSS part is now `close-button`, as the popover's and the side sheet's are. The callout itself has no
    states.
  
  SwiftUI, Compose, Flutter and React Native have no callout yet; they lose only the tokens. Baselines: the default
  system's closable callouts (`closable`, `closable-outlined-info`, `closable-title-actions`, `closable-actions-rtl`,
  `long-title`) and each preset's `closable-title-actions` are recorded again; that is the intended result of this change.
- 6d5fe67: Checkbox: **breaking** — `comp.checkbox.mark.width` is removed (`--tanrei-comp-checkbox-mark-width` on the web, and the
  generated token on every platform). No behaviour of the checkbox reads it: the check and the dash are glyphs of the
  icon set, sized by `mark.size` and weighted by `mark.weight`. It was kept only for implementations that still drew the
  mark as paths; a 0.x prerelease keeps no token for an old implementation. A layer that set it drops the line. The
  native platforms, which still draw the mark (and the menu's and the list's checks) as paths, owe the change with
  the rest of their catch-up.
- 90c0631: Copy button: `labelWidth` (`label-width` on the web), `widest` or `fit`. `widest`, the default and the behaviour until
  now, keeps the labelled form as wide as the widest of its three texts, so nothing beside it moves when its words change.
  `fit` makes it as wide as the text it shows and eases the width to the new text over two new tokens,
  `comp.copy-button.motion.resize-duration` and `resize-easing` (aliases of the standard default-spatial spring, as the
  main action button's resize), at once where motion is reduced (CPY-19). The vocabulary grows by those two tokens; the
  native platforms carry them in their generated tokens and owe the prop when they build the copy button. One new
  baseline, `labelled-fit`; no other image changes.
- 3b0cc7e: Dialog: a choice of width, and the reason of a dismissal.
  
  - `width`: `content` (the default, as before: as wide as its widest part, between the minimum and maximum width),
    `small`, `medium` or `large` — new tokens `comp.dialog.width.small`, `.medium` and `.large` (400, 560, 800). A fixed
    width is never wider than the window less the margins; a compact window places every width as it places content.
  - The web's `cancel` is now a CustomEvent whose `detail.reason` is `escape`, `back` or `scrim`. It is still
    cancelable, and a listener that reads it as a plain Event is unchanged.
  
  SwiftUI, Compose, Flutter and React Native receive the new tokens only; the widths and the reason wait for those
  platforms to catch up. Baselines: the fixtures `width-small` and `width-large` are new; no existing baseline changes.
  (This change once also brought a close button; it was withdrawn before any release, see the dialog's "no close
  button" changeset.)
- aacef9e: Dialog: a dialog has no close button. **Breaking** for anyone building from the main branch: the close button that
  came in after 0.1.0-next.0 is withdrawn before any release carried it (0.1.0-next.0 never had it).
  
  A dialog asks for a decision, and its way out without one is its dismissive action and, while it is dismissible,
  Escape, the platform's back and a press on the scrim. Content that needs only a way out belongs in a side sheet, which
  has a close button, or a bottom sheet.
  
  - Web: `closable` and `close-label` are gone from `<tanrei-dialog>` (and `closable` and `closeLabel` from the React
    `Dialog`). Given either, the dialog draws nothing for it, and debug builds report that a dialog has no close button.
    Give the dialog a dismissive action instead: Cancel, or Close where there is nothing to cancel.
  - `cancel`'s `detail.reason` is `escape`, `back` or `scrim`; `close` is no longer one of them.
  - The `close-button` CSS part and the token `comp.dialog.close-button.variant`
    (`--tanrei-comp-dialog-close-button-variant`) are removed. The header is the icon and the headline alone.
  
  SwiftUI, Compose, Flutter and React Native never had the close button; they lose only the token. Baselines: the
  fixtures `closable` and `compact-closable` are removed with their images; no other baseline changes.
- 654a435: Figure: a ground pattern behind what is shown (`pattern`, FIG-26).
  
  - **The prop.** `pattern` is `none` (the default), `grid` (a hairline every `comp.figure.pattern.spacing`, across and
    down), `dots` (a dot of `pattern.dot-size` at every crossing of that grid), `grid-fade` (the grid, clear around the
    stage's centre to `pattern.clear-extent` of the way to its corners and at full strength at the corners — the ground
    the documentation's live examples have always had) or `checkerboard` (squares of `pattern.checkerboard-size`, for a
    picture that may be transparent). It is drawn across the stage over the look's fill and under the content, centred,
    still while the content scrolls and the same in either direction.
  - **Decoration only.** No element, no input, nothing exposed to assistive technology. It is drawn in
    `surface-container-highest`, a step from both fills that a raised contrast level leaves as it is, so it is seen in
    every scheme and never louder than the content; on-surface text and the focus indicator are held against that role by
    the token invariants. The plain look draws none, and forced colors remove it (FIG-20). A value the figure does not
    define draws none and is reported in debug builds.
  - **Tokens.** New in `tanrei.comp.figure`: `pattern.color`, `pattern.spacing`, `pattern.line-thickness`,
    `pattern.dot-size`, `pattern.checkerboard-size` and `pattern.clear-extent` (the vocabulary grows by these six). The
    rule that a ground pattern is the product's decoration is replaced by this prop.
  - **Web.** `<tanrei-figure pattern="grid">`: the stage's own `background-image`, drawn by `@tanrei/web/figure.css`
    before and without script; the values are read on the stage, so a stage scoped to another system draws that system's
    pattern on its fill. A look a design system adds draws its pattern on its own fill. The React wrapper passes `pattern`
    through.
  - **Native platforms.** Planned: each spec entry names `pattern` in its planned API; nothing is drawn yet.
  - **Baselines.** New fixtures `pattern-grid`, `pattern-dots`, `pattern-grid-fade`, `pattern-checkerboard`,
    `filled-pattern-grid`, `filled-pattern-dots`, `plain-pattern-grid`, `title-pattern-grid-fade` and `pattern-dots-rtl`.
    The fixtures `docs-demo`, `docs-demo-code` and `docs-demo-system` now carry `pattern: grid-fade`, as the documentation
    draws them, and their baselines change for that reason (the default system's and each preset's).
  - **Documentation.** The live examples (`DemoFrame`) and the landing page's specimen draw their grid with the Figure's
    `grid-fade` pattern instead of a hand-drawn layer; the figure page shows the five patterns and when to use each.
- a72bfbb: Image preview: the bar's zoom out, zoom in and close controls are small tonal Buttons. **Breaking** (a look and a size
  0.1.0-next.0 shipped): they were medium text Buttons.
  
  Every close button is the same control: an icon-only Button of the small size with the close glyph, tonal unless a
  system re-values it. The image preview's close control is drawn so, and the zoom controls beside it the same way, so
  that one row of the same kind of control is drawn one way. Each is 32 × 32 in the default system (was 40), keeps the
  Button's own minimum target, and answers hover, focus and a press as any Button does. Previous and next are not close
  controls and stay medium.
  
  - Changed token: `comp.image-preview.bar.button.variant` = tonal (was text).
  - Changed token: `comp.image-preview.bar.gap` = `sys.space.space150`, 12 (was 4), so that a 32 control and the gap still
    make the 44 of `sys.target.pointer` and each whole target stays apart from the next.
  - `m3-like` (and so `m3-expressive-like`) and `cupertino` set `comp.image-preview.bar.button.variant` to text, the look
    they had. The controls still take each system's small Button size (32 under `m3-like`, where they were 40), which a
    pin cannot keep.
  
  SwiftUI, Compose, Flutter and React Native have no image preview yet; their generated tokens carry the new values.
  Baselines: every image preview fixture draws the bar and is recorded again, in the default system and under each
  preset; that is the intended result of this change.
- 5287d31: Menu: a checked row is told by its mark, and the one filled row is the page the person is on.
  
  - **A checked checkbox or radio item has no fill at standard contrast** in the default system. It already shows its
    box, ring or check, as the menus of macOS, iOS and Fluent 2 show theirs. At medium and high contrast, where a person
    has asked for stronger cues, it keeps the fill it had (a layer of the row's content color, twice the hover layer).
    The menu reads `comp.menu.selected.container.color` in the scheme it is drawn in and decides nothing by the scheme
    itself; a design system values that token for each contrast scheme. A disabled checked row follows it: no fill at
    standard contrast, the neutral disabled fill at medium and high.
  - **The current link item has a condition of its own**, `current`, with tokens `comp.menu.current.*`. It has no mark,
    so it keeps its fill, `comp.menu.current.container.color`, in every contrast scheme. The menubar's current link item
    aliases these tokens, so the place the person is on is drawn the same in the bar and in a menu. In m3-like and
    cupertino, which give a checked row no fill, the current link item now has the default system's fill instead of none.
  - **The select's and the combobox's chosen option** follows the menu's checked row: it carries the check, and has no
    fill at standard contrast in the default system.
  - **Tokens: a context map may name a token.** The amount of a `mix` or `alpha` rule may be a context map whose entries
    are numbers or references (`[0, "{tanrei.sys.state.disabled-container-opacity}"]`). Each scheme's document writes
    the rule with that scheme's amount, and every platform states such a color per scheme.
  
  Vocabulary: the menu's state variants gain `current` (ten color parts, each in four states). Snapshot baselines change
  where a checked menu row, or a select's or combobox's chosen option in an open list, is drawn at standard contrast.
- 712e7d2: Menus, the menubar, chips, the segmented button, the tag group and the chip field follow the owner's web review.
  
  - **Menu: the link item of the current page.** A link item takes a new `current` prop. It is exposed as the current
    page (`aria-current="page"` on its anchor) and drawn with the fill of a checked row
    (`comp.menu.selected.container.color`) and that condition's colors, with no check and no heavier label: the current
    page is where the person is, not a choice, and a fill alone marks it, as a navigation drawer marks its current
    destination. In forced colors, which remove the fill, a line in the link color marks it. The menu never sets it;
    without `href` it is ignored and reported. New fixture `links-current`.
  - **Menubar: the current link item is filled, not bold.** It is drawn from a new `selected` condition
    (`comp.menubar.selected.*`, aliasing the menu's selected row), at its label's own weight, so the current page looks
    the same in the bar and in a menu; a folded one is the menu's own current link item. In forced colors a line in the
    link color marks it. The `link-current` baseline changes.
  - **Menubar: an indicator on menus in a mixed bar.** While a bar holds both menus and bar items, each menu's title
    ends in the icon set's `expand_more` at the new `comp.menubar.indicator.size` (`sys.icon.small`), `container.gap`
    after the label, so a person sees which entries open a menu. A bar of menus only is unchanged. The `mixed`,
    `mixed-open`, `mixed-many` and `mixed-rtl` baselines change.
  - **Menu: a gap cuts the sheet.** Under `separation="gap"` each group, and each run of items outside a group, is a
    sheet of its own (the surface's color, corners, padding and elevation), `comp.menu.group.gap` apart, instead of
    empty space on one sheet. The divider form, the default, is unchanged. The `groups-gap` and `group-titles-gap`
    baselines change.
  - **Chip and segmented button: the check is a control's own mark.** The check of a selected filter chip and of a
    selected segment is drawn at new tokens `comp.chip.check.weight` and `comp.segmented-button.check.weight`, which
    alias `sys.icon.mark.weight` (500 in the default system, the checkbox's), instead of `sys.icon.weight` (300). The
    presets fix the mark weight to their icon weight, so they look the same. Baselines that show a selected filter chip
    or a selected segment change subtly.
  - **Tag group: the default spacing is `chips`.** A set whose `spacing` is not written now stands as far apart as a
    set of chips must; a set of static tags says `spacing="tags"`. The tag group still gives each chip its own Tab stop;
    the docs show a toolbar of toggle buttons for a row of filters that should be one Tab stop.
  - **Chip field: read-only ends with the chips.** A read-only text input with entries and no typed text keeps no room
    for typing, so a read-only chip field ends with its last line of chips (the `email-read-only` baseline is one line
    shorter). Disabled keeps that room. The spec now states the block padding the field already used: one line of
    entries keeps the size's height.
  
  The vocabulary grows by `comp.chip.check.weight`, `comp.segmented-button.check.weight`, `comp.menubar.indicator.size`
  and the menubar's `selected` condition. The native platforms are paused: their specs say what they lag behind.
- 727c99d: Dialog, Image preview and the modal Date-time picker: a modal surface appears as every surface does, and leaves the way
  it came. **Breaking** (a motion and three tokens 0.1.0-next.0 shipped).
  
  - The centred dialog's container, the modal picker's container and the image preview's image start from
    `sys.motion.appear.*` — opacity 0 and scale 0.96 under the default system (was 0.95) — grown about their centre (the
    image about the centre of its fit area) and risen into place by `sys.motion.appear.distance`, over their enter motion;
    they leave the same way back over their exit motion, where they only faded before. Under the `unfold` appearance
    (m3-like and m3-expressive-like) a centred surface, having no anchored edge, grows on both axes from its centre.
  - A motion turned round goes on from what it shows: a dialog, a picker or a preview closed while it enters, or opened
    again while it leaves, does not start again from nothing.
  - Where motion is reduced the container (the image) fades in and out over `sys.motion.role.reduced` (100 ms), with no
    scale, distance or blur.
  - A dialog, a modal picker or an image preview written open in the page's markup appears in the first frame without its
    motion; one mounted open after the page was first painted plays its entrance.
  - Removed tokens: `comp.dialog.motion.enter-scale`, `comp.image-preview.motion.enter-scale` and
    `comp.date-time-picker.modal.motion.enter-scale` — the scale is `sys.motion.appear.scale`, the one a system sets for
    every surface.
  
  SwiftUI, Compose, Flutter and React Native (paused): their generated tokens no longer carry the three `enter-scale`
  values, which their dialog code still reads, so it does not build until it catches up; their dialogs are lagging and take
  the appearance then (their generated tokens do not carry `sys.motion.appear.*` yet). Baselines are unchanged: the fixtures are
  drawn at rest.
- 9fd9aba: **Breaking — Pagination is now numbered page navigation, and the previous/next pair is Previous and next links.**
  
  The component called Pagination was only the pair of titled links at the foot of an article — the page before and the
  page after in a sequence of titled pages — and it was also what the docs put in a table's status line, where it does
  not belong. It is now two components, as GOV.UK and Primer tell "pagination" from "previous and next page links":
  
  - **Previous and next links** (`specs/previous-next-links.spec.json`) is the former Pagination, unchanged in behaviour
    and look under its own name. Rename in your markup and imports: `tanrei-pagination` → `tanrei-previous-next-links`
    (and `-item`, `-label`, `-title`), `@tanrei/web/pagination.css` → `@tanrei/web/previous-next-links.css`,
    `@tanrei/web/pagination` → `@tanrei/web/previous-next-links`, `observePagination` → `observePreviousNextLinks`, and
    `--tanrei-comp-pagination-*` / `comp.pagination.*` → `--tanrei-comp-previous-next-links-*` /
    `comp.previous-next-links.*` (in every platform's generated tokens). Its behaviour ids are `PNL-*`.
  - **Pagination** (`<tanrei-pagination>`, React `Pagination`) is new, in the de facto standard form (MUI Pagination,
    Carbon PaginationNav, Ant, GOV.UK, USWDS, Primer): page numbers with the current one marked (`aria-current="page"`),
    the pages that do not fit behind an ellipsis by `siblings` and `boundaries` (the same number of places on every
    page), previous and next, first and last with `first-last`, links to `href` with `{page}` or buttons with a
    cancelable `change`, sizes `medium` and `small`, and a compact form (`variant="compact"`, and by itself where the
    numbered row does not fit) that says "Page 3 of 10" in the product's words — or "3 / 10" without them. Its tokens are
    a new `comp.pagination` group. The native platforms have it as planned.
  
  **Table**: the status line holds a Pagination — compact and small — beside a Select for the rows per page where the
  product offers one; the range of rows shown stays the table's status text, and Previous and next links are never put
  there. The table's fixtures that fill the status line now say "Page 1 of 33" (an intended change of their baselines),
  and the docs show the composition in all six languages. The docs site's page footer uses Previous and next links.
- b1fb04c: Popover: the close button is tonal in the default system. **Breaking** (a look 0.1.0-next.0 shipped): the value of
  `comp.popover.close-button.variant` goes from text to tonal.
  
  Every close button is the same control: an icon-only Button of the small size with the close glyph, in the variant its
  host names, tonal unless a system re-values it. The popover already drew a small Button (32 × 32 in the default
  system); in the default system it now stands as a tonal Button — the secondary container with its glyph — so that it
  reads as a control on any content. Its hover, focus and press are the Button's, as before.
  
  - Changed token: `comp.popover.close-button.variant` = tonal (was text). A layer that wants the bare glyph sets it to
    text.
  - `m3-like` (and so `m3-expressive-like`) and `cupertino` set it to text, the look they had: Material 3 closes a surface
    with a standard icon button, Apple's popovers with a bare glyph.
  
  SwiftUI, Compose, Flutter and React Native have no popover yet; their generated tokens carry the new value. Baselines: the default
  system's popover fixtures that draw the close button are recorded again; that is the intended result of this change.
- 2a2437f: Progress indicator: whether a determinate bar draws the stop indicator (the dot at its track's end) no longer depends
  on `separation`. The dot is drawn whenever `comp.progress-indicator.stop-indicator.size` is above 0, under `divider` and
  under `gap` alike, and not at max, where the indicator covers it; `separation` still decides only the gap between the
  indicator and the track. The default `tanrei` system's `stop-indicator.size` is now 0 (`sys.space.space0`), so it and
  `cupertino` still draw no dot, and `m3-like` and `m3-expressive-like` keep theirs. A bar given `separation="gap"` under
  the default system now draws the gap without a dot (the `linear-gap`, `linear-gap-small` and `linear-gap-large`
  fixtures); a bar given `separation="divider"` under `m3-like` now draws the dot. The file item's upload bar, which has no
  dot, sets the size to 0 for the bar it embeds.
  
  The web baselines of `linear-gap`, `linear-gap-small` and `linear-gap-large` are re-recorded for this: they no longer show the dot.
- 6016e87: Radio button: the center of a chosen radio now stands 3:1 apart from the ring around it (WCAG 1.4.11). In the default
  system the fill inside the thick ring is the ring's color at 16 % opacity rather than 50 %
  (`comp.radio-button.fill.opacity`, 0.5 → 0.16): a lighter tint, at least 3.17:1 from the ring at rest, hovered, focused
  and pressed, on every surface role and in all six schemes, where 50 % fell to 1.91:1 (the focused error form on
  `surface-container-highest` in light) and under 3:1 in the dark schemes once a state layer was under it. 16 % is the
  step the default system already uses for a selection's tint (a checked menu row, a selected list option, the tonal tabs'
  indicator). A menu's radio item draws the same ring, and its fill follows (`comp.menu.control.fill.opacity`,
  0.5 → 0.16; 4.67:1 at the least on the menu's sheet). The ring, its stroke and the motion are unchanged, and so are the
  imitation presets, whose radios have opaque centers of their own and whose menus mark radio items with a check.
  
  The token build holds it from now on: in every scheme, the fill of a radio's mark as drawn — at its opacity, over the
  state layer of each enabled state — is held 3:1 against the ring it meets, or, where `fill.inset` leaves a gap (a dot),
  against the gap, on every surface role (the menu's sheet for a menu's radio item). It fails the default system's build,
  is a warning for a product layer, and is recorded as information for an imitation preset (`cupertino`'s light center in
  a hairline ring is 1.80:1 in light). A product layer that strengthens the state layers may need a quieter fill: `tanrei
  validate` and the MCP server's `validate_layer` now say so. A finding about a pair of component colors is classed as a
  contrast measurement, as a pair of roles is.
- 6e23003: File item, snackbar, tooltip, empty state and the fixtures of the low-emphasis fills (web; the native platforms stay
  lagging and their notes name what they owe).
  
  - File item: the retry and remove actions stand far enough apart that each hit area reaches the minimum target in force
    (`comp.file-item.action.gap`, or twice what `sys.target` exceeds `action.size` by where that is more); the action at
    the row's end still reaches no further than the row. Where the glyph and the actions would leave a row's texts less
    than half its width (a narrow screen, enlarged text), the actions stand on a line of their own below the texts, at the
    row's end, and the name takes the whole width. A disabled row action keeps its resting ground, none, as a tile's
    keeps its disc: only the glyph fades. `video/mp2t` no longer decides the format, since it is guessed from `.ts`, which
    TypeScript shares: `index.ts` draws the code glyph.
  - Snackbar: with the action on its own row and no control after the text, the text ends
    `container.padding-inline-end` (16) from the end edge, as in a snackbar without controls.
  - Tooltip: a container larger than the room on its side is kept `comp.tooltip.window-margin` inside the window, as the
    spec says, over its anchor; only a window smaller than the tooltip gives up the margin, at its bottom and end edges.
  - Empty state: a title given as text (`headline`) is exposed as a heading, because it is drawn as one; the new `level`
    prop (1 to 6, default 2) gives its level. A title in the `title` slot keeps the role and level the product gave it.
  - Fixtures may name the surface role their stage is painted in (`surface` in `specs/component.schema.json`); the
    progress indicator, the slider and the skeleton each gain one on `surface-container-highest`, a filled card's tone.
  - Slider: SLD-17's verify no longer claims the value indicator clears the round state layer; it may lie over it, and
    the focus ring stays clear of it.
  - Docs: the radio group says how to show an unanswered required group's error in the product's words (`novalidate` on
    the form, then `error` and `errorText`); the progress indicator, slider and skeleton say to point their track or fill
    at a stronger role in a layer on the highest container tone.
  
  Intended web baseline changes, re-recorded for this: the file item's `row-disabled` (no ground under its actions) and
  every fixture with both actions (`row-error-retryable`, `tile-error-retryable` and the rows that draw retry), where the
  actions now stand farther apart; the snackbar's `action-own-row`; the tooltip fixtures placed near the window's edge;
  and new baselines for `linear-on-container-highest`, `continuous-on-container-highest` and
  `text-lines-on-container-highest`.
- ca2160c: Select: the list is now as wide as its options need on one line, instead of exactly as wide as the container. It is
  never narrower than the container or `comp.select.list.min-width`, and never wider than the new
  `comp.select.list.max-width` (320 in the default system, the menu's `surface.max-width`) where the container is
  narrower. So a long label or a supporting line takes fewer lines, and the container and the layout around it keep
  their width. An option that needs more still wraps. A list wider than its container keeps the start edges aligned and
  shifts along the container to stay inside the window. A long list draws only the rows near the box that scrolls; it
  takes its width from the rows it draws as it opens and keeps that width while it scrolls. `m3-like` restates the menu's
  280 for the new token. This is new vocabulary: one dimension token, `comp.select.list.max-width`. It is generated for
  every platform. The native selects are not built yet.
  
  The specs also state rules the web already followed. Choosing an option closes the select's list at once, so the
  option's pressed state shows only while the list closes. A long select or combobox list may draw only the rows near
  its scroll position, and each drawn option still states its position among all the options. The combobox's status
  row stands outside the region that scrolls, under it, and stays in view. The m3-like preset's arrow is recorded as a
  gap from its original: Material's web select swaps its arrow to point up while open, and Tanrei's chevron does not
  change.
  
  Five web baselines are re-recorded for this: `select/open-supporting-text` and `select/open-disabled-chosen` show the list wider than the trigger, with each supporting line on one line. `select/open-long-options`, `select-field/open-long-options` and `field/select-open-long-options` show the list at the width its stage allows, shifted to stay inside it.
- 7139c1d: Side sheet: the close button is a small tonal Button, and the sheet draws it by default. **Breaking** (a size, a
  default and an attribute 0.1.0-next.0 shipped).
  
  Every close button is the same control: an icon-only Button of the small size with the close glyph, tonal unless a
  system re-values it. The side sheet's was a medium Button (40 × 40); it is now small (32 × 32 in the default system),
  keeps the Button's own minimum target, and answers hover, focus and a press as any Button does.
  
  - `closable` defaults to **true**, in both variants: Material 3's side sheet has a close affordance in its standard and
    modal forms, and a standard sheet has no other way for the person to close it. Give every side sheet a `closeLabel`;
    a sheet without one is reported in debug builds. Turn the button off only where your own control or one of the
    sheet's actions closes it.
  - On the web, the `closable` attribute is replaced by its inverse, `not-closable` (an HTML boolean attribute cannot
    default to true), as the chip's `not-removable` is. Markup that wrote `closable` can drop it; markup that relied on
    its absence to draw no close button writes `not-closable`. In React, pass `closable={false}`.
  - `comp.side-sheet.close-button.variant` stays tonal; `m3-like` keeps its text pin. The button takes each system's small
    size: 32 under `m3-like` (was 40, Material 3's icon button — filed as the mimicry gap `close-button-size`), 28 under
    `cupertino` (was 34), 40 under `m3-expressive-like` (was 56).
  
  SwiftUI, Compose, Flutter and React Native are lagging and still ship the earlier revision (a medium close button,
  `closable` false by default); they owe this change with the rest. Baselines: the side sheet's six fixtures and each
  preset's `modal` are recorded again; that is the intended result of this change.
- 59c520f: Snackbar: a snackbar may stand at the top end of the window. `placement` is `bottom` (the default, unchanged) or
  `top-end`.
  
  At `top-end` the bar stands at the top of the window on the end side (the top right, the top left in a right-to-left
  layout), the container margin below the top edge and from the end edge, inside the safe area and below a sticky header,
  so that it never covers the top app bar. In a compact window it stands across the top instead. It comes down from above
  the top edge while fading in (the mirror of the rise at the bottom), fades out in place, and an expanded bar grows
  downward with its top edge in place. One snackbar at a time, as before, and never a stack; the focus order and the
  announcement do not change.
  
  - Web: `placement` is a property and attribute of `<tanrei-snackbar>` and of `<tanrei-snackbar-host>`, whose own
    placement is that of each snackbar whose `show()` options name none; `show()` takes `placement`. The sticky header's
    height is read from `--tanrei-app-shell-scroll-offset` on the document's root, which `<tanrei-app-shell>` sets and a
    product's own frame may set. Drawn in place, a top-end snackbar stands at the end of the width it is given.
  - React: `SnackbarHost` takes `placement`.
  - New token: `comp.snackbar.breakpoint.medium` (`--tanrei-comp-snackbar-breakpoint-medium`), the window width below
    which a top-end snackbar stands across the top; it aliases `sys.breakpoint.medium` (600 in the default system).
  
  SwiftUI, Compose, Flutter and React Native receive the new token and do not have the placement yet; they stay lagging.
  Baselines: three new web fixtures, `top-end`, `top-end-rtl` and `top-end-compact`; no existing baseline changes.
- 9bd59f4: Snackbar: the expand and close buttons are small tonal Buttons in the snackbar's tone. **Breaking**: the snackbar's
  own close-button tokens are removed.
  
  Every close button in Tanrei is now one control: an icon-only Button of the small size, tonal unless a system says
  otherwise. On a snackbar it stands on a bar that has a color of its own, so the snackbar gives it that bar's text color
  as its tone: the glyph is the text color, on a circle of that color made translucent, in all ten forms (on a surface or
  inverse, with a status or without). The expand button is drawn the same way, beside it. In the default system the glyph
  keeps at least 8.0:1 against its circle at rest and 6.2:1 focused or pressed.
  
  - Web: the expand and close buttons are `<tanrei-button size="small">` elements in the shadow root (their parts
    `expand` and `close` are those Buttons; a Button's own parts are `container` and `icon`). They go from 36 to 32 pixels
    and their glyph from 24 to the small Button's own (16 in the default system). Their hover, focus and press are a
    Button's, laid over the tone; their focus ring is the form's `focus-ring-color`, as before. The expand button's
    `aria-expanded` is on the Button's own native button, which names the text it controls by element.
  - The action is as tall as the small Buttons beside it: `comp.snackbar.controls.height` is now the small Button's height
    (`comp.button.container.height.small`, 32 in the default system), down from 36.
  - New: `comp.snackbar.close-button.variant` (`--tanrei-comp-snackbar-close-button-variant`), the Button variant of the
    expand and close buttons: tonal in the default system, text (a bare glyph) in the Material and Cupertino presets, as in
    their originals.
  - Removed: every `comp.snackbar.close.*` token (the close button's container, content and state-layer colors in each
    form and state; `--tanrei-comp-snackbar-close-*`) and `comp.snackbar.controls.icon.size`
    (`--tanrei-comp-snackbar-controls-icon-size`). A layer that set them sets `comp.snackbar.close-button.variant` and
    each form's `supporting-text.color` and `focus-ring.color`, which the snackbar gives the Buttons as their tone.
  - Cupertino draws no hover or focus layer, now also where a layer is computed where it is drawn (a Button given a tone,
    the carousel's layer over an image): `sys.state.hover-state-layer-opacity` and `sys.state.focus-state-layer-opacity`
    are 0 in that preset, and the menubar's open title keeps the fill it had.
  
  SwiftUI, Compose, Flutter and React Native still draw their earlier snackbar and lose the tokens it read; they stay
  lagging. Baselines: every web snackbar fixture with a close or an expand button or an action changes (the 32-pixel
  row), and the three presets' `action-closable`; this is the intended result of the change.
- e0810e9: **Breaking — a stacked input box is as tall as a Button of the same size.** An input and a Button set side by side in
  one row (a search box and its button, a code and Apply, a quantity and Add) now stand as tall as each other at one size
  name. The stacked box — the one that draws no label inside it, and the only look the default system ships — is 32 / 40
  / 56 high at small, medium and large, where it was 40 / 48 / 56: the Button's heights. Filled and outlined boxes, which
  float their label inside them, keep 40 / 48 / 56. This holds for every box drawn from `comp.input-box`: the text input,
  the select, the combobox, the number input and the color input, and every field and composite that frames one (text,
  select, combobox, number and color fields, the chip field, the field group, the search field).
  
  - New tokens: `comp.input-box.stacked.container.height.{small,medium,large}`, which alias
    `comp.button.container.height.*` in the default system, and
    `comp.input-box.stacked.container.padding-block.{small,medium,large}` (4 / 6 / 14), so that a line of the size's
    text fits in the new heights. Both are members of the box's size axis. `comp.input-box.container.height.*` and
    `.container.padding-block.*` are now read by the filled and outlined boxes only. A layer that set those to resize its
    stacked boxes sets the stacked tokens instead.
  - The token build (`pnpm validate`) refuses a default system whose stacked heights are not its Button's.
  - `cupertino` and `m3-like` (and so `m3-expressive-like`) set the stacked tokens to their own `container.*` values:
    their fields keep the heights they had, and their pictures do not move.
  - The hit area does not shrink: where a box is shorter than the minimum target, its target still reaches it.
  - A small number input draws its steppers as small Buttons (they were medium at every size, NMI-25), so that it is
    as tall as a small text input beside it; at medium and large they stay medium Buttons.
  
  The specs say it in `TXI-16`, `TXI-51`, `TXI-68`, `SEL-1`, `SEL-65`, `CMB-1`, `CMB-63`, `NMI-1`, `NMI-25`, `NMI-47`, `CLI-1` and
  `CLI-45`, and in each `size` description. SwiftUI, Compose, Flutter and React Native receive the new tokens only; their
  boxes are not built yet. Baselines: every default-system picture of a stacked small or medium box is recorded again
  (the five boxes, their fields, the field and field group, the chip field and the search field); that is the intended
  result of this change. The presets' pictures are unchanged.
- 0a27acd: New component: Stepper (`specs/stepper.spec.json`, SPR-1…27). It shows where a person is in a flow the product runs in a
  fixed order of steps — a checkout, a set-up, an application.
  
  - **Conditions.** Each step is current (where the person is: a filled marker with its number), complete (a check),
    error (a ring and `priority_high`, the label in the error color) or incomplete (a ring with its number). A step's
    `status` is `auto` by default — complete before the current step, incomplete after it — and the product sets
    `error`, `complete` or `incomplete` where its flow knows more. Conditions differ by shape, not by color alone.
  - **Forms.** `layout` is `horizontal` (equal columns above the content), `vertical` (a column beside it) or `compact`
    (a bar of segments, the position in the product's words — "Step 2 of 5" — and the current step's label). A
    horizontal stepper turns compact by itself when its width cannot hold every step at `comp.stepper.step.min-width`.
  - **Going back.** `pressable` is `none` (the default), `visited` (the complete and error steps that are not current)
    or `all` (every step that is not current). A pressable step is a native button that fires `select` with its value;
    the stepper never changes `value` itself. A `disabled` step of a pressable stepper is a disabled button.
  - **Accessibility.** An ordered list named by `label`, the current step `aria-current="step"`, each step read as its
    label, the product's word for its condition (`completedText`, `errorText`) and its description; the compact form is
    one group that reads what it draws. New product's words: `stepCompletedText`, `stepErrorText`, `stepPositionText`.
  - **Tokens.** New group `tanrei.comp.stepper` (marker, container, label, description, connector, bar, position, motion,
    and per condition — incomplete, current, complete, error — the colors of each part in each state). The default
    system adds two rules: a disabled step grows no container fill and keeps its marker's fill. No preset re-values it:
    neither Material 3 nor Apple's guidelines have a stepper.
  - **Platforms.** Web (`<tanrei-stepper>`, `<tanrei-stepper-step>`) and the generated React wrappers (`Stepper`,
    `StepperStep`). SwiftUI, Compose, Flutter and React Native are planned; their generated token code gains the group.
  - **Docs.** A Stepper page in six languages, beside Steps, which stays a procedure to read with no position.
  
  New baselines: every fixture of `stepper` on the web, and `horizontal-error` under each preset.
- bd70c47: Tooltip: it appears as every surface does, and leaves the way it came. **Breaking** (a motion and two tokens
  0.1.0-next.0 shipped).
  
  - The tooltip starts from `sys.motion.appear.*` — opacity 0 and scale 0.96 under the default system — grown from the
    middle of the edge that faces its anchor (from its centre where `sys.motion.appear.origin` is center, or while it
    covers its anchor), and leaves the same way back on `comp.tooltip.motion.exit-easing` (standard-accelerate in the
    default system). It no longer grows from 0.95 about the point its arrow points at, and no longer travels 4 px toward
    the anchor: a system that sets `sys.motion.appear.distance` makes it travel.
  - Under the `unfold` appearance (m3-like and m3-expressive-like) it unfolds from that edge along the axis that leaves
    the anchor, at its full width.
  - Where motion is reduced it fades in and out over `sys.motion.role.reduced` (100 ms), with no scale, distance or blur.
  - A tooltip written open in the page's markup appears in the first frame without its motion; one mounted open after
    the page was first painted plays its entrance.
  - Removed tokens, with no alias: `comp.tooltip.motion.enter-scale` and `comp.tooltip.motion.enter-offset`. A layer that
    set them sets `sys.motion.appear.scale` and `sys.motion.appear.distance` instead (for every surface that appears).
  - The arrow's elevation filter is set on the placed box, so that the moving part keeps `filter` for the appearance's
    blur.
  
  SwiftUI, Compose, Flutter and React Native lag behind the current tooltip; their generated tokens no longer carry the
  two removed values. Baselines are unchanged: the fixtures are drawn at rest.
- 5029351: Words with places for the count and for a row's actions, so that what is said holds the number and the row in the
  order of the product's language:
  
  - Avatar group: `overflowLabel` is a sentence with the place `{count}`, which the group fills with the real number of
    members it does not draw — also above 999, where the box draws `999+` — in the locale's digits. It can be given once
    for every group as the product's words `avatarGroupOverflowLabel`. A sentence without `{count}` is read as written and
    reported in debug builds.
  - Text input and text field: the count can be said as a sentence. `counterText` (`characterCountText`) has the places
    `{count}`, `{limit}` and `{remaining}` and is said while there is a `maxLength`; `counterNoLimitText`
    (`characterCountNoLimitText`) has `{count}` and is said while there is none. They are the input's description and
    what is announced once typing pauses; `countText`, and what a Field draws, stay the digits ("12/40"). Without a
    sentence, and for a value the product set past the limit, the digits are said as before.
  - File item (and the file upload and chat composer that hand their words to it): `removeLabel` and `retryLabel` are
    sentences with the place `{name}`, filled by the file's name ("Remove {name}"), so the actions of two files are told
    apart by their names. The file's name is no longer given to the actions as a description.
  - List: `moveUpLabel` and `moveDownLabel` are sentences with the place `{headline}`, filled by the item's headline
    ("Move {headline} up"); the headline is no longer the buttons' description.
  
  A word without its place still names the action, as it is written, and is reported in debug builds: give the place to
  keep two rows' actions apart. No baseline changes: every changed name is read and not drawn.

## 0.1.0-next.0

### Minor Changes

- f181fc2: Initial release. Tanrei is one design system shipped to five platforms — Web Components (with React wrappers), SwiftUI,
  Jetpack Compose, Flutter and React Native — from one set of DTCG design tokens and platform-neutral component specs.
  This release includes the token pipeline and its generated outputs for every platform, the default `tanrei` system and
  the shipped presets, the components listed in the [status matrix](https://tanrei.chnotchy.com/status/) at the status shown there
  for each platform, the token engine, the CLI, and the MCP server.
  
  Every published package carries its LICENSE and NOTICE, and what a build bundles (Lit in `@tanrei/web`'s
  `dist/tanrei.bundle.js`; the code and fonts of the Theme Studio app in `@tanrei/cli`) ships with its licences in
  `THIRD_PARTY_LICENSES.md`.
