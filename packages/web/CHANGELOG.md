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
- 8d0e2b0: App shell: `footerHidden` (`footer-hidden`, React `footerHidden`) decides whether the footer is shown. The footer was
  shown exactly while the product filled the footer region; a screen that is a task rather than a page of the site (a
  checkout, a sign-in, an editor) can now leave the site's footer out without taking it out of the markup. While it is
  true the footer takes no space, draws no line, is no content-information landmark and has no stop of the keyboard, the
  navigation and the aside stay in view to the end of the page, and focus that was in the footer moves to the main
  region. A footer slot left unfilled is still never drawn and never a landmark. Pages that do not set it are unchanged. The
  spec names the prop on every platform; SwiftUI, Compose, Flutter and React Native have not implemented the app shell
  yet.
- 9fd3a23: **New — a product's tests can fail on a component its system does not have.** `@tanrei/web` exports
  `setAvailabilityMode('warn' | 'error')` and `unavailableUses()` (and `@tanrei/web/availability` the two alone, without
  registering an element), shaped like `missingWords()`:
  
  ```js
  setAvailabilityMode('error'); // in the test setup, before anything renders
  // …render the screens of the product…
  expect(unavailableUses()).toEqual([]);
  ```
  
  In a debug build every use of a component, or a `variant` value, that the active system leaves out, or of a component
  that lives in a layer the system does not extend, is recorded once, in either mode (`segmented-button`,
  `text-field:outlined`), and the error mode reports it with `console.error` instead of `console.warn`. A production
  build reads and records nothing.
  
  **The report names what the system uses instead.** Every system's stylesheet now declares
  `--tanrei-unavailable-replacement`, written from the `insteadUse` of its components manifest (the default system's:
  `segmented-button=tabs,radio-button,button-group`); a product's sheet from `tanrei build` declares it too, with its own
  `components.omit` entries, and Theme Studio's preview declares the same. A component that lives in another layer names its replacement as soon as its manifest entry
  carries one.
  
  **A use is reported under the component the product wrote.** `<tanrei-text-field variant="outlined">` under the default
  system reports `variant "outlined" of text-field` on `<tanrei-text-field>`, not the text input it draws inside.
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
- 98e34cc: Two stylesheets for a page that wants Tanrei's look without writing its own base:
  
  - `@tanrei/web/base.css`, in the cascade layer `tanrei.base`: the page's background is the surface color
    (`sys.color.surface`), its text is on-surface (`sys.color.on-surface`), the body is set in the body role's face, and
    the body has no margin. Before it, a product's own `<p>` was the browser's black Times on white with an 8px margin
    around the page, even in the dark scheme.
    - The face is on `<body>`, not on `<html>`, so `rem` keeps the browser's size: the system's sizes are written in
      `rem`.
    - `color-scheme` is left to the tokens, so a theme forced with `data-tanrei-theme` on `<html>` still wins.
    - Any rule of the product's own wins over the base.
  - `@tanrei/web/tanrei.css`: the base, the default system's tokens and every other stylesheet the package exports
    (text styles, prose, link, table, accordion, code and the rest), in one file. A preset's tokens
    (`systems/<id>.css`) are not in it. The separate stylesheets stay.
  
  No token was added and nothing a component draws changed.
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
- 08d45b6: Button: a link button ignores `destructive`. **Breaking** for anyone building from the main branch: a
  `<tanrei-button href="…" destructive>` that was drawn in the error color is now drawn as the link of its variant
  without it, at rest and in every state, and on a tone a host gives it as any link is. A debug build reports the pair
  once per button.
  
  A link only leads somewhere; following it deletes nothing. The action that deletes is the one at its destination, the
  Delete button on the page the link opens, and that is the one to mark `destructive`. A link to that page is an ordinary
  link whose label says where it goes. An address the Button refuses (a `javascript:` URL) makes no link, so such a
  Button still takes `destructive`. An icon-only button and a dialog's action keep taking it as before.
  
  No baseline changes: no fixture draws a destructive link.
- bf096fd: Button: a component that draws a Button on a colored surface of its own — a status callout, an inverse or status
  snackbar — can now give it that surface's content color, a tone, through the internal channel a Button already reads
  from the component that places it. On a tone the Button draws its label, icon and state layer in that color and its
  container, where its variant draws one at rest (filled, tonal, elevated), in that color at the new
  `comp.button.tone.container.opacity` (the quiet selection's 16 % in the default system); outlined and text draw no
  container, and an outlined edge takes the same translucent color. Hover, focus and press lay the tone over that
  container at the system's state-layer opacities, disabled draws it at the disabled opacities, and the focus ring's
  outer stroke is the tone (or the focus color the host gives). Size, shape, elevation, opacity and the answer to a press
  stay the Button's own; a toggle and a destructive button keep their looks. A tone is not part of the Button's public
  surface: no prop, attribute or custom property gives one, and nothing changes for a Button no host gives a tone to.
  No shipped component gives one yet.
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
- 6d5fe67: Checkbox: **breaking** — `comp.checkbox.mark.width` is removed (`--tanrei-comp-checkbox-mark-width` on the web, and the
  generated token on every platform). No behaviour of the checkbox reads it: the check and the dash are glyphs of the
  icon set, sized by `mark.size` and weighted by `mark.weight`. It was kept only for implementations that still drew the
  mark as paths; a 0.x prerelease keeps no token for an old implementation. A layer that set it drops the line. The
  native platforms, which still draw the mark (and the menu's and the list's checks) as paths, owe the change with
  the rest of their catch-up.
- f535d8f: **Breaking — Chip.** An input chip's remove action is plain by default: `destructiveRemove` now defaults to false.
  The error color says that an action takes away something that may not come back, and most removals take away
  something the person can put back in one step — an applied filter, a search term, an entry they can type again. Set
  `destructiveRemove` where removing loses something that cannot be put back in a step, such as an attachment or a
  recipient already invited.
  
  What broke:
  
  - An input chip that did not set the flag no longer takes the error color while its remove action is hovered,
    keyboard-focused or pressed; it paints from the variant's `remove.*` parts. At rest and disabled it looks as before.
    The chip field's entries and the input chips of a tag group follow, as they leave the flag at its default.
  - On the web the attribute is now `destructive-remove` (set it to turn the look on). The inverse attribute
    `no-destructive-remove` is gone and is not read; remove it from your markup, where it is now an unknown attribute.
  - React: `destructiveRemove` defaults to false; `destructiveRemove={false}` is now the default and can be dropped.
  
  The tokens are unchanged: the `destructive-remove.*` parts stay and are read while the flag is set. SwiftUI, Compose,
  Flutter and React Native, which ship the previous revision of the chip, already draw a plain remove action and do not
  change.
  
  No baseline changes: every fixture is drawn at rest, where the two looks are the same.
- 16608f6: Combobox and Combobox field have `iconSpace` (`icon-space`: `auto`, `always`, `never`; default `auto`), with the
  menu's and the select's values and default. The leading icon column is decided section by section of what the list
  shows: the shown options of a group, or a run of shown options outside any group. While `auto` a shown option
  without a `leading-icon` keeps the column, empty, where another shown option of its section has one, and a section
  without icons keeps none. An option the filter hides no longer counts: before, the column stayed in every row while
  any option, shown or not, had an icon. `always` keeps the column in every option, `never` only where an option has an
  icon.
  
  What changed for an existing page: a combobox whose groups differ in icons, or whose filter hides every option with
  an icon, starts the labels of a section without icons at the row's start; set `icon-space="always"` for the old look.
  Baselines: new fixtures `icon-space-auto`, `icon-space-always` and `icon-space-never`; no existing fixture changes (the
  open right-to-left fixture's filter shows only the group that has an icon).
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
- de75588: **New — a components manifest for every system.** What a system ships is one generated list, for whatever suggests or
  checks a component (a coding agent, an editor, a lint, the documentation):
  
  - each shipped system's is `@tanrei/web/systems/<id>.components.json` (`tanrei` for the default system), and
    `tokens/generated/<id>/components.json` in the repository;
  - `tanrei build` writes a product's into its `tokens` output, as `components.json`.
  
  It lists the components the system ships — each with its level and listing, the layer it lives in, its element (or
  class) with the module that registers it (`@tanrei/web`, or a system's own entry such as `@tanrei/web/m3-like`) and its
  own module, its React name, and the `variant` values the system has, those a layer adds included — and, under
  `omitted`, the components it does not have: with the layer that left each out, why and what to use instead, or the
  layer it lives in (`providedBy`). `omittedVariants` lists the variant values it leaves out, for a composed component
  too (the default system's text field has only `stacked`, as its text input). It is worked out from the system's layers:
  the default system lists neither the FAB menu nor the segmented button, m3-like lists both, cupertino the segmented
  button only, a product keeps what the system it extends leaves out, and a product that includes a component from
  another layer has it listed.
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
- 0dd718d: **Breaking — Dialog: in a compact window a dialog takes the bottom sheet's appearance.** This is Tanrei's rule for every
  dialog and every popover in a window narrower than the component's `compact.window-width` (600 in the default system).
  Below `comp.dialog.compact.window-width` a dialog is no longer a card 16 above the bottom edge and 16 from the sides
  with four rounded corners: it is drawn as the bottom sheet is drawn — at the window's bottom edge, as wide as the window
  up to `comp.bottom-sheet.container.max-width` (640) whatever `width` names, in the bottom sheet's color, elevation and
  top corners, square at the bottom, its color under the bottom inset and above the on-screen keyboard — and it slides up
  and down with the bottom sheet's motion (a fade where motion is reduced). It stays a dialog: the same element, props and
  events, the same role, focus, inertness, scrim and dismissal, with no drag handle and no swipe.
  
  `compactPresentation` (`compact-presentation`, `sheet` by default) set to `own` keeps one dialog centred in every
  window. The `m3-like` and `cupertino` presets keep every dialog centred, as before (their compact width is 0).
  
  Removed: the token `comp.dialog.motion.enter-offset`, which only the card's rise read; the sheet moves by the bottom
  sheet's motion tokens.
  
  Baselines: the dialog's `compact`, `compact-stacked` and `compact-closable` fixtures change as intended (the sheet in
  place of the card), and the new `compact-own` is the centred dialog in a compact window.
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
- e690d47: An English word pack: `import '@tanrei/web/words/en'` gives a word in plain, neutral English for every key of the
  product's words (96 keys: "Required", "Close", "Previous month", "Remove {entry}", …), as one `setWords()` call would,
  so that a product that only wants Tanrei's look writes one line instead of every phrase before its first quiet screen.
  The module also exports the same words as `englishWords`, for a product that starts from them.
  
  It is applied only by that import: `@tanrei/web`, `@tanrei/react`, a component, a stylesheet and the element's `lang`
  never import it, and a page that does not import it behaves as before — no word it did not give, and a report for each
  missing one. A word given with `setWords()` after the import replaces the pack's for its key, and a word on an element
  wins over both.
  
  The words are written once, in `specs/words/en.json`, and generated into the package: `pnpm validate` and `pnpm drift`
  fail while a key the specs declare has no word there, has one that drops a place its key needs, or the file has a key
  the specs do not. The Words page's table of keys shows each key's word in the pack.
- 991095d: **Breaking — the FAB menu lives in the m3-like layer.** A component lives in the layer every system that ships it
  descends from; the FAB menu is shipped by `m3-like` and `m3-expressive-like` only, so it lives in `m3-like`. Its name,
  its element (`<tanrei-fab-menu>`, `<tanrei-fab-menu-item>`) and its behaviour do not change. What breaks:
  
  - `import '@tanrei/web'` no longer registers it. Import the entry of a system that ships it
    (`@tanrei/web/m3-like`), or the component's own module (`@tanrei/web/components/fab-menu`).
  - Its 226 tokens (282 declarations) are no longer in the default `tokens.css` nor in `systems/cupertino.css`; they stay,
    unchanged, in `systems/m3-like.css` and `systems/m3-expressive-like.css`. The default system and cupertino no longer
    list it in `--tanrei-unavailable`: they do not have it, and their sheets say where it lives
    (`--tanrei-unavailable-layer: "fab-menu=m3-like"`). Used there, the element warns in a debug build that its tokens are
    not in the system's stylesheet.
  - `tokens/comp/fab-menu.tokens.json` is now `tokens/systems/m3-like/comp/fab-menu.tokens.json`, declared by m3-like's
    `vocabulary`. `tokens/vocabulary.lock.json` lists its ids under `layers.m3-like`. cupertino's own values and rules for
    the FAB menu are gone with it.
  
  **New — a layer can hold the whole vocabulary of a component that lives in it**, the fourth way a layer extends the
  vocabulary: `"tanrei.comp.<component>": { "document": "comp/<component>.tokens.json", "rationale": "…", "rules": [ … ] }`,
  its document kept next to the layer. A spec and its inventory row say `"layer": "<layer>"` (absent: `core`), and
  `pnpm validate` holds the three together.
  
  **New — a product on another system can include such a component** from the layer that holds it, and draw it with its
  own tokens: `"components": { "include": [{ "name": "fab-menu", "from": "m3-like" }] }`. The component's document and
  the rules of its states come; none of m3-like's values do. A product on the default system that includes the FAB menu
  gets exactly the 282 declarations the default stylesheet had before this change. `tanrei build`, `tanrei validate`,
  Theme Studio and the MCP server's `validate_layer` take the new form; a component that lives in another layer, named
  alone under `include`, is refused with the form to write instead.
  
  The native outputs still type every system with the whole vocabulary: the default system's are unchanged, and
  cupertino's values for the FAB menu are now those its own tokens give the component. The FAB menu's baselines are
  drawn under `m3-like`, where it lives (an intended change of nine images).
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
- 6d89bfe: **Breaking — the text input's resize grip and the bottom sheet's grip are Handles.** A size is changed with one mark
  everywhere: a Handle's line, or its arc at a corner. A glyph of dots read as "move this", which is a reorder handle's
  sign.
  
  - Text input and text field: a field with `resize="manual"` places a `<tanrei-handle size="small">` in its bottom end
    corner, a line for `resize-axis="vertical"` and an arc for `both`, out of sight until a pointer is over the field or the
    field has focus. It is drawn, targeted, focused and pressed as every Handle is, and is drawn alike in every look and in
    error. The part `resize-grip` is renamed `resize-handle`. Page Up and Page Down (and Shift with an arrow) now move it by
    `minRows` lines, and while `maxRows` is 0 its separator's greatest value is the lines the text needs.
  - New event `resizeend` on the text input and the text field (React `onResizeend`), fired once when the person has
    changed the size: at the end of a drag, or after a key or an activation that changed it. `detail` is `{ lines, width }`
    (`width` is null unless `resize-axis` is both), so a product can keep the size a person chose.
  - Bottom sheet: the drag handle is a `<tanrei-handle>` given the sheet's own tokens; the parts `handle` and `grip` are
    its `container` and `line`. Its hit area and its vertical resize cursor are the Handle's, it grows its grip under a
    pointer, and a drag that starts on it keeps it pressed while the sheet follows. At rest it is drawn as before.
  - Tokens removed: `comp.text-input.resize-grip.size`, `comp.text-input.resize-grip.inset`, every
    `comp.text-input.<look>[.<state>][.error].resize-grip.color` (26 in all), and `comp.bottom-sheet.handle.grip-shape` (a
    Handle's line always has round ends). `comp.bottom-sheet.handle.*`, `comp.bottom-sheet.drag-handle.*` and the sheet's
    state motion now alias `comp.handle.*`, and the sheet's hovered and pressed grip colors are the Handle's line colors.
  - Baselines: the text input's manual-resize fixtures change (the glyph is gone; the handle is out of sight at rest).
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
- 41aabb3: **Breaking:** on the web and in React, a heading's text is `headline` on every component. Three components used other
  names. There is no alias for the old names.
  
  | Component | Before | Now |
  |---|---|---|
  | Code block | `<tanrei-code-block title="sizes.js">`, `<CodeBlock title="sizes.js">` | `headline="sizes.js"` |
  | Tooltip (rich) | `<tanrei-tooltip variant="rich" title="Storage">`, `<Tooltip title="Storage">` | `headline="Storage"` |
  | Navigation drawer section | `<tanrei-navigation-drawer-section heading="Mail">`, `<NavigationDrawerSection heading="Mail">` | `headline="Mail"` |
  
  What breaks:
  
  - **Code block and tooltip:** a `title` attribute is the browser's own again. The two elements no longer read it or
    remove it, so a `title` left on them draws the browser's native tooltip and no heading. Rename it to `headline`.
    The `title` property is the platform's `HTMLElement.title`.
  - **Navigation drawer section:** a `heading` attribute or property is no longer read. The spec names this prop `title`,
    as a group's heading is named in the other specs. Its web-only `heading-level` keeps its name, because it is the
    level of the heading element it draws, not its text.
  - **The docs' code fences:** a fence names the block's heading with `headline="…"` (it was `title="…"`).
  
  Nothing is drawn differently.
- 3990b23: A control's own label is now its whole name over the name a product writes on it, and the rule that moves the
  product's ARIA from a host with no role to the element that carries the role covers the surfaces, the landmarks and
  the rest of the hosts without a role.
  
  **Breaking:** on the elements listed below, select by `data-aria-*` and read `data-aria-*`: `getAttribute('aria-…')`
  on them is `null`. A `label` given now wins over your `aria-labelledby` and `aria-label`.
  
  - **A given label wins.** Where a control's `label` is set (or the label of the Field that frames it), your
    `aria-labelledby` and `aria-label` on it are kept out of its name, as the Button's already were: the Text input,
    Select, Combobox, Number input, Color input, One-time-code input, Checkbox, Radio button, Switch, Slider, Search,
    Card, FAB menu, segments, navigation destinations and groups, the Navigation drawer and the tab list of Tabs and of
    a Tab view. The Chip, the Main action button, a Button with menu's leading half and a labelled Copy button, named by
    their content, now say that text as their `aria-label`, so it wins over your `aria-label` too. With `label` empty,
    your name is the name, as before.
  - **A tab's label wins too.** A `tanrei-tab`'s host is the tab, so what you write on it stays there, but while its
    `label` is set your `aria-label` and `aria-labelledby` on it are held as `data-aria-label` and
    `data-aria-labelledby`, and given back as you wrote them when `label` is emptied. Removing one, or setting its ARIA
    property to `null`, takes the held value away.
  - **More elements move your ARIA inside:** the Dialog, Modal layer, Image preview, Side sheet, Bottom sheet,
    Date-time picker and Popover (on their dialog, or their region while not modal); the Breadcrumbs, Pagination and
    Table of contents (on their navigation landmark); the Tag group (on its list); the Handle (on its separator or
    button; `aria-disabled` and `aria-expanded` are its own and reported); and the Calendar, Code block and File picker
    (on their group, which each now becomes while you name it). A name you give counts before a debug build reports a
    missing one, on these and on a segment of a Segmented button.
  - **No copy left behind.** When a template stops drawing the element a description was exposed on (a Text input turned
    multi-line), the hidden copy of that description goes with it.
- df119df: ARIA a product sets on the last elements whose host has no role now reaches the element that carries their role, and
  each is one node for assistive technology: the Field group, the Checkbox group and the Radio group (on their group or
  radio group), the Chat composer and the File upload (on their group), the Navigation drawer itself (on its navigation
  landmark, or its dialog while it is a modal drawer that is shown) and the Tab view (on the tab list of the row it
  draws). Each `aria-*` attribute written on the element moves to the `data-aria-*` attribute of the same name and is
  exposed inside, except those the component owns, which its spec names.
  
  **Breaking:** select those elements by `data-aria-*` and read `data-aria-*`: `getAttribute('aria-…')` on them is
  `null`.
  
  - A group's, a Chat composer's and a File upload's name is its `label`, and its states are its props: `aria-label`,
    `aria-labelledby`, `aria-disabled`, `aria-required`, `aria-invalid`, `aria-errormessage` (and a Chat composer's
    `aria-busy`, a Radio group's `aria-readonly`) on it are moved, not exposed, and reported in a debug build. This
    replaces their report of an ARIA name on the host.
  - A Tab view linked to tabs placed elsewhere draws no row, so what is written on it reaches nothing: it is moved and
    reported. Write it on the linked `tanrei-tabs`.
  - Setting a moved name's ARIA property to `null` on any of these controls, and on every other control that moves the
    product's ARIA (`el.ariaLabel = null`, `el.ariaDescribedByElements = null`, Lit's `.ariaLabel=${nothing}`), now takes
    the moved value away, as removing the attribute does. Setting it to a value moves it as before; the getters read
    `null` on the element.
  - A control whose `label` is empty and that the product names by `aria-label` or `aria-labelledby` is no longer
    reported unnamed in a debug build: the Text input, Select, Color input, Number input, Combobox, One-time-code input,
    Checkbox, Radio button, Switch, Slider, Search, Chip, Card, icon-only Copy button, Main action button, Button with
    menu, FAB menu, a Tab, the destinations of a Navigation bar and a Navigation drawer, a drawer's group and a modal
    drawer. A Tab keeps the `aria-label` the product writes on it while its `label` is empty, and a FAB menu named so
    names its list by its toggle.
  - The debug report of an `aria-*` attribute a control owns cites the id of the control's own spec sentence for this
    rule (`BTN-46`, `TXF-68`…), not `host-aria`.
- b921047: ARIA a product sets on a control now reaches the element that carries its role, and the control is one node for
  assistive technology. On Button, Button with menu (its leading half), Main action button, Copy button, Chip, Card,
  Checkbox, Switch, Radio button, Slider, Text input, Select, Combobox, Search, Number input and Color input, every
  `aria-*` attribute written on the element itself (`aria-label`, `aria-labelledby`, `aria-describedby`,
  `aria-description`, `aria-controls`, `aria-details`, `aria-errormessage`, `aria-current`, `aria-expanded`,
  `aria-haspopup`, `aria-invalid`, `aria-required`, `aria-pressed`, `aria-checked` and the rest) is exposed on the native
  element inside, beside the component's own, except those the component owns (a toggle's `aria-pressed`, a checkbox's
  `aria-checked`, `aria-disabled`, and the `aria-haspopup`, `aria-expanded` and `aria-controls` of a control that opens a
  list). An id reference is resolved in the control's tree and drawn by ARIA element reflection (Chrome and Edge 135,
  Firefox 136, Safari 16.4), and follows the element it names as it is added, removed or changed; an engine without
  reflection is given the text of the elements named. `aria-errormessage` is read as part of the description while the
  control is invalid. Before, only `aria-description` (and, on a Button, `aria-invalid`) got through, and an id reference
  never did.
  
  **Breaking:** each of those attributes **moves** to the `data-aria-*` attribute of the same name on the control
  (`aria-current="page"` becomes `data-aria-current="page"`), so the control's own element is no second node with the
  same name, description or state — which Chromium, Firefox and WebKit all made of it, and no role or style prevents.
  For products:
  
  - Select the control by the moved name: `tanrei-button[data-aria-current="page"]`, not `[aria-current="page"]`.
  - `getAttribute('aria-current')` and the `ariaCurrent` property on the control are `null`; read `data-aria-current`.
  - Removing the `aria-*` attribute you set (`removeAttribute`, `toggleAttribute`, or a React, Vue or Lit binding set to
    nothing) still takes it away; so does removing `data-aria-*`.
  - An id reference must name an element in the same tree as the control or in a tree around it, never one inside
    another component's shadow root.
  - `aria-hidden` stays on the control.
  - Playwright's `getByRole({ name })`, `getByLabel()`, `ariaSnapshot()` and `toHaveAccessibleDescription()` see the
    name and the description; `toHaveAccessibleErrorMessage()` reads nothing, because the error message is part of the
    description.
  
  The selected look of a `.tanrei-icon` reads `data-aria-pressed`, `data-aria-selected`, `data-aria-checked` and
  `data-aria-current` on an ancestor too. The internal `forwardedDescription` and `forwardedInvalid` properties of Button
  and Main action button are removed.
  
  An icon-only Button with an empty `label` that the product names with `aria-label` or `aria-labelledby` on the element
  is named by it and no longer reported as nameless in debug builds (BTN-16); a `label` given is still the whole name,
  over the product's `aria-labelledby`.
- c3e2126: ARIA a product sets on the rest of the controls now reaches the element that carries their role, and each is one node
  for assistive technology: the composed fields (Text field, Number field, Select field, Combobox field, Color field,
  Slider field, Chip field, One-time-code field), Embedded text input, One-time-code input, a Segmented button's
  segments, the FAB menu's toggle, the destinations and groups of a Navigation bar and a Navigation drawer (in both its
  forms, the rail included) and the Tabs' tab list. As on Button and the others, each `aria-*` attribute written on the
  element moves to the `data-aria-*` attribute of the same name and is exposed inside, except those the component owns,
  which its spec names.
  
  **Breaking:** select those elements by `data-aria-*` (`tanrei-navigation-bar-item[data-aria-describedby]`), and read
  `data-aria-*`: `getAttribute('aria-…')` on them is `null`.
  
  - A composed field passes the product's ARIA on to its control, beside its Field's description and states. Its name is
    its `label`: `aria-label` and `aria-labelledby` on it are moved and not exposed.
  - An Embedded text input takes its name, description and states as props alone: `aria-label`, `aria-labelledby`,
    `aria-description`, `aria-describedby`, `aria-errormessage`, `aria-invalid`, `aria-required`, `aria-readonly` and
    `aria-disabled` on it are moved and not exposed.
  - A destination's `aria-current`, a group's `aria-expanded` and `aria-controls`, a segment's `aria-checked` and
    `aria-pressed`, and the FAB menu's `aria-haspopup`, `aria-expanded` and `aria-controls` are their own.
  - A product's `aria-description` on a navigation destination or group is read before the component's own description.
  - A search drawn as an icon now says that it opens a dialog, whether it is open and its shortcut through its Button,
    which moves them and exposes them on its native button.
  
  In a debug build, every control that moves the product's ARIA — these and the sixteen before them — reports once each
  `aria-*` attribute it owns that the product sets (`console.warn`); what a Tanrei component writes on another (a Field on
  its control, a tooltip on its anchor) is not reported. It replaces the report of an ARIA name on a composed field's or
  an Embedded text input's host.
- d418520: The elements whose host carries its role and names itself now hold the name a product writes on them, as a tab
  does, and the last hosts the rule had left undecided are decided.
  
  **Breaking:** where an element below names itself, your `aria-label` and `aria-labelledby` on it are held as
  `data-aria-label` and `data-aria-labelledby`; where it moves your ARIA inside, select and read `data-aria-*`.
  
  - **Its own name wins, yours is kept.** The Loading indicator, Progress indicator, Meter, Menubar and its action
    items, Toolbar and its groups, Button group, Stepper, Segmented button (the set), Navigation bar (the bar),
    Avatar and Avatar group, Swatch, a FAB menu's items, List and its options, Menu items, submenus, groups and the
    Menu, Callout and Tree view. While their own name (`label`, a callout's title or `headline`, a menu's anchor) is
    set, your `aria-labelledby` no longer takes the name from it; while it is empty, your name is the name, where
    before it was wiped at the next update. While the element shows no role (a loading indicator waiting to show, a
    decorative avatar, a closed callout or menu, a swatch drawing its text), your name is held, and given back when
    it does. A name you give counts before a debug build reports a missing one.
  - **A name you give makes a named group or image.** A Button group or a Toolbar group with no `label`, and an Avatar
    or a Swatch with no name of its own, that you name are exposed as a group or an image named by your name.
  - **A list option, an action or a link item is named by your name over its content** while its `label` is empty, as
    an author's `aria-label` is over content in the platform's name computation. The Button says the same of its drawn
    text, which it already did.
  - **Moved in one mode.** A List item that is an action or a link, a reorderable List, and a Menu item that is a link
    move your ARIA to the element inside that carries the role, and give it back to the host when they leave that mode.
  - **The Field reports your ARIA.** `tanrei-field` has no role and frames your own control: what you write on its host
    is moved, exposed on nothing and reported; write it on the control.
  - **The Scroll area** exposes your ARIA on its box, and your name only while the box is a focus stop (a region); a
    name it cannot carry is reported.
  - **The Table of contents' compact row** is named by the name you give the landmark and the current item it shows,
    and is no longer reported unnamed then.
- e711cc1: Icons: a `.tanrei-icon` can take its glyph's name from `data-icon` instead of its text —
  `<span class="tanrei-icon" data-icon="folder"></span>`. `icons.css` draws the name as generated content with an empty
  alternative, so it is the same glyph at the same size, selection and fill, but the name is no longer text of the page:
  it is not in `textContent` or `innerText`, in what people copy, or (from Firefox 128 and Safari 17.4) in the accessible
  name of the control around it. Right-to-left mirroring reads the attribute too, for a bare icon (`observeIcons()`) and
  for one in a component's icon slot, and follows a changed `data-icon`. `data-icon=""` is no name. The Icons page
  describes it in six languages.
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
- abc8133: List has `iconSpace` (`icon-space`: `auto`, `always`, `never`; default `auto`), as Menu, Tree view and Navigation
  drawer have. A List row without a leading part now keeps the room of a leading glyph, empty, while the row of another
  item of its list draws one (`leading-icon`), so that the headlines of rows with and without a glyph start on one line;
  a list whose rows draw no glyph keeps no room. `always` keeps the room in every row, `never` only where a row draws a
  glyph. An avatar, a picture or a control in a row's `leading` slot does not count and keeps no room beside it, and a
  List row standing alone keeps none.
  
  What changed for an existing page: a list in which some rows have `leading-icon` and others none drew the others'
  headlines at the row's start and now draws them after the glyph's room; set `icon-space="never"` for the old look. The
  rule that lining up such rows was the product's is retired. The list spec now names a List row as a kind of an item's
  content, for its fixtures; the elements are unchanged. New fixtures `icon-space-auto`, `icon-space-always` and
  `icon-space-never` have new baselines; no existing baseline changes, since no list fixture held rows before.
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
- 2fe1f5a: **Motion by role, one appearance, and an accelerating exit.** New core tokens name how long a change takes and how it
  eases by what moves, and where everything that appears starts from. Nothing drawn changes yet: no component reads them
  in this release.
  
  - `tanrei.sys.motion.role.*` (21 durations, following `dial.motion.unit`): `state.{compact,default,large}` 200 / 250 /
    250 ms, `selection.{mark,travel}` 250 / 250, `resize.{default,large}` 300 / 400, `disclosure` 400,
    `appear.{hint,anchored,modal,sheet,toast}.{enter,exit}` 250/200, 300/250, 350/300, 400/350, 350/300, `feedback` 450,
    `show-delay` 300, `reduced` 100. A component's duration token is to alias its role, so a product re-times every
    component of a role in one line.
  - `tanrei.sys.motion.easing.{enter,exit,state,spatial}`: the default system enters, changes state and moves on the
    standard curve, `cubic-bezier(0.2, 0, 0, 1)`, and leaves on the accelerating one, `cubic-bezier(0.3, 0, 1, 1)`.
  - `tanrei.sys.behavior.appearance` — `fade-scale` (the default system: fade in, grow from 0.96), `fade`, `fade-slide`,
    `blur-slide`, `unfold` — sets `tanrei.sys.motion.appear.{opacity,scale,distance,blur}`; `appear.origin` (`anchor` |
    `center`) says where an anchored surface grows from. A layer chooses the appearance, or pins one of the values.
  - The rule language has a ninth function, `pick`: one value per name of a choice of kind, and the token takes the one
    the system's choice names. A pin holds against it as it does against a dial.
  - `m3-like` (and so `m3-expressive-like`) states Material 3's durations and emphasized curves for every role and
    chooses `unfold`, so it draws the same when its components take their roles. `cupertino` takes the root's.
  - The vocabulary grows by 31 ids (`tokens/vocabulary.lock.json`). The Figma plan documents the role durations and the
    appear values as numbers without a scope. The native platforms' generated system types gain `appearance` and the four
    easing roles.
  - `docs/architecture/motion.md` states the principles every component's motion is held to (MOT-1 to MOT-6).
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
- 1c85b08: **A system that does not have a component of another layer is told what to use instead.** The layer that holds a
  component's whole vocabulary now says what a system without it uses for its job, beside the declaration:
  `"outside": { "reason": "…", "insteadUse": [ … ] }`. Every components manifest of a system without the component —
  each shipped system's and the one `tanrei build` writes for a product — lists it under `omitted` with the layer it lives
  in (`providedBy`), that `reason`, and the components of `insteadUse` the system ships. The FAB menu, which lives in the
  m3-like layer, names the main action button and the bottom sheet: the default system's and cupertino's manifests name
  them; a product that includes the FAB menu has no entry for it. The stylesheet of each such system, a product's
  from `tanrei build` among them, names the same stand-ins in `--tanrei-unavailable-replacement`, so a debug build's report
  of a `<tanrei-fab-menu>` under the default system names the main action button and the bottom sheet.
  
  `pnpm validate` refuses a stand-in that is not a component of the inventory, or is the component itself, and a shipped
  system without the component that does not ship one of its stand-ins (the manifest would drop it unseen). A product
  that leaves a stand-in out is not refused: its manifest names the others.
- dd76e41: Pagination: a new current page is now a change you see happen. The page that was current gives up its fill, and the
  page that becomes current takes it, over `comp.pagination.motion.state-duration` with `.state-easing` — the same motion
  as any other change of an item's state; a previous or next control that becomes disabled, or enabled again, fades the
  same way. An item the row now uses for another page (the row's numbers shift when the current page moves through the
  middle) is drawn as that page at once, so no colour of the page it drew before fades into it. Where motion is reduced,
  every change is at once, as before. What broke: the row is no longer drawn whole at once when the page changes; a test
  or a product that read an item's colours in the frame after setting `page` reads them part of the way through the
  motion.
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
- 7072d6a: **Breaking — Popover: in a compact window a popover takes the bottom sheet's appearance.** This is Tanrei's rule for
  every popover and every dialog in a window narrower than the component's `compact.window-width` (600 in the default
  system). Below `comp.popover.compact.window-width` (new, an alias of `sys.breakpoint.medium`; 0 turns it off for a
  system) a popover is no longer placed beside its anchor: it is drawn as the bottom sheet is drawn — at the window's
  bottom edge, as wide as the window up to `comp.bottom-sheet.container.max-width`, in the bottom sheet's color,
  elevation and top corners, square at the bottom, above the on-screen keyboard — and slides up and down with the bottom
  sheet's motion (a fade where motion is reduced). It is the same element with the same props and events, and it is then
  a modal dialog over the bottom sheet's scrim: everything behind it is inert, focus is kept in, and Escape, a press on
  the scrim (`close` with the reason `outside`) and the close button close it; it never sends `focus-out` or
  `anchor-hidden` there. It has no arrow and no drag handle, and `placement`, `offset`, `crossOffset` and `width` do not
  apply to it. Crossing the width while it is open changes its form at once, keeping focus.
  
  `compactPresentation` (`compact-presentation`, `sheet` by default) set to `own` keeps one popover beside its anchor in
  every window; `initialFocus="anchor"` always does, because the field being typed in must stay usable. A popover that
  must stay beside what it belongs to on a phone sets it.
  
  The select's and the combobox's lists, the menus and the tooltip are unchanged: they stay beside their control in every
  window.
  
  Baselines: the popover's new fixtures `compact` (the sheet) and `compact-own` are drawn in a 360 × 640 window; no
  existing popover baseline changes.
- fba98d4: Read-only checkbox, radio button, radio group and switch: `readOnly` (the `readonly` attribute on the web). A
  read-only control shows its answer in place and keeps it in the focus order, so that it is read with its form — a
  review step, or a setting only some people may change — as React Aria's `isReadOnly` does for its Checkbox,
  RadioGroup and Switch:
  
  - It stays focusable and in the tab order, and nothing a person does changes it: a press, Space, a click on its label,
    assistive technology, `click()`, a drag along a switch's track, or an arrow key that lands on a read-only radio
    button (which moves focus there and selects nothing). It fires no `input` and no `change`. The product may still set
    its value.
  - It is exposed as read-only: `aria-readonly` on the checkbox's and the switch's native element, and on the radio
    group's `radiogroup`. WAI-ARIA has no read-only state on the radio role, so a radio button says it through its
    group; options grouped by `name` alone say it on the container the product gives them.
  - It is drawn as its value, from the enabled tokens of its condition — never the disabled ones — without the hover
    and press answers (no state layer, ripple or dim, and no pressed handle on a switch); keyboard focus still shows.
  - It is submitted with its form, and a required one reports no missing value, because the person cannot give one.
    HTML's `readonly` does not apply to checkbox and radio inputs, which is why the components do this themselves.
  
  `disabled` wins over `readOnly`. A radio group's `readOnly` makes each of its radio buttons read-only without
  changing their own. The radio group's spec no longer says that it has no read-only state.
  
  New baselines: `checkbox/read-only-selected`, `radio-button/read-only-selected` and `switch/read-only-selected`
  (new fixtures, drawn as the enabled `selected` fixtures are). SwiftUI, Compose, Flutter and React Native do not have
  `readOnly` yet.
- aa0133e: **Breaking:** what a form asks of a field is two booleans, `required` and `optional`. The three-valued `requirement`
  is gone. There is no alias for it.
  
  | Before | Now |
  |---|---|
  | `requirement="required"` | `required` |
  | `requirement="optional"` | `optional` |
  | `requirement="none"` (the default) | neither |
  
  - **Where:** the Field and the Field group, and every component built from one: the text field, number field, select
    field, combobox field, color field, slider field, one-time-code field, chip field, checkbox group and radio group.
    React's `<TextField required />` and `<TextField optional />` type-check; `requirement` no longer does.
  - **`required` is HTML's own name.** It exposes the control as required and draws the required mark. The chip field,
    the checkbox group and the radio group still report a missing answer to the form while it is set.
  - **`optional` draws the optional tag** and adds `optionalText` to the description.
  - **With both set**, the element is required: no optional tag is drawn, and a debug build reports that `optional` is
    ignored. A control is never both.
  - **Unknown values:** a value of `requirement` that the element did not know (it behaved as `none` and was reported)
    is no longer possible.
  - **Removed types:** `TanreiFieldRequirement`, `TanreiFieldGroupRequirement` and `TanreiRadioGroupRequirement`.
  - **Unchanged:** the embedded text input, the file picker and the file upload keep the `required` they had.
  
  Nothing is drawn differently: a field written with `required` draws what `requirement="required"` drew.
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
- afb26f3: Menu, Select, Combobox, Search and List take `density` (`regular`, `compact`; default `regular`), as the tree view and
  the list row do; Select field and Combobox field forward it. A compact row is the tree view's compact row: 32 high, 20
  glyphs, 8 from its edges, the same text styles. It is for a tool used with a mouse. For touch a row is never lower than
  the touch target in either density; for a fine pointer a compact row is as high as its density gives (still above the
  24 by 24 of WCAG 2.5.8), where a regular row is held to the pointer target. A design system may add densities.
  
  - Menu: every row of every surface, submenus included; the group titles' inset follows the rows'.
  - Select, Combobox: the options and the group titles of the list. The field's box is still `size`'s.
  - Search: every row of the view, results and linked group headings included. The bar, the trigger, the header, the
    group titles and the status row do not change.
  - List: the box of an action, a link and an option (its least height and its padding above and below), and every List
    row that is an item's direct child.
  
  What broke:
  
  - The row tokens of the five components are split by density: `comp.menu.container.{height,padding-block,padding-inline,gap}`,
    `comp.menu.{leading-icon,trailing-icon,mark}.size` and `comp.menu.group-title.padding-inline`;
    `comp.select.option.*` and `comp.combobox.option.*` (height, paddings, gap, leading icon and mark sizes) and their
    `group-title.padding-inline`; `comp.search.suggestion.container.{height,padding-block,padding-inline,gap}` and
    `comp.search.suggestion.leading-icon.size`; `comp.list.container.{height,padding-block}`. Each is now `<name>.regular`
    (the old value) and `<name>.compact` (custom properties `--…-regular`, `--…-compact`). A layer or a page that set
    one sets its `.regular` now.
  - A List row inside an item of a list draws the list's density, not its own: set `density` on the list.
  
  Baselines: new fixtures `density-compact` for the five components. No other image changes: the regular values are the
  old ones.
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
- 615f0c9: The search's first suggestion, made active as soon as the suggestions show, is no longer read out after every key the
  person types. It is selected, and Enter still chooses it, but the input names it as its `aria-activedescendant` only
  once the person moves with an arrow key (the Down Arrow that opens the view counts). From then on, each suggestion an
  arrow key moves to is read, as before. The first Down Arrow no longer skips it: it stays on that suggestion and has it
  read, and the next goes on to the second; with results and no suggestions, the first Down Arrow moves focus to the first
  result rather than the second. This is what the WAI-ARIA list autocomplete example and GitHub's combobox navigation do.
  
  On an on-screen keyboard nothing is made active by itself any more, neither the first suggestion nor the first result:
  the keyboard's Search or Go key submits the query as typed, as a search field on a phone does, and the person touches the
  suggestion they want. The search counts the keyboard as on-screen when a touch or a pen gave the input focus, and as a
  hardware keyboard again after an arrow key, Home, End or a mouse press on the input.
  
  Each suggestion's option now has an id of its own element instead of one by its place in the list, so suggestions the
  product replaces are new options to a screen reader, and one the product moves keeps its id.
  
  With a result current, Enter in the input with Command (Control on other keyboards) opens it in a new tab, and with Shift
  in a new window, as that press on the link would. Nothing is emitted and the view stays open.
- 05e39e7: **Breaking (behaviour).** The search now makes its first suggestion active as soon as the view shows suggestions, so a
  single Enter chooses it, as a web search, a documentation search and a command palette do. This is the WAI-ARIA
  combobox's list autocomplete with automatic selection. Focus stays in the input. The suggestion is selected, but the input
  names it as its `aria-activedescendant` only once the person moves with an arrow key, so a screen reader does not read a
  suggestion after every key typed. The suggestion becomes active
  again each time the person types, deletes, pastes or moves the caret, and each time the product gives new suggestions,
  the view opens, or focus comes back to the input. The first Down Arrow stays on it and has it read out; the next goes on
  to the second suggestion. Up Arrow on the first
  leaves none active, and Enter then emits `submit` with the query as typed.
  
  With results and no suggestions, the first result is current while focus stays in the input. It is drawn as a focused
  result, and Enter in the input activates it as Enter on the link does: `select`, then the link is followed unless
  `select` was cancelled. The first Down Arrow moves focus to it, and the next ones on through the results. A result is a link, not an option, so it is never the
  input's active descendant, and the status row still says what was found.
  
  What broke: Enter in the input with suggestions or results showing no longer emits `submit` unless the person first
  presses Up Arrow on the first row. A product that wants Enter to search for the typed text while suggestions show gives
  that text as its first suggestion. The search does not add that row itself.
  
  While an input method is composing, no suggestion or result is current, and Enter, Escape and the arrow keys are the
  input method's: the Enter that confirms a conversion takes nothing. Escape during a composition used to close the view.
  It now cancels the composition only.
  
  The combobox already worked this way where it filters with `allowCustomValue` false: the first match is active from the
  first key. With `allowCustomValue` true no option becomes active by typing, so Enter commits the text as typed. That is
  unchanged.
  
  No baseline changes. A fixture drawn in place has no focus in its input, so nothing in it is active or current.
- 0424ae9: Search has `iconSpace` (`icon-space`: `auto`, `always`, `never`; default `auto`), with the menu's values and default.
  The view is decided as a whole, as before: `auto` keeps the leading icon column, empty, in every suggestion, result
  and linked group heading while any of them has an icon, and none while none has — what the search always did.
  `always` keeps the column in every row, whether or not any row has an icon; `never` keeps it only in a row that has
  an icon of its own.
  
  No existing baseline changes, since `auto` is the old behaviour; new fixtures `icon-space-auto`, `icon-space-always`
  and `icon-space-never` have new baselines.
- fefe825: **Breaking (behaviour).** The search's suggestions are queries, and the query as typed is now always what Enter takes
  until the person moves.
  
  - **The query row** (`query-row="first"`, the default): while suggestions show and there is a query, the first row is a
    row of the search's own — the search glyph and the query, and under it `query-row-text` if you give one ("Search all
    mail") — active from the moment the suggestions appear, so Enter searches for what was typed, as the first row of a
    browser's address bar does. A press on it does the same. What broke: Enter with suggestions showing no longer chooses
    the first suggestion. A product that gave the typed text as its first suggestion, as the previous release advised,
    takes it out: the query row is that row now.
  - **`query-row="none"`**, a web search page's form: no query row, nothing active until the person moves, and the input
    is the place before the first suggestion in the arrow keys' cycle.
  - **The arrow keys** go through the query row (or the input's place), the suggestions and the results, and go round at
    both ends; `no-wrap` stops them. The first Down Arrow goes to the next row again: it no longer stays on the row Enter
    takes. A suggestion an arrow key reaches is shown in the input without changing `value` or firing `input`; the query
    as typed comes back on the query row, and when the view closes or the input loses focus. Typing on a shown suggestion
    edits that text, which becomes the value.
  - **Results**: with no suggestion the first result is still current and opened by Enter; Down Arrow now goes to the
    second.
  - **`inline-completion`** (off by default) completes the query in the input from the first suggestion that begins with
    it, the added part selected after the caret. A caret key or a press in the input accepts it (one `input`), Backspace
    takes it away, Enter accepts it and submits. It never completes after a deletion or a paste, during an input-method
    composition or on an on-screen keyboard; a composition's first text replaces the completion, and a composition
    cancelled before it inserted anything takes the completion away as Backspace does.
  - **A query suggestion's completion** — the part of its headline after the query — is drawn bold, as web search boxes
    draw it (`part="completion"`, the new token `comp.search.suggestion.completion.emphasis`, three of the body family's
    emphasis steps: 400 to 700 in the default system and the Material-like presets; one step, semibold, in the Cupertino
    preset, whose step is already 200). The vocabulary gains that token.
  - **Announcements**: a row the search makes current by itself — the query row, or the first result — becomes the input's
    `aria-activedescendant` once typing has paused for 500 ms, and a row an arrow key reaches at once. A result's link is now
    the result's own light-DOM child (slotted over the row it draws), so that the input can name it.
  
  The combobox's arrow keys go round at the ends too — through the text where `allow-custom-value` is set — unless
  `no-wrap` (the combobox field passes it on), and the first match typing makes active is named as the active descendant
  once typing pauses for 500 ms.
  
  Baselines: every search fixture with suggestions and a query gains the query row and the completion's weight (`docked`,
  `full-screen`, which now shows `query-row-text`, `docked-results`, `icon-space-auto`, `icon-space-always`,
  `icon-space-never`, `density-compact`), and the new fixture `docked-query-row-none` shows the form without it: the
  intended result of the spec change.
- d31aedb: Select and Select field have `iconSpace` (`icon-space`: `auto`, `always`, `never`; default `auto`), with the menu's
  values and default. The leading icon column is now decided section by section, as the menu decides it: a section is
  an option group, or a run of options outside any group. While `auto` an option without a `leading-icon` keeps the
  column, empty, where another option of its section has one, and a section where no option has an icon keeps none,
  its labels starting at the row's content start. `always` keeps the column in every option, `never` only where an option
  has an icon.
  
  What changed for an existing page: a select whose groups differ in icons kept the column in every row of its list;
  the group without icons now starts its labels at the row's start. Set `icon-space="always"` for the old look of such
  a list. A list in which all or none of the options have icons draws as before.
  
  Baselines: new fixtures `icon-space-auto`, `icon-space-always` and `icon-space-never`. The baselines of the open
  right-to-left fixtures whose second group has no icon change as intended — `select/open-rtl`, `select-field/open-rtl`
  and `field/select-open-rtl`: that group's labels now start at the row's start. The last two also lose the fill of
  the chosen option, which their old images still drew from before the chosen option lost it at standard contrast.
- b1ba89f: Select and Select field have `status` (`idle`, `loading`, `error`; default `idle`), `statusText` (`status-text`) and
  `emptyText` (`empty-text`): the combobox's and the search's three properties, with the same values and meaning. While
  `status` is `loading` the list shows a small loading indicator named by `statusText` after its options and is marked
  busy; while it is `error` it shows `statusText` in the error color and reads it at once; `statusText` alone is shown
  after the options and read politely. While the select holds no option and has no status, it shows `emptyText` in the
  list. The row stands under the options, outside the part that scrolls, and is never an option. Its live regions are
  given the row's text once the list is shown, so what it already says when the list opens is read too. The status row
  is the `status` part.
  
  The product's words have a new key, `noOptionsText`, which an empty `emptyText` reads (the English word pack:
  "No options"). The combobox's `emptyText` keeps reading `emptyText`, "No matches": a text that matched nothing and a
  list with nothing in it are different things to say.
  
  Tokens: `comp.select.status.typescale`, `comp.select.status.color` and `comp.select.status.error.color`, which hold the
  combobox's status row's values in every shipped system.
  
  What changed for an existing page: a select with no option still does not open unless it is given a status, a status
  text or an empty text, as before; given one, it now opens and its list holds that row alone.
  
  Baselines: new fixtures `open-loading`, `open-status`, `open-status-error` and `open-empty`. No existing image changes.
- cb29df6: Tokens: `sys.state.selected-state-layer-opacity` (0.16, twice the hover layer) is the quiet selection's step. A
  list's selected option, a menu's current link item and its checked row (at medium and high contrast), the chosen
  option of a select and a combobox, the tonal tabs' indicator and the tint inside a checked radio ring now take it,
  where each wrote 16 % itself; a design system that sets it moves them all together. The vocabulary grows by this one
  token (CSS `--tanrei-sys-state-selected-state-layer-opacity`, and `selectedStateLayerOpacity` in each platform's
  state group). Every shipped system keeps the value it drew, so nothing looks different and no baseline moves.
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
- 754642a: Tabs run vertically. `<tanrei-tabs orientation="vertical">` stacks its tabs in a column at the start edge, beside the
  panels it switches — the categories of a settings page or a dialog. Every tab is as wide as the widest (or as
  `::part(tablist)` makes the column), with its icon before its label at the start edge, and at least the minimum target
  tall. The indicator and the hover, focus and press container are the tab less the track's inset on every side, and the
  track's corners are the indicator's plus that inset, so the two stay concentric at the ends — derived from the existing
  tokens; no token is added. Down and Up Arrow move and select (Right and Left do nothing), the tab list has
  `aria-orientation="vertical"`, the tabs scroll up and down inside the track when the row has a height, and only a mouse
  or a pen drags the indicator (a touch scrolls). A design system's underline and divider lie on the column's end edge,
  the left one in right-to-left. `fullWidth` does not apply to a column, and debug builds say so; an orientation the tabs
  do not define is horizontal, and reported. Vertical tabs are not navigation between destinations: that is the
  navigation drawer's.
  
  Seven new fixtures (`vertical`, `vertical-small`, `vertical-scroll`, `vertical-rtl`, `vertical-disabled-tab`,
  `vertical-secondary`, `vertical-no-track`) and the preset baselines of `vertical` add new baselines; no existing
  baseline changes.
- 3589b98: Tabs: a row without panels is announced as the choice it is. A `<tanrei-tabs>` that holds no `<tanrei-tab-panel>` and
  is linked to no `<tanrei-tab-view>` with a panel for its tabs — a row over a calendar, a set of examples, a table or a
  list, whose result the product draws on `change` — is now a radio group named by its `label`, and each `<tanrei-tab>`
  a radio with `aria-checked` in place of a tab with `aria-selected`. A screen reader no longer says "tab" where no panel
  follows. Every arrow key moves to the next or previous enabled tab and selects it, in either orientation, as a radio
  group's arrows do (Right and Left still mirrored in right-to-left); Home, End, Enter, Space and the one Tab stop are
  unchanged. A row becomes a tab list again as soon as it has a panel, and a row with panels is unchanged. There is no
  prop for this: the row reads it from the panels it holds. Nothing is drawn differently, so no baseline changes.
  
  What breaks: a product or a test that looks for `role="tab"`, `aria-selected` or `role="tablist"` on a row without
  panels finds `role="radio"`, `aria-checked` and `role="radiogroup"` instead. A vertical row without panels now moves
  with Right and Left as well as Down and Up, and a horizontal one with Down and Up as well as Right and Left; it has no
  `aria-orientation`.
  
  The date-time picker's entry-mode tabs stay a tab list: the picker links its time section to them as their panel, so
  both tabs control it from the row's first update.
- 552dad2: Tag group: when a member is added, removed or changes its size, the members whose place changes now move there from
  where they were drawn, along their line or from one line to another, instead of jumping. The motion is timed by two new
  component tokens, `tanrei.comp.tag-group.motion.move-duration` (`sys.motion.role.selection.travel`) and `move-easing`
  (`sys.motion.easing.spatial`). A line that keeps the same members follows the change at once, so a filter chip that
  grows with its own selection motion carries the chips after it. A new member appears and a removed one leaves at once.
  Reduced motion, a change of the group's width, direction or gaps, and the group's first frames place every member at
  once, as before. What broke: TGR-10 no longer says the group places its members at once, and a test that read a
  member's place in the frame after such a change now reads it mid-move; wait for the motion to end first.
- d6814f1: Tag group: `selection` (`none`, the default, `single` or `multiple`) makes the group hold the selection of its filter
  chips, named by each chip's new `value`: `value` is the chip that is on (single; `null` for none), `values` the chips
  that are on (multiple). The group sets each filter chip's `selected`; when a person switches a chip it sets `value` or
  `values` and fires one `change` with `detail.value` or `detail.values` — the chip's own `change` stops at the group. A
  single selection can be emptied by switching its chip off, since each chip is a toggle. With a selection the set is one
  Tab stop, and the arrow keys (the way they point, also right to left), Home and End move between its chips without
  switching anything; removing an entered item still moves focus to the next chip, which becomes the set's stop. The
  group stays a list and each chip keeps its pressed state. React's `TagGroup` takes `onChange`.
  
  Nothing changes for an existing group: `selection` defaults to `none`. Under a selection, the filter chips' own
  `change` no longer reaches listeners on the group or above it, and the group's `value` or `values` decides each filter
  chip's `selected`. New baselines: tag group `chips-filters-multiple` and `chips-filters-single`; no existing baseline changes. The
  native platforms have not implemented the tag group yet.
- 26e14d1: Two helpers for a page that changes its theme or its tokens at run time.
  
  **`@tanrei/web/theme-script`** keeps a person's choice of theme and draws it from the first frame.
  
  - `themeScript()` returns a small inline script for `<head>`. It puts the stored `light` or `dark` on `<html>` as
    `data-tanrei-theme` while the page is still being parsed, so the page no longer flashes the system's theme first.
  - `saveTheme('light' | 'dark' | 'system')` stores a choice and draws it at once. `'system'` takes the choice away,
    and the page follows the operating system again.
  - `loadTheme()` reads what is stored.
  - The storage key can be your own (`{ storageKey }`).
  - The module runs nothing when it is imported, so a server can import it.
  - Getting started shows it in Next.js and Astro.
  
  **`setTokens(tokens, { on })`** from `@tanrei/web` sets custom properties from script, on the root or on any element.
  A token given `''` is taken off.
  
  - One token set alone on the root with `style.setProperty()` makes WebKit restyle the page for seconds: 4.4–6.0 s
    for 2,000 elements, measured.
  - `setTokens()` writes it in 6–7 ms. With each write it also adds or takes off a few names of its own
    (`--tanrei-tokens-written-<n>`), so the number of the element's custom properties always changes, and WebKit does
    not compare the two sets value by value.
- f669310: **Breaking — no compatibility is kept in the tokens during 0.x.** Tokens kept only for platforms that had not caught up,
  the path for deprecated tokens, and the pass that let a layer declare what the core already has are removed. Nothing a
  web component draws changes: no component read any of the removed tokens. What breaks:
  
  - **Navigation bar:** `comp.navigation-bar.item.container.width` and `.height` are gone
    (`--tanrei-comp-navigation-bar-item-container-width` and `-height`). The item container is the destination's share
    of the bar less `container.padding`, as before. `cupertino` now gives `item.icon-indicator.height` its own value
    (`dial.size.unit × 8`, 32), the value the alias it replaces resolved to.
  - **Navigation drawer:** `comp.navigation-drawer.item.badge.typescale` and `item.badge.color` in its four conditions,
    with their per-state tokens (21 tokens), are gone. A destination's trailing string is drawn with
    `item.trailing-text.*`.
  - **Navigation rail:** the retired rail's whole token set (`comp.navigation-rail.*`, 63 tokens; 71 custom properties in
    `tokens.css`) is gone. A collapsible navigation drawer, collapsed, is the rail (`comp.navigation-drawer.collapsed.*`).
  - **`$deprecated`:** `pnpm validate` and `pnpm generate` refuse a `$deprecated` in Tanrei's token sources, and the
    build no longer has a path for deprecated tokens (the native emitters left them out). The MCP server's token answers
    and Theme Studio no longer carry a `deprecated` field. A token that goes is removed and named in the changeset.
  - **Layers:** a layer that declares under `vocabulary` a token, a step of a series, an axis value or a color role the
    core already has is refused with an error that says to delete the declaration and write its value under `tokens`; it
    was accepted with a notice. `notices` is gone from the resolved system, from `tanrei validate`'s output, from the MCP
    server's `validate_layer` and `propose_extension` answers, and from Theme Studio's accessibility panel.
  
  The paused native packages' generated tokens lose the same fields; their navigation bar, drawer and rail sources catch
  up when their pause ends.
- 11e9c59: **Breaking — Toolbar: inline by default.** A `<tanrei-toolbar>` (React `Toolbar`) that does not say its `variant` is now
  `inline`: it stands where the layout puts it, as long as its items need and never longer than its container, with no
  surface, shadow or edge of its own in the default system, its items closed up as a floating toolbar's are. It no longer
  spans the bottom edge or reads the bottom inset. Write `variant="docked"` where you want the bar across the bottom edge.
  A variant a design system adds now takes the inline structure (it took the docked one). The toolbar moves from the
  navigation category to actions: a toolbar is not a way to choose a destination.
  
  A toolbar is now a container of related controls wherever it stands, as the WAI-ARIA toolbar pattern, React Aria, Primer's
  action bar and Fluent 2 describe it:
  
  - **Items:** Buttons (icon-only or labelled, toggles among them), a Button with a `<tanrei-menu anchor>` beside it (a menu
    button: the menu is not laid out), `<tanrei-button-with-menu>` (each half its own stop of the arrow keys), and the new
    `<tanrei-toolbar-group label>` (React `ToolbarGroup`) holding them; a `<tanrei-divider>` is a separator.
  - **Separation:** two groups, or a group and an item, are set apart by a short line with space on each side, or by space
    alone, as `separation` (`auto`, the design system's `comp.toolbar.separation`, which follows
    `sys.behavior.separation`; `divider`; `gap`) says.
  - **Overflow:** `overflow="menu"` (the default) hides items from the end, one at a time, behind an overflow button whose
    menu repeats them — a toggle as a checkbox item, a menu button as a submenu, a Button with menu as its main action and
    a submenu — and a row activates the hidden item itself. Name the button with `overflow-label`, or once with
    `setWords({ toolbarOverflowLabel })` (English word pack: "More actions"). `toolbar-overflow="never"` on an item keeps
    it. What is hidden is decided before a frame is drawn. **Breaking:** a toolbar whose items do not fit no longer scrolls
    by default and no longer reports that it scrolls; `overflow="scroll"` keeps the scrolling.
  - Tokens: twelve new `comp.toolbar` tokens (the inline variant's members, `group.gap`, `divider.length`,
    `divider.thickness`, `divider.color`, `separation`); none renamed or re-valued.
  - `<tanrei-button-with-menu>` in a toolbar keeps one of its halves at `tabindex="-1"`, as the toolbar's roving Tab stop
    says; outside a toolbar both halves are Tab stops as before.
  
  SwiftUI, Compose, Flutter and React Native stay lagging: they keep the docked default, Buttons only and scrolling until
  they catch up.
  
  Baselines (web, recorded on Linux by the Record baselines workflow): nine new pictures, one per new fixture —
  `toolbar/inline-formatting`, `inline-separation-gap`, `inline-overflow`, `inline-overflow-pinned`, `inline-menu-button`,
  `inline-button-with-menu`, `inline-labelled-toggles`, `floating-vertical-groups` and `rtl-inline-overflow`. The seven
  existing toolbar pictures state their variant and did not move.
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
- b787a0c: **Breaking — `@tanrei/web` registers the default system's components and no other.** A product on the default system
  reaches only the components its system ships, so it cannot pick one the system does not have. What breaks:
  
  - `import '@tanrei/web'` no longer registers the segmented button (`<tanrei-segmented-button>`, `<tanrei-segment>`),
    which the default system leaves out, and no longer exports `TanreiSegmentedButton`, `TanreiSegment` and their types.
  - `@tanrei/web/m3-like` now registers everything the m3-like system ships, not the FAB menu alone.
  
  **New — an entry per system, and one for everything.**
  
  - `@tanrei/web/<id>` (`m3-like`, `m3-expressive-like`, `cupertino`; the default system's is `@tanrei/web` itself)
    registers what system `<id>` ships: everything `@tanrei/web` registers, and the components only that system ships
    (the segmented button on the three presets, the FAB menu on the two m3-like systems). It exports their classes and
    types. `@tanrei/react/<id>` is the same set in React.
  - `@tanrei/web/all` registers every component of the package.
  - A component's own module, `@tanrei/web/components/<name>`, registers it alone: a product on the default system that
    includes the segmented button in its layer (`"components": { "include": ["segmented-button"] }`) imports
    `@tanrei/web/components/segmented-button`, and draws it with its own tokens.
  
  The components manifests name these entries: a system's components are registered by its entry (`@tanrei/web` for the
  default system's), and in a product's manifest (`tanrei build`) a component no system it is built on ships — one it
  brings back or includes from another layer — is registered by its own module.
  
  **A lighter `custom-elements.json`, and one per system.** The elements' manifest lists the package's public surface:
  the private and protected members of the classes and the text of the components' styles are no longer in it (4.6 MB →
  2.2 MB). `@tanrei/web/custom-elements/<id>.json` is the manifest of the elements system `<id>` ships: the default
  system's has neither the FAB menu nor the segmented button.

### Patch Changes

- 73d9b8e: Accordion: content that starts or ends with a margin, such as paragraphs, no longer jumps when an item opens or
  closes. The first paragraph's top margin used to reach out above the content's box. In every browser the item grew
  by that margin at once in the first frame of an opening, and shrank by it at once after the last frame of a closing.
  In Firefox and Safari the opening also went that margin past the open height and fell back at the end, and the
  closing started that margin above it. The content's box now holds its
  content's margins, so the motion starts and ends at the heights the item rests at. An item at rest is drawn as
  before. Where a design system sets the space under the content to 0, the last paragraph's margin now stays inside
  the item instead of reaching past its lower edge.
- a03d145: Accordion: an item opened again in the first half of its closing, or closed again in the first half of its opening,
  goes on from where it is in every browser. Where the browser cannot move a height to `auto` in CSS (Firefox and
  Safari at the time of writing), the item used to jump to its end in one frame. A change before the middle of the
  motion makes the browser cancel the item's own motion clock, and the element took that cancel for the end of the
  motion. It now follows the item's height until the motion ends.
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
- f6a47af: Popover, Select and Combobox: where `sys.motion.appear.blur` is 0 — every shipped system — the surface that appears
  has no filter, closed or open, and no transition of `filter` runs as it opens and closes (it went from `blur(0px)` to
  `none`, which draws nothing). In WebKit on Linux a running transition of `filter` crashes or stalls the page. A blur a
  layer sets is drawn and moves as before.
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
- 16bbd73: Embedded text input and chat composer: the first line now stays at the top edge of the typing area while its height
  moves after a typed line break. Until now, at the first frame of the motion the text jumped up by about a line (23 px
  in Chromium, 22 px in WebKit) and came back down as the box grew: the box that clips the text during the motion could
  be scrolled, and the browser scrolled it to show the caret on the new line. In a composer docked at the bottom of a
  column, the first line left the capsule for those frames. The box now clips without being a scroll container
  (`overflow: clip`; Safari before 16 keeps `hidden`). Nothing else changes: no baseline moves, and Firefox, which did
  not scroll the box, shows the same frames as before.
- 01640f4: **Chip.** Clicking an input chip and then pressing Enter no longer removes it in Safari on macOS. There a pressed
  button takes no focus, and the press was handed to the first part of the chip that a click focuses: the remove action,
  which is out of the Tab order by a tabindex. The next Enter or Space then pressed the remove action. Now a press
  anywhere on an input chip but its remove action gives focus where the same press on an action chip does: the chip's
  button where the browser focuses a pressed button, and nothing in the chip in Safari on macOS. The remove action still
  takes focus from its own press and from assistive technology, and the Tab order is unchanged. Action and filter chips,
  whose remove action is not drawn, were not affected. No baseline changes.
- c96a911: Menu and docked date-time picker: an open surface whose anchor is no longer drawn asks to be closed. This covers an
  anchor taken out of the page, given `display: none` (on itself or an ancestor) or `visibility: hidden`, or skipped by
  `content-visibility`. Each sends `close` once, with the new reason `anchor-hidden` (the reason the popover, the select
  and the combobox already use). The surface is not placed against the missing anchor in the meantime. If focus was in
  the menu and the anchor cannot take it back, focus no longer stays in the closed menu. A menu whose anchor is drawn
  again before you close it follows it again. Before, the menu stayed open and was placed against the window's corner
  or the anchor's last box.
  
  The button with menu passes `anchor-hidden` on as its own `close` reason. `TanreiMenuCloseReason` and
  `TanreiDateTimePickerCloseReason` gain the value. `TanreiFabMenuCloseReason` leaves it out, because the FAB menu never
  sends it.
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
- 2e4a5ab: Description list: an inline list chooses between its terms beside and above their values again whenever its width
  changes. A list that was measured while it was drawn stacked — connected while it had no width or too little, in a
  panel or a tab not shown yet, or a list a page lays out late — read its longest value as its widest term, wrote a
  width it was always narrower than, and stayed stacked whatever room it was given later. It now measures its terms in
  the two columns whatever it draws at that moment, so it decides from its width as a list that had its width from the
  start does. No baseline changes: every fixture is laid out at its width from the start.
- 108305a: Dialog: the first render already draws the parts its children fill (the icon, the content, the actions). The children
  were read after that render, so a dialog with children rendered twice when it was connected, and Lit's development
  build warned `change-in-update` (an update scheduled from inside an update). Nothing a product sees or uses changes.
- 3bbfeaf: Dialog: the part that scrolls the supporting text and the content is now a CSS part, `scroll`. It reaches the
  container's inline edges through whatever inline padding the container has, instead of through `container.padding`:
  a product that changed `::part(container)`'s `padding-inline` used to get a scrolling part, dividers and a focus box
  that overflowed the container or fell short of its edges, and now they follow the padding, at each side and while
  the dialog is open. A row the product keeps sticky at the foot of its content is cleared with
  `::part(scroll) { scroll-padding-block-end }`. A dialog whose padding was not changed is drawn as before.
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
- db60c6c: Popover, Select and Combobox: a surface that appears starts its entrance in the first frame drawn after it opens. In
  Safari and other WebKit browsers an entrance begun at the end of a long task — a list whose rows were rendered by the
  key that opened it, on a slow machine — was dated from the frame drawn before that task: part of it was over before
  its first frame, and all of it, the surface drawn whole at once, where the task outlasted the entrance.
- e9038b1: Every element draws its first frames at rest. From each time it is connected until two frames after its first update,
  an element carries `data-tanrei-settling` on its host, and nothing in it starts a transition: a state it writes after
  its first render is drawn as it is instead of fading or sliding in from a state it never showed — the check of a chosen
  option or a checked menu item once its glyph can be drawn, an open submenu's row, a label that floats over a field's
  entries. A product that reads the layout of a view it has just inserted no longer starts those motions either. The
  surface an overlay opens is left alone, so an overlay that plays its entrance today still plays it when it is inserted
  open or opened right after it is inserted (a dialog, a modal picker, an image preview, a search view).
  
  The light-DOM stylesheets (`@tanrei/web/tree-view.css`, `table.css`, `accordion.css`, `table-of-contents.css`,
  `breadcrumbs.css`, `link-card.css`, `skeleton.css`, `app-shell.css`, `page-header.css`, `description-list.css`,
  `figure.css`, and a system's own copies of them) carry the same rule at their end: a page that serves its own copy of
  one should take the new one.
- 8d5a636: Figure: the figures of a page measure their stages together, once a frame. Each figure read whether its stage scrolls
  sideways (FIG-6) in its own update, right after the element before it had drawn, and so had the page laid out again for
  itself: fifty figures with a button on their stages, appended at once, cost 52 style passes, now 2; on the
  documentation's Field page (368 fixtures) at 390 wide, 1.3 of the 5.9 seconds a scroll through it took. One observer of
  sizes now watches every figure's stage, and every figure that changed is read first and written after. A stage that
  starts or stops scrolling becomes, or stops being, a focus stop and a group in the next frame.
- 66ad9dd: File upload and chat composer: the File items a product gives them (`rows="given"`, `attachments="given"`) are read
  once per turn. Each File item tells its holder when it first draws and whenever something the holder reads of it
  changes, and the holder re-read every item each time — so building N items, or changing N of them at once, did O(N²)
  work. The holder now re-reads its items once, in a microtask before the next frame, however many of them changed in
  it; a file upload's `validity`, `validationMessage`, `checkValidity()` and `reportValidity()` read them first. In
  Chromium, with 1,000 items:
  
  - a chat composer builds in about 1.2 s (4 s before), and setting every item uploading takes 0.26 s (1.4 s);
  - a file upload renames every row in about 0.15 s (0.8 s), and builds in about 1.2 s (2.5 s) — the List it draws the
    rows in still re-reads its items once for each row as it builds.
  
  Every frame draws the items as before, and what is announced and submitted is unchanged.
  
  Stepper: what it reports of steps that share a value is found in one pass over the steps. Its re-read of the steps
  already ran once per turn.
  
  Debug builds count each re-read on `globalThis.__tanreiCounts` (`file-upload.sync`, `chat-composer.sync`,
  `stepper.sync`), for the performance tests. No baseline changes.
- 74c9435: File upload: a disabled file upload that appears on a page that is already drawn shows its trigger disabled from its
  first frame. The trigger no longer fades from its enabled colors to the disabled ones over the state motion. The file
  upload assigns its trigger to the file picker after its own render, and the file picker told the trigger it was
  disabled only after the file picker's first render, which came after the trigger's. Now the file upload has the file
  picker tell the trigger as soon as it is passed on, before the trigger is first drawn.
- 8c13679: `focus()` called on a control before its first update is no longer lost. A script that focuses a control as soon as it
  creates it — React's `ref.current.focus()` right after mounting, a page that inserts a field and focuses it at once —
  found nothing drawn to focus: the shadow root that delegates focus was still empty, and the part a control's own
  `focus()` goes to (a text input's native input, a select's container, a composed field's control) was not there yet.
  Every element now keeps such a call, with its options, and gives it once it has drawn, unless focus moved elsewhere
  meanwhile, `blur()` was called, or the element left the page. A host that is focusable itself is focused at once, as
  before.
- 61cebf8: Components that draw glyphs of the icon set (checkbox, switch, menu, snackbar, copy button and the others that wait
  for the icon font before drawing a glyph) cost a page less work. The page's fonts are listened to once, not twice for
  each instance: a page of 1,000 checkboxes had 2,000 listeners and now has 2. A change of state that keeps a glyph's
  name and family (checking a checkbox, turning a switch on) no longer reads the layout: toggling 1,000 checkboxes read
  it 4,000 times and now reads it 0 times. A text face that finishes loading no longer has every glyph measured again;
  only a face of a family a glyph is drawn in does. What is drawn, and when, is unchanged: a glyph still appears in the
  first frame its font can draw it, and nothing is drawn in its place while it cannot.
- f4248ab: Text field (multi-line, auto-resized), embedded text input and chat composer: a letter typed while the height still
  moves after a line break no longer cuts the motion off. Until now the height jumped to its end in one frame whenever a
  change arrived during the motion — which, at a normal typing speed, is almost every line break followed by a letter.
  The change replaced the running motion with one from the height then shown, as it should, but the replaced motion's
  cancellation is reported a frame later, and that report was taken for the end of the new motion. A report of a motion
  that was replaced now ends nothing; the height goes on along its curve to the end height. Nothing else changes: no
  baseline moves.
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
- 16c656e: A menu and a list cost the same for each item at 1,000 items as at 100. Each item tells its menu or list when a prop the
  container reads changes, and the container re-read every item each time — so building N items, or changing N labels at
  once, did O(N²) work: about 7.6 s to build a menu of 1,000 items and 1.5 s for a list, in Chromium. The container now
  re-reads its items once per turn, in a microtask before the next frame, however many of them changed in it (and at
  once, before it handles a key, a press or focus). A menu of 1,000 items builds in about 0.2 s, a list in about 0.13 s;
  every frame draws the items as before.
  
  Debug builds count each re-read on `globalThis.__tanreiCounts` (`menu.sync`, `list.sync`), for the performance tests; a
  production build counts nothing. No baseline changes.
- 7495506: Menu: a menu whose items are all inside groups now puts focus on its first enabled item when it opens, as MNU-1 says.
  Before, a menu that was mounted already open (a product that draws its menu only while it is open), or opened in the
  same task that gave it new groups, left focus on the anchor in Chromium and Firefox, and the arrow keys did nothing:
  the menu placed focus before its groups had drawn their slots, and a browser does not focus an item that is not drawn.
  Now the menu waits for itself, its groups and its rows to draw, then places focus. The wait is only microtasks, so no
  input comes between; a menu whose items are already drawn places focus at once, as before. This also covers a menubar's
  menu opened with Up Arrow, which still takes focus on its last enabled item (MBR-9).
- 3188580: Menu: a menu that the page's markup writes open, with its submenus written open, is open in its first frame. Before
  the document's first paint, neither its surface nor the surface of any submenu open in it fades in or grows any more:
  there was nothing for them to grow from. A menu mounted open after the first paint, or opened later, opens with its
  motion as before (MNU-4, MOT-4).
- 4d18319: **A menu opens at the top of its list (MNU-68).** In a short window, a menu whose items were taller than the room
  opened with its list scrolled to its end in Chromium and WebKit, so its first items were hidden. Focus on the first
  item was scrolled into view through the opening motion, and on the motion's first frame the surface is scaled to
  nothing. Now the menu moves focus without the browser's scroll and scrolls the list itself, just far enough to show the
  focused item. It judges this from the surface at rest: a key pressed during the opening motion moves focus at once, and
  the list moves when the motion ends. A list taller than its surface opens at its top, a submenu's too, and so does a
  menu opened again before its closing motion has ended. The first item scrolls the list back to its start, the last to
  its end, and the first item of a titled group brings the title into view. Focus that follows the pointer scrolls
  nothing.
  
  **Japanese and Chinese text breaks by the strict rules.** Text a product gives a component (`productText()`: labels,
  values, descriptions in every shadow-DOM component) takes `line-break: strict`, whatever language the page marks. A
  line no longer begins with ー, a small kana, an iteration mark or closing punctuation. The browsers' default allowed
  that in Chromium, and in WebKit where the text is marked Japanese. In a menu, the label, supporting text, trailing text
  and group titles also take `word-break: auto-phrase` (MNU-69). Chromium then breaks text marked `lang="ja"` between
  phrases, as in `Claude Code のコマンドを` / `コピー`. The menu spec gains a `japanese` fixture.
- a0f001b: **Visual change, intended — the rows of a menu, a select, a combobox and a search view are concentric with their
  sheet.** A row stands inside its sheet at the sheet's inline padding (4) and was rounded by `corner.small` (6) inside
  a sheet rounded by `corner.medium` (8), so a filled row bulged past the sheet's curve at the first and last rows. In
  the default system each row's corner is now the sheet's corner less that padding (4), derived with `sub`, and follows
  the sheet's corner and padding: `comp.menu.container.shape`, `comp.select.option.shape`, `comp.combobox.option.shape`
  and `comp.search.suggestion.container.shape`. On the web they are
  `max(0px, calc(var(<sheet corner>) - var(<sheet padding>)))`, so a product that sets the sheet's corner or padding moves
  the rows with it. The snapshot baselines that show a filled menu row (five menu fixtures: an open submenu's item, a
  current link item) are recorded again for this. The presets keep the corners they drew.
- 71dad17: Menu: a `max-block-size` you give the surface (`tanrei-menu::part(surface)`, or `tanrei-submenu::part(surface)` for a
  submenu's) now works together with the room the menu has. Before, your rule won over the limit the menu wrote, so the
  menu was misplaced:
  
  - a menu above its anchor was placed by its uncapped height, and stood away from the anchor;
  - a cap larger than the room let the surface run past the window's edge.
  
  The menu now reads your cap as a computed value (a percentage counts against the window). It places the surface by the
  least of the height its items need, your cap and the room left, and scrolls its items beyond it. The limit it writes
  on the surface is important, so the room always holds.
- 073a8bd: Menu, its submenus, a docked date-time picker and the search view are placed inside the visible part of the window, as
  the popover, the select and the combobox already were: above the on-screen keyboard, and only where a visual viewport
  that is scrolled or zoomed shows the page. On iOS the keyboard shrinks the visual viewport and not the layout one, so a
  menu opened near a focused field used to open under the keyboard. The popover, the select and the combobox now also
  keep below the top of a visual viewport scrolled down (iOS moves it to keep a field in view), not only above its bottom.
  
  **Breaking** (the module exports of 0.1.0-next.0): `placeMenu`, `placeAtPoint`, `placeSubmenu` and `MenuBox` are no
  longer exported by the menu's module. They live with the other placement geometry, which is internal to the package.
- c13331a: A modal surface opened at the end of a long task now plays its entrance and its scrim's fade from the first frame drawn
  after that task, in every engine. WebKit dated both from the frame drawn before the task, so where opening took longer
  than the entrance (a modal date-time picker rendering its calendar on a busy machine) the scrim — and the modal layer's,
  the side and bottom sheets' and the image preview's own fade or slide — was drawn whole at once. `openModal()` holds the
  dialog's entrance and its `::backdrop` transitions at their start and plays them from the next frame, as
  `AppearController` already did for an appearance; this covers the dialog, the modal layer, the modal side and bottom
  sheets, the image preview, the popover's sheet and the modal date-time picker.
- 58937c0: Dialog, Modal Layer, modal Side Sheet and Bottom Sheet, Image Preview, the modal Date-Time Picker and the Popover's sheet: closed, the surface and
  its scrim play their exit in every browser. In WebKit and Firefox a closed `<dialog>` was taken out of the top layer at
  `close()`, so the surface and the scrim vanished at once with no motion (only Chromium kept them drawn while the exit
  played). Now each one closes at once — focus goes back to the opener and the page behind is no longer inert in the same
  task, as MDL-5 says — and stays drawn in the top layer, inert and taking no pointer, until its exit and its scrim's have
  finished; opened again on the way out, it goes back from where it was, modal again.
  
  - One mechanism for every modal surface: `openModal()` and `closeModal()` (with `modalExitStyles()` for the scrim) in
    the web package's primitives. While it leaves, the `<dialog>` carries `data-tanrei-leaving`, is a manual popover and
    is `inert`; a style that targets a closed dialog sees it closed (no `[open]`, not `:modal`) from the first frame.
  - The modal surfaces no longer transition `display` and `overlay` (`transition-behavior: allow-discrete`): their
    `transition-property` lists only what moves (`opacity`, `scale`, `translate`). The one appearance the dialog, the
    image preview's image and the modal picker are drawn with still lists them, for the anchored surfaces that rely on
    them; a leaving dialog holds its display, so they change nothing there.
  - The page's scroll, held while a modal surface is open (MDL-2), no longer moves the page sideways where the scroll bar
    takes room: the root keeps that room (`scrollbar-gutter: stable`, or as much padding where the engine keeps no gutter
    for the bar). Nothing changes where the bar is drawn over the page.
- c9d76e2: Button with menu: a narrow trailing half now takes the padding at its rounded outer end
  (`comp.button-with-menu.container.outer-inset`), as the default width and the leading half already did. A slim half's
  chevron sits nearer the curve, so without it the chevron looked pushed toward the end. In the default system the narrow
  half is 4 wider (32 / 36 / 36 at small, medium and large) and its chevron stays 16 from the seam; a system that sets
  the outer padding to 0 (cupertino and the m3 presets) draws it as before, exactly a narrow icon-only Button's width. The
  web baselines of the eight narrow fixtures are re-recorded for this change.
- 45ca156: Navigation drawer: a modal, collapsible drawer that appears with `open` set is drawn open from its first frame, at its
  full width and over its whole scrim. It no longer widens from a 72 px column it never showed while its scrim fades in.
  Opening it later still widens it from its column, as before.
- 19e74c3: Navigation drawer: a collapsible modal drawer (the column presentation of a responsive drawer, 600 to 1023 px wide)
  no longer changes its look at once when it opens or closes. It used to open in the modal drawer's look from the first
  frame, and to close in that look until the end, when the column took its place in one frame: the container color, the
  rounded end corners, the shadow and the end edge all changed at once. Now its color, elevation, end corners and end
  edge move between the column's and the modal drawer's over the same motion as its width. The drawer leaves the top
  layer only after that motion has ended, so the last frame of the close looks exactly like the column. The items keep
  their scroll position between the column and the open drawer.
  
  A modal drawer now slides out (or narrows) while it is still in the top layer, and closes once its own transitions have
  finished. Before, it waited on a timer, or on the `overlay` transition, which Firefox and Safari do not run. In those
  browsers the drawer and its scrim used to disappear at once, and the column was empty until the timer ran out. Focus
  now returns to where it was when that motion ends, not when the close begins.
- 66f1b1c: The packages say on npm where their documentation is (`homepage`, the package's page on the docs site), where to
  report a bug (`bugs`, the repository's issues) and what they are (`keywords`). `@tanrei/mcp` carries `mcpName`, its
  name in the MCP registry. `pnpm generate` writes them from `tanrei.config.json` (its new `site`) and
  `docs/registries/npm-keywords.json`.
- 8e7e057: Select and combobox: a pointer at rest no longer takes the active option from the keys. Safari sends a pointer move to
  whatever comes under a mouse that has not moved once the page or the list scrolls under it, so a Down Arrow or a Page
  Down that scrolled the list, or a field brought into view while the mouse rested over the place its list opened, made
  the option under the mouse the active one a moment later, and the next key went on from there. A pointer move at the
  place the same pointer last was is now no move; a pointer that moves onto an option still makes it the active one, as
  before, in every browser.
- 17a9754: Page header: only a meta item that begins with a glyph or an Avatar (`.tanrei-icon`, `tanrei-avatar`, an `svg` or an
  `img`) is laid out as a row with `meta.icon.gap` between the picture and its text. An item whose text holds another
  element, such as `<span>Published <time>…</time></span>`, stays a run of text and keeps its space; it was given the
  icon gap in place of the space.
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
- 14c4ed6: React: a handler for one of the platform's own events no longer replaces the component's own. A wrapper sets a prop
  on the element as a property whenever the element has a member of that name, private ones included, and 36 elements
  had internal handlers named like React's event props (`onClick`, `onInput`, `onKeyDown`, `onBlur`, `onFocus`, …). So
  `<Button toggle onClick={…}>` ran the product's handler and stopped toggling and firing `change`; a `TextInput` given
  `onInput` stopped taking its value, given `onKeyDown` stopped acting on Enter, and given `onBlur` stopped committing;
  checkboxes, switches, radio buttons, selects, comboboxes, number, color and
  one-time-code inputs, chips, cards and others broke the same way for the props that matched. Those handlers are now
  private to the element, and every such prop is React's own handler, as the README says, while the component keeps
  working. Nothing public changed.
- db7055c: The READMEs on npm no longer say that the packages are not on npm. Each is written as it reads from 0.1.0 on
  (`npm install @tanrei/web`), and what it says exists — the version, what to install while it is a prerelease, each
  platform's components by status — is written by `pnpm generate` from the repository, so it never claims more than is
  there. During the 0.x prereleases backward compatibility is not kept: any prerelease may break anything, and its
  changeset says what broke.
  
  `@tanrei/web`'s README is a short guide for its users (it was 953 KB, and npm showed only its first 65,536
  characters); the implementation notes it held stay in the repository as `packages/web/IMPLEMENTATION.md`, which the
  package does not ship.
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
- 5368526: **Visual change, intended — a selected row is told from a hovered one in the tree view, the navigation drawer and
  the table.** In the default system a selected tree row, drawer destination and table row took the neutral
  `secondary-container` tone, which in light is the grey of a hovered row (1.00:1 to 1.03:1 between them). They now
  take the list's selection: a layer of the row's own content color at the selected layer (16 %, twice the hover layer),
  1.15:1 to 1.30:1 from a hovered row in every scheme and on every surface role. `comp.tree-view.selected.container.color`,
  `comp.navigation-drawer.selected.item.container.color` and `comp.table.row.selected.container.color` change value; the
  text of a selected row keeps its color. The snapshot baselines of the tree view, navigation drawer and table fixtures
  that show a selected row are recorded again for this. The presets `m3-like`, `m3-expressive-like` and `cupertino` draw
  as before.
  
  `pnpm validate` holds it: in the default system a selected row and a hovered one (list, tree view, navigation drawer,
  table) stand at least 1.1:1 apart in every scheme, each laid over each surface role, and a selected row's text is read
  on its fill at 4.5:1 (7:1 in the high-contrast schemes).
- b1ddfd8: Modal layer, Dialog, Bottom sheet, Side sheet, Navigation drawer, Date-time picker and Search: where the scrim blur
  (`comp.modal-layer.scrim.blur` and the tokens that alias it) is 0 — every shipped system — the scrim has no backdrop
  filter, instead of `blur(0px)`, which drew nothing. In WebKit on Linux a backdrop that holds a filter makes the page redraw
  everything under it whenever anything changes: on a page of 27 open modal date-time pickers a 1-pixel change took about
  2 s to draw, and 16–23 ms without the filter. A blur a layer sets is drawn as before.
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
- b9c5fbe: **A system's scope inherits the colour scheme around it.** A preset's stylesheet (`@tanrei/web/systems/<id>.css`), and a
  product's built with `tanrei build`, no longer declares `color-scheme: light dark` on `[data-tanrei-system="<id>"]`.
  That declaration took the scope back to the operating system's scheme: a preset placed under `<html
  data-tanrei-theme="dark">` drew light on a light system. Now only the root declares both themes, and a scope draws in
  the theme forced around it, or follows the system where nothing is forced, as every other subtree does; a scope still
  forces its own with `data-tanrei-theme` on itself. What broke: a page that relied on a scope following the operating
  system under a forced ancestor must take `data-tanrei-theme` off that ancestor, or remove it from around the scope.
  
  The documentation's gallery of fixtures follows the header's theme as it changes (until a stage's own switch is
  turned), and a gallery window is given the page's contrast, at its first paint and on every change.
- d43dd75: Tabs: a row of tabs now appears already drawn as it is. Before, for the first 150 ms after a row appeared, its
  selected tab faded in: the icon filled in, a tonal label grew bold, a disabled selected tab's indicator faded to the
  disabled color, and under some systems (m3-like) the label and icon colors faded too. Selecting a tab, hovering,
  focusing and pressing animate as before, and the look at rest is unchanged.
- 2442137: A row of tabs costs the same for each tab at 1,000 tabs as at 100, and a key press reads the row's layout once. Each tab
  and panel tells its row when a prop the row reads changes, and the row re-read every tab and panel each time — so
  building a row of N tabs with their panels re-read it 2N times: about two minutes for 1,000 tabs in Chromium. The row
  now re-reads its tabs once per turn, in a microtask before the next frame (and at once before it handles a key, a
  press, a click or focus), and looks each value's tab and panel up once. A row of 1,000 tabs with panels builds in about
  0.3 s; every frame draws the tabs as before.
  
  A key press that selects another tab read every tab's boxes and computed style several times over — 318 box reads and
  87 style reads for a row of 20 — as the indicator's slide, the scroll that brings the tab into view and the re-sizing
  of every tab each read them again. It now reads them once (44 and 5): a new selection re-sizes no tab (the selected
  label keeps the width it has at either weight), the slide and the scroll share one reading of the row, the layout
  direction is read from the document instead of the cascade, and the label of a tab in a row that hugs is not measured
  again for a selection.
  
  Debug builds count each re-read on `globalThis.__tanreiCounts` (`tabs.sync`), for the performance tests; a production
  build counts nothing. No baseline changes.
- 37db622: Text input, Field and Chip field: a filled or outlined input that appears holding entries (chips in its `entries`
  slot) floats its label from its first frame. The label is no longer drawn over the chips for the first frames and then
  moved up about 40 px over the label motion. The input now reads its entries when it first updates, instead of waiting
  for the slot's `slotchange`. A change of entries later still floats or rests the label with its motion, as before.
- 2d1369b: Text input: importing the text input's own module (`@tanrei/web/components/text-input`) defines the Button its date
  and time picker button is drawn with. A product that imported that module, or `text-field` or `chip-field`, without
  the package's entry got a `<tanrei-button>` that never upgraded: no picker button was drawn, and the field's first
  update threw a `TypeError`. The package's entry defines every element, so a page that loads it was not affected.
  
  Every component's module now defines each Tanrei element it draws through its own imports, and the package's tests
  check that for every module a product can import.
- afb4e69: The description list and the breadcrumbs no longer keep a measurement taken in a fallback face. A text laid out while
  its face was loading was measured in the fallback face and measured again only when the set of fonts fired
  `loadingdone` — which WebKit on Linux does not fire for a face already loading when the listener was added. The widest
  term of an inline description list (where it stacks) and the width of a breadcrumb trail (which levels collapse) then
  stayed the fallback's: in a test that withholds that event, 322.93 px where the face draws 276.27, and 278.77 px where
  it draws 212.85. A measurement taken while `document.fonts.status` is `loading` is now taken again when
  `document.fonts.ready` resolves, by one primitive the marquee text (which had this fix of its own), the accordion, the
  table, the tree view and every component's own glyphs now share — with one subscription to the page's fonts for all
  of them.
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
- f421db8: A toolbar whose overflow is a menu now shows its hidden items again when it is given more room, whatever its parent.
  In a parent as long as its content (an inline-block, a flex item, a float, an absolutely placed box, a box in a shadow
  root) the parent shrank to the items still shown and stayed that length when a box further up was widened. The toolbar
  watched only its parent, so it never noticed: in a 240 px box widened to 600, four of ten items stayed shown in a
  toolbar 232 px long. It now watches every box that holds it, up to the root, and only for its length along the
  toolbar's axis. The same box shows all ten items in the frame after it is widened, and five when it is narrowed to
  320 px.
- 669cd45: Tree view: a tree that appears on a page that is already drawn (a single-page product showing a view) is in its
  selection from its first frame. Its selected rows no longer fade in from the unselected colors over the state motion
  for their first 100 ms or so: the rows' `aria-selected` and `aria-expanded` are written when the tree is connected,
  before anything styles them — the tree's own stylesheet check, or a product that reads the layout of what it has just
  inserted — and again before its first update for a value set in between. A change of selection afterwards moves as
  before.
- 1e0fe14: The browser floor is written in numbers: Chrome and Edge 125, Firefox 126, Safari 17.5 (macOS and iOS), set by
  `light-dark()`, CSS `round()` and custom states (`:state()`), with the JavaScript at ES2022. The web getting-started
  page (in all six languages) and the package README list each feature with its versions, and show how a product's entry
  point tests the features and loads the app with `import()` only when they are there, so that it can tell an older
  browser's visitor instead. The package's build now parses every file of `dist/` as ES2022 and fails on anything later.
  A box-shadow's lengths are read without a regular-expression lookbehind, with the same result. Nothing breaks.
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
