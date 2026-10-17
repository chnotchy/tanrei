# @tanrei/web

## 0.1.0-next.1

### Minor Changes

- 2cf22e1: Accordion: an open item is one target, as a whole clickable card is. A press anywhere in its content closes it, as a
  press on its header does. Under a pointer the whole item — header and content, to the item's edges — shows the hovered
  and pressed states with the pointer cursor (the ripple grows over the whole item), and keyboard focus on the header
  rings the whole item. A link, a button, a field, a label or anything else in the content that takes a press keeps its
  own press, cursor and states, and the item shows none while the pointer is over it; selecting text, a drag, a press
  with a modifier key, another mouse button, a second click, a click the product cancels and a press inside a nested
  accordion's item (which closes that item only) close nothing. The header stays the one button for the keyboard and
  assistive technology, and the content gets no role or focus stop. It needs the element's script: without it only the
  header toggles, and the content shows no pointer and no state. The look at rest is unchanged in every shipped system;
  the hovered, pressed and focused looks of an open item now cover the whole item.
  
  Where the browser cannot move a height to `auto` in CSS, an item no longer keeps an empty `style` attribute after
  its height motion.
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
- 8d0e2b0: App shell: `footerHidden` (`footer-hidden`, React `footerHidden`) decides whether the footer is shown. The footer was
  shown exactly while the product filled the footer region; a screen that is a task rather than a page of the site (a
  checkout, a sign-in, an editor) can now leave the site's footer out without taking it out of the markup. While it is
  true the footer takes no space, draws no line, is no content-information landmark and has no stop of the keyboard, the
  navigation and the aside stay in view to the end of the page, and focus that was in the footer moves to the main
  region. A footer slot left unfilled is still never drawn and never a landmark. Pages that do not set it are unchanged. The
  spec names the prop on every platform; SwiftUI, Compose, Flutter and React Native have not implemented the app shell
  yet.
- 930031d: Button: `destructive` marks an action that deletes or discards something a person may not get back (Delete, Discard,
  Remove member). It goes with every variant and keeps that variant's emphasis, in the error color role: filled is the
  error color with on-error, tonal the error container with on-error-container, and elevated, outlined and text keep
  their own container with the label, the icon (and an outlined button's edge) in the error color. Disabled, a
  destructive button looks like any disabled button of its variant. A toggle ignores it, and a debug build reports the
  pair. It adds a color and no semantics: the label still says what is destroyed. A link button, an icon-only button and
  a dialog's action that takes the dialog's variant take it too; the Button group's and the dialog's guidance now name it
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
- d0d5136: Carousel: previous and next controls over the ends of the row, so that a mouse can move the row with a single press
  (WCAG 2.5.7) — before, a row without its dots moved under a mouse only with Shift and the wheel. They are icon-only
  medium Buttons with the chevron glyphs, in the variant the new token `comp.carousel.navigation.button.variant` names
  (elevated in every shipped system: a light fill with a shadow, which stands apart from any item), named by the new `previousLabel` and `nextLabel` (`previous-label`, `next-label`;
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
- 90c0631: Copy button: `labelWidth` (`label-width` on the web), `widest` or `fit`. `widest`, the default and the behaviour until
  now, keeps the labelled form as wide as the widest of its three texts, so nothing beside it moves when its words change.
  `fit` makes it as wide as the text it shows and eases the width to the new text over two new tokens,
  `comp.copy-button.motion.resize-duration` and `resize-easing` (aliases of the standard default-spatial spring, as the
  main action button's resize), at once where motion is reduced (CPY-19). The vocabulary grows by those two tokens; the
  native platforms carry them in their generated tokens and owe the prop when they build the copy button. One new
  baseline, `labelled-fit`; no other image changes.
- fda53ad: Date-time picker: `min` and `max` now bound the time as well as the date. They take the mode's ISO form, the same form a
  Text field's `min` and `max` take, so a field's `pickerRequest` can pass them straight on to the picker.
  
  - **Forms.** `date` mode takes a date, as before. `time` mode takes a time (`09:00`). `date-time` mode takes a date and
    time (`2026-09-17T09:00`), which limits the times only on its own day, or a date alone, which limits only the dates,
    as before. A bound in any other form is ignored and reported in debug builds. So is a date given in `time` mode,
    where it had no effect before.
  - **What is offered.** Only the times between the bounds can be chosen. `min` is rounded up and `max` down to
    `minuteStep`, so the picker never offers a time that its field refuses. Bounds with no time of the step between them
    are ignored and reported.
  - **Out-of-range times.** Hours, minutes and periods outside the bounds keep their places on the wheels and the dial
    and are drawn faded. They are never removed, so no other value moves. Every entry mode passes over them: the arrow
    keys go on to the next available value, a wheel settles on the nearest available row, the dial takes the nearest
    available number, and a typed value outside the bounds keeps the value before.
  - **The pending time.** A pending time outside the bounds moves to the nearer bound. This happens when the picker
    opens with a value or the current time outside them, when a date that is a bound's own day is chosen, and when a new
    hour or period would leave the bounds. OK then commits the moved time.
  - **Assistive technology.** The spin buttons expose their first and last available values as their minimum and
    maximum.
  - **New token.** `comp.date-time-picker.time.unavailable-opacity` aliases `sys.state.disabled-content-opacity`, so the
    vocabulary grows by one token. SwiftUI, Compose, Flutter and React Native do not implement the picker yet.
  
  Snapshot baselines: two new fixtures, `modal-time-bounded` and `modal-time-dial-bounded`. No existing fixture sets a
  bound in a time mode, so no existing baseline changes.
- 3b0cc7e: Dialog: a close button, a choice of width, and the reason of a dismissal.
  
  - `closable` and `closeLabel` (`close-label`) draw an icon-only small Button with the close glyph at the end of the
    header, as the popover and the side sheet do. Pressing it dismisses the dialog with the reason `close`. It is drawn
    only while the dialog is dismissible (`closedby` is not `none`): a dialog the person must answer offers no way out
    but its actions. New token `comp.dialog.close-button.variant` (text in the default system).
  - `width`: `content` (the default, as before: as wide as its widest part, between the minimum and maximum width),
    `small`, `medium` or `large` — new tokens `comp.dialog.width.small`, `.medium` and `.large` (400, 560, 800). A fixed
    width is never wider than the window less the margins; a compact window places every width as it places content.
  - The web's `cancel` is now a CustomEvent whose `detail.reason` is `escape`, `back`, `scrim` or `close`. It is still
    cancelable, and a listener that reads it as a plain Event is unchanged.
  
  SwiftUI, Compose, Flutter and React Native receive the new tokens only; the close button, the widths and the reason
  wait for those platforms to catch up. Baselines: the fixtures `closable`, `width-small`, `width-large` and
  `compact-closable` are new; no existing baseline changes.
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
- 7536862: Menu: `trigger` (`anchor` | `context`, default `anchor`) makes a menu the context menu of an area. With `context`,
  `anchor` names the area (a canvas, a list, a row), and a person asks for the menu at a point of it.
  
  - **Asking.** A right-click, a touch or a pen held still for the long-press duration (500 ms) within the touch slop,
    Shift+F10 or the ContextMenu key on the element that has focus, or the context-menu command of assistive technology.
    The menu fires a cancelable `contextrequest` with `{ x, y, element, input }` (`pointer`, `long-press` or
    `keyboard`) and you set `open`, as you do from an anchor. It cancels the browser's own context menu for each request
    it answers; cancelling `contextrequest` leaves the request to the browser. After a long press, the release of that
    press activates nothing (MNU-60).
  - **Placing.** The surface opens with a corner on the point and no offset, flipping to the other side of the point on
    each axis by itself near the window's edges, limited to the room and scrolled, and moving with the area; a key opens
    it against the focused element, as against an anchor (MNU-61).
  - **Focus.** Items, keys, submenus and close reasons are unchanged. Focus returns to the element that had focus when
    the menu was asked for; a press anywhere outside the surface, in the area too, closes it (MNU-62).
  - **Accessibility.** The area gets no `aria-haspopup`, `aria-expanded` or `aria-controls`, and the menu is named only
    by the `aria-label` you give it (MNU-63). An unknown `trigger` is `anchor`, reported in debug builds.
  - SwiftUI, Compose, Flutter and React Native do not have the context trigger yet.
  
  The long-press duration, the touch slop and the swallowed release after something opens under a press are now one
  shared module that the list's reorder and the tooltip use too, with no change to either.
  
  Snapshot baselines: none change; a context menu draws exactly as a menu opened from an anchor.
- 72469f9: Menu: `iconSpace` (`auto` | `always` | `never`, default `auto`) decides the mark column and the leading icon column for
  each section of a surface — a group, or a run of items outside any group — instead of for the whole surface.
  
  - **`auto`**, the default: a row keeps a column's room while another item of its section draws in it (a checkbox or
    radio item its mark, an item its leading icon), so the labels within a section still start on one line, and a
    section with no mark or icon starts its labels where the row's content starts instead of after empty room. This is
    the default the navigation drawer and the tree view already have, with the same name and values.
  - **`always`** keeps both columns on every row; **`never`** keeps a column only where the row draws in it.
  - Each surface decides for itself and every submenu follows the menu's value; an unknown value is drawn as `auto` and
    reported in debug builds (MNU-59). The trailing icon column stays one per surface, so shortcuts and submenu
    indicators keep lining up.
  - A menu whose sections all have, or all lack, marks and icons draws as before. A menu that mixes a section with icons
    or checkable items and a section without them now starts the labels of the second section further towards the start.
    The menubar's menus, the split button's and the menus inside the other components take the default. SwiftUI,
    Compose, Flutter and React Native do not have the prop yet and keep the columns for the whole surface.
  
  Snapshot baselines: three new menu fixtures (`icon-space-auto`, `icon-space-always`, `icon-space-never`); no existing
  fixture mixes such sections, so no existing baseline changes.
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
- 155b5de: Button: two additions to its surface, each in the spec first. `busy` (with `busy-label`) keeps a button focused, in
  the focus order and at its size while its action is under way: it draws the loading indicator's arc in place of its
  label, refuses every press (a submit button cannot send its form twice, and stops Enter in the form), and announces
  `busy-label` once. `focusable-when-disabled` keeps a disabled button reachable by Tab, drawn and announced as
  disabled, so a person can learn why it does nothing. New tokens: `comp.button.busy.indicator.thickness` and
  `comp.button.motion.busy-cycle-duration`, which alias the loading indicator. New baselines: button `filled-busy`,
  `text-icon-busy` and `filled-disabled-focusable`.
  
  Medium and high contrast: the hairline (`sys.color.outline-variant`, an outlined button's edge and a divider's line)
  is raised to 3:1 and 4.5:1 against every surface in the default system, and `outline` stays the stronger of the two.
  The build now holds that, for the default system. Standard contrast is unchanged.
  
  Copy button: the icon-only form also shows "Copied" or "Could not copy" above the button, drawn as a plain tooltip,
  for as long as its confirmation lasts. The bubble takes no focus, closes with Escape, and is not read a second time.
  
  Interactive card: a press no longer selects the card's text or starts a drag of it, as on every other pressable part.
  
  Link: a standalone link takes its label's own direction (its first strong character's, written as `dir` by the script where the page gave none),
  so in right-to-left text a left-to-right label has its arrow, its new-tab mark and its glyphs at the ends of its own
  words, unmirrored. A phrase in a sentence does the same when the page marks it with `dir`.
  
  Link card: a host label that mixes Han with a Latin letter outside ASCII is shown in its ASCII (`xn--`) form, as
  Chromium shows it.
- cb29df6: Tokens: `sys.state.selected-state-layer-opacity` (0.16, twice the hover layer) is the quiet selection's step. A
  list's selected option, a menu's current link item and its checked row (at medium and high contrast), the chosen
  option of a select and a combobox, the tonal tabs' indicator and the tint inside a checked radio ring now take it,
  where each wrote 16 % itself; a design system that sets it moves them all together. The vocabulary grows by this one
  token (CSS `--tanrei-sys-state-selected-state-layer-opacity`, and `selectedStateLayerOpacity` in each platform's
  state group). Every shipped system keeps the value it drew, so nothing looks different and no baseline moves.
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
- e088124: Table: `selection="single"` chooses one row at most. Each body row that can be chosen holds a radio button in its
  selection cell — a `<tanrei-radio-button label-hidden>` or a native `<input type="radio">` — and the header row's
  selection cell stays empty, since no control stands for every row. The radio buttons of a table share one name (yours,
  or one the element gives those that have none), so they are one group: one Tab stop, and the arrow keys move the choice
  from row to row. Choosing a row lets the chosen one go, and `selectionchange` carries that one value. As a radio is not
  cleared by its own activation, the chosen row's radio button and a press on that row change nothing; to choose no row
  again, remove `data-selected` yourself. A press anywhere on a row, its hover and its press work as they do for a row's
  checkbox. The table stays a table: no grid, no `aria-selected`, and no radio group around the rows. Native radios of
  one name work without script, and the row of the checked one is drawn chosen. Nothing changes for `none` and
  `multiple`.
  
  A new fixture, `selection-single`, has its own baselines.
- 0f0e1eb: **Tree view: the row model shared with the navigation drawer, and names edited in place.**
  
  - `chevron`: `start` (the default), `end` (after the trailing text, `expand_more` turning a half turn) or `none`. With
    `none`, a parent opens by its icon (its `data-open-icon` glyph shows the state), or by its row where it has no icon
    and does not choose; the arrow keys always open and close. `expandable="false"` shows every parent open, with no
    chevron and no toggle.
  - `guides`: `none`, `shown` (the bare attribute) or `hover`. A line stands under the parent's first leading thing: the
    start chevron, else the icon, else the label's start.
  - `indent`: `auto` (a child begins where its parent's label begins) or a number of pixels. `icon-space` (`auto`,
    `always`, `never`) keeps an icon's room so that labels stand in a column. `icon-gap` sets the room between the icon
    and the label; its token, `comp.tree-view.icon.gap`, is the same in both densities.
  - `highlight`: `indented` (the default) or `full`, for the fill, the state layers and the focus ring.
  - Labels and notes are one line, cut with an ellipsis and shown whole in a tooltip while cut (`label-wrap`,
    `supporting-wrap` to wrap). A note stands below its label, or after it with `data-supporting-position="inline"` on
    the `<li>`. **This changes the look of every tree with long labels or notes.**
  - `sticky-parents` (on) and `sticky-max` (2): the rows of the innermost open parents above what is shown stay pinned at
    the top of the scrolling box (new tokens `comp.tree-view.sticky.*`).
  - Multiple selection: Shift with the arrows, Space or a press selects a range; Ctrl/Cmd+Shift+Home/End and Ctrl/Cmd+A.
  - `editable`: a double-click on a label, or F2, opens a field on the name, without moving the row. Enter or leaving
    the field fires `rename` (`label`, `previous`) on the item, and Escape gives it up. `edit(li)` opens it from script.
    `create({ parent, icon })` adds a row beside the selected item in which a new item is named, and fires `create`.
    `edit-label` (or `setWords({ editLabel })`) names the field. React: `onRename` and `onCreate`.
  
  The baselines of the tree view change: icons now step a level by the chevron and the icon, and notes stand below
  their labels. New fixtures show each form.

### Patch Changes

- 132b7ce: Popover, select, combobox and context menu: what a press, a key or a focus move set up now ends with the events of
  that act, never with a timer. A browser may run a timer after later work, and until then:
  
  - a popover, a select's list or a combobox's list whose close the product had declined (after Escape, or after focus
    left it) asked nothing when focus was moved outside it again — by the product or by assistive technology — and
    stayed open;
  - a popover left by Tab from its last element could not take focus again: focus the product moved back into it right
    away went nowhere;
  - after Shift+F10 or the ContextMenu key asked for a context menu (`trigger="context"`), the context-menu command of
    assistive technology was cancelled and asked for nothing.
  
  What each act does, and when a close is asked for once, is unchanged.
- f799b0a: App shell: the sticky header and the navigation bar stay over what scrolls under them. Before, anything in the main
  region with a z-index of its own was drawn over the header as it scrolled under it, and caught its clicks: a Code
  block's copy button, the overlapping parts of a Carousel, a Text input's label, and any element of the product's
  raised with `z-index`. The footer was drawn over the header too when the page ended under it. Now the frame and each
  region are a stacking context of their own (`isolation: isolate`): whatever a region holds stacks inside that region,
  the header and the navigation bar stand over every region, the footer over the navigation and the aside, and the
  focused skip link over all of them. Nothing moves and no color changes; only what is drawn on top where two regions
  overlap. Overlays (menus, tooltips, dialogs, sheets, snackbars) are drawn in the top layer as before. A positioned
  element the product puts inside a region is now ordered within that region: an overlay of the product's own belongs in
  the top layer (`popover`, or a `<dialog>` opened with `showModal()`), not in a high `z-index`.
- 2b1b8a9: Badge: a badge with no anchor (nothing in its slot) now draws nothing, takes no space and says nothing, and a debug
  build reports it. Before, it drew its dot or pill hanging off an empty box, over whatever came next. Given an anchor
  later, it draws on it and describes it at once; when its anchor is taken away, the anchor gets its own description
  back. A badge on an anchor is unchanged.
  
  Navigation drawer: the trailing slot of a destination and of a group no longer suggests a badge. A count at the end of
  a row is the row's `trailing-text`, read with the row; a badge marks the icon (`badge`).
- 5c2597b: Carousel: a touch drag that stops before the finger lifts now settles on the item nearest where it was let go. Before,
  on a row that snaps, only a release the carousel took as a fling was held: any other release was left to the browser's
  own momentum, which in Chromium carried a quick drag on after the lift — to the row's end — and the row then settled
  there, past the item the person had stopped on. Every touch release on a row that snaps now settles from where the
  finger lifted: on the nearest item, or on the next one when the drag is still moving at the lift (a fling), as before.
  A row with `snap` off still comes to rest wherever the browser's scroll ends, and the wheel and the trackpad are
  unchanged.
- 6636594: Combobox: a list closed by focus moving away is reported with the reason `tab` only for the focus move of a Tab press
  itself. Before, the combobox remembered a Tab until a timer ran, and a browser may run that timer after later work: a
  focus move the product made soon after a Tab — or after a Tab that something cancelled — was reported as `tab` rather
  than `focus-out`. The Tab is now forgotten when its focus move is seen, when the key comes up without one, or when
  another key goes down. What is resolved when focus leaves, and every other reason, is unchanged.
- 88c14f0: A component's own stacking order no longer reaches the page. A shadow root makes no stacking context, so the
  `z-index` a component gave one of its parts was ordered against the page's own levels: a Code block's copy button, an
  inline Menu's submenu surface, a Carousel's controls, a Chip's remove button, a File item's action, a Navigation drawer's
  edge and pinned rows, a Button group's and a Button with menu's divider and a Stepper's connector rose over a sticky
  header of the product's at `z-index: 1` as the page scrolled under it, and took its clicks. Those components, and the
  List, the One-time code input and the Side sheet, which lift a part the same way, now make their host a stacking context
  of its own (`isolation: isolate`): their parts are ordered among themselves as before, and the component as a whole
  stands in the page like any other element. Nothing moves and no color changes. What stands over the page — menus,
  popovers, tooltips, snackbars, dialogs, sheets — is in the top layer, as before. The Slider's value indicator is the one
  part still ordered in the page's stacking context: it must rise over the content beside the slider, and moves to the top
  layer in a change of its own.
- d97b53b: Text input, embedded text input and one-time-code input: what an input method commits is taken when its composition
  ends, and what the browser reports for it afterwards is told by what it is, never by a timer. A browser handles input
  before timers on a busy page, and until the timer ran:
  
  - in a date, time or date-time field, the next composition began on the segment just filled, so its digits went there
    or were lost (a month committed as ０９ and a day as ２７ could give 07 and an empty day, or 09 and an empty day), and
    a digit typed straight after a commit was lost;
  - the first key pressed after a commit — Backspace, an arrow or Enter, in a date field's segments and a one-time-code
    input, and Enter in an embedded text input — did nothing, also after a composition committed by picking a candidate
    with the pointer, where no key had committed it.
  
  The key that commits a composition is still the input method's where the browser reports it only after the end (with
  the platform's mark of such a key, or pressed no later than the end), and a composition's last `input`, which one
  browser sends after the end, is still not an edit of its own.
- 78932fb: A date-time picker wheel now carries on after a fling. Someone who flicks the hour, minute or period wheel and lets go
  while it is still moving sees it run on past the nearest row and slow to a stop. Before, every drag settled on the row
  nearest where it was let go, however fast it was moving. After a drag, a scroll or a press on a row, the wheel's value
  is now taken once its rows have settled, not as soon as the pointer lifts or the scroll stops. A drag held still for
  more than 40 ms before it is let go settles where it stopped, as before.
- 0a98a97: A drag that stops before it is let go is no longer flung. Someone who drags quickly, stops on the tab, month, height or
  position they want and lets go there now gets that place: a release that comes more than 40 ms after the pointer last
  moved has no velocity, as on Android and in Flutter. Before, a pointer held still for up to 80 ms was still released
  as a fling and went on past where it stopped. This applies to every drag that flings: the tabs, the navigation bar,
  the Tab view, the calendar, the bottom and side sheets, the switch, the navigation drawer, the carousel's settle and the
  image preview (its pages, its pan and its swipe down to close). A drag released while it is still moving flings as
  before.
- 25dd0d0: Navigation drawer: keyboard focus on an expanded row whose label is cut always shows the tooltip with the whole label.
  Where the pointer had just left that row, the hide it scheduled for a collapsed cell's name could end the row's wait
  to be seen, and the tooltip was not shown (NVD-75).
- 8405fc9: Navigation drawer: keyboard focus on an expanded row whose label is cut shows the tooltip with the whole label also
  when the row lay just outside the window, its edge on the window's edge: the tooltip opens once part of the row is
  seen. Before, it opened while nothing of the row could be seen, closed again at once, and stayed closed when the row
  came into view (NVD-75).
- 7e694f4: Navigation drawer: keyboard focus on a collapsed cell that the browser scrolls into view shows its name also when the
  cell's box first only touches the window's edge. The name opened at that moment, was counted out of sight by the
  tooltip and closed at once, and was not opened again (NVD-56).
- a3f8151: Navigation drawer: keyboard focus on a collapsed cell that lies outside the window shows its name once the browser has
  brought the cell into view. The name was opened one frame after the focus, and where the browser scrolled the cell in
  later than that (WebKit, sometimes; any page that scrolls smoothly) the tooltip opened against an anchor out of sight,
  closed itself at once and was not shown at all (NVD-56).
- 2dd0327: An input chip is one Tab stop. Its remove action leaves the Tab order (`tabindex="-1"`): it stays pressable by pointer, touch and assistive technology and keeps its name, and the keyboard removes the chip with Backspace or Delete on the chip itself, as before — once per press, never for the repeats of a held key. While the chip can be removed, its button announces the two keys with `aria-keyshortcuts="Delete Backspace"`; a disabled or `not-removable` chip announces none. In a tag group, Tab now goes from chip to chip, and after a removal focus goes on to the next chip, or the one before where none follows, as it already did. The chip field already took every chip out of the Tab order and is unchanged. No baseline changes: only the focus order and an ARIA attribute differ. The native platforms still have the remove action as a second stop; each follows when it catches up.
- 397cd93: Every pressable control: a press made with Enter or Space now stays pressed for as long as the key is held down, wherever
  the pointer goes. Before, a mouse resting over the control ended the key's pressed state and its ripple as soon as it
  left the control — because the mouse moved, or because the control moved out from under it (Enter on a bottom sheet's
  handle raises the sheet, and the handle went up out from under the pointer). A key that goes down and up while the
  pointer holds a control down no longer ends the pointer's press either: it ends when the pointer lets go or leaves.
- aaba9dc: Link card: a change of `variant` is drawn at once. Before, switching a shown card between outlined and filled faded
  its fill and its edge over the state motion; now the new look appears in the same frame, as the spec asks. A card that
  was not a link and is given an `href` — as a prop, or on the product's own anchor — also appears as a card at once
  instead of fading in. Hover, focus and press still move over the state motion as before.
- c9d76e2: Button with menu: a narrow trailing half now takes the padding at its rounded outer end
  (`comp.button-with-menu.container.outer-inset`), as the default width and the leading half already did. A slim half's
  chevron sits nearer the curve, so without it the chevron looked pushed toward the end. In the default system the narrow
  half is 4 wider (32 / 36 / 36 at small, medium and large) and its chevron stays 16 from the seam; a system that sets
  the outer padding to 0 (cupertino and the m3 presets) draws it as before, exactly a narrow icon-only Button's width. The
  web baselines of the eight narrow fixtures are re-recorded for this change.
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
- d0de4b8: The package's `sideEffects` now names every module whose loading defines an element, so a bundler that honours the
  field (esbuild, Rollup, Vite, webpack) keeps each definition a component brings with it — the buttons of a calendar,
  the copy button of a code block, the menu of the breadcrumbs, the requirement tag of a field. Importing a component
  from `@tanrei/web/components/<name>` already defined all of them; what changes is that a build from the package's
  sources (a workspace that bundles `src/`, or the package's own `tanrei.bundle.js`) no longer warns that an import of a
  component was ignored, and that the field frame, which defines the tag, is declared too.
- cd48cda: Avatar group, Toolbar and Search: a page's reset no longer changes their spacing. A page's rules beat the rules a
  component gives the elements it slots, so a reset such as `* { margin: 0; padding: 0 }` (a documentation site's,
  Tailwind's preflight) took away the avatar group's overlap, the space between a floating toolbar's items, the centring
  of a docked toolbar's only item and the space before a search bar's trailing buttons. The component now makes that
  spacing from its own box: the avatar group's row is a grid whose columns are each the side less the overlap, and a
  floating toolbar and a search bar's trailing buttons are spaced by elements of the component's own between them.
  Nothing is drawn differently, and the elements stand where they stood. The toolbar and the search bar no longer write
  `--tanrei-kept-*` custom properties on the product's elements.
- 77b361c: Stepper: a step pressed right after the stepper is drawn now shows its pressed state for the whole press-hold, as it
  does at any other time. For the first two frames of a step, while its first condition is drawn without motion, a key
  press or a tap ended the pressed state with the press itself, so it could not be seen; a quick keyboard user or an
  automated test of the product could meet it on a page that had just shown the stepper. Nothing else about the step's
  look or motion changes.
- d43dd75: Tabs: a row of tabs now appears already drawn as it is. Before, for the first 150 ms after a row appeared, its
  selected tab faded in: the icon filled in, a tonal label grew bold, a disabled selected tab's indicator faded to the
  disabled color, and under some systems (m3-like) the label and icon colors faded too. Selecting a tab, hovering,
  focusing and pressing animate as before, and the look at rest is unchanged.
- 07c7d78: A title's letter-spacing now follows the script of its text, in every component and not in prose alone. In Chinese,
  Japanese and Korean a negative tracking is dropped and the text is set solid; a positive tracking a product's layer
  chose stays. In a script that joins its letters or stacks marks on them (Arabic, Persian, Urdu, Pashto, the Brahmic
  scripts, Thai, Lao, Khmer, Burmese) there is no tracking at all. It applies by the text's `lang` to the titles of the
  dialog, popover, side sheet, snackbar, rich tooltip, app bar, callout, empty state, navigation drawer section, the
  date-time picker's header value, accordion, figure, link card, steps, timeline, page header (title and eyebrow),
  description list (the stat figure), prose headings and the heading and eyebrow classes of `text.css`. The rule is one
  source shared by the shadow styles and the light-DOM stylesheets, and is not a token.
  
  Intended visual change: a title in Chinese, Japanese or Korean in the default system loses the heading styles'
  negative tracking (the Japanese and Chinese fixtures of those components draw slightly wider titles); a Japanese page
  header's eyebrow now keeps the eyebrow's positive tracking, which it used to drop. The affected web baselines are
  recorded again.
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
