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
- 6e7a404: **Breaking — App bar: as many actions as fit, and an overflow the product chooses.** `<tanrei-app-bar>` (React `AppBar`)
  no longer caps its actions at three, and no longer reports a fourth in debug builds: it draws every action that fits in
  its top row. The actions that do not fit leave from the end, one at a time, and come back as soon as the room allows.
  The new `overflow` attribute says where they go: `menu` (the default) moves them into a Tanrei Menu opened from a more
  button (`more_horiz`) at the end, each as a menu item with its label and glyph (a toggle as a checkbox item, a link as a
  link item); `hide` leaves them out of the bar, for actions the product also gives somewhere else at that width. Name the
  more button with `overflow-label`, or once for the product with the word `toolbarOverflowLabel`. An action marked
  `app-bar-overflow="never"` never leaves: the ones before it leave instead. The navigation item, the brand, the control
  in context and the title's whole width keep their room first; the title is cut only once nothing more can leave.
  
  What broke: a bar whose title is too long for the row beside its actions used to keep every action and cut the title; it
  now moves actions out first. Mark the actions that must stay `app-bar-overflow="never"` to keep the old layout. A
  product's own "More options" button that held the rest of the actions can go: the bar makes one.
  
  The new fixtures `small-overflow-menu`, `small-overflow-hide` and `small-overflow-rtl` need baselines; no existing
  baseline changes. SwiftUI, Compose, Flutter and React Native do not build the overflow yet: they draw every action.
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
- b96f9a9: **Breaking — App shell: the header stays on top, and one menu button shows and hides the navigation at every width.**
  `<tanrei-app-shell>` (React `AppShell`) and a `<tanrei-navigation-drawer>` it holds:
  
  - **The menu button is shown in every window class** while the navigation region holds a navigation drawer. In an
    expanded window it collapses a collapsible drawer to its column and widens it back, and hides and shows one that is
    not collapsible; in a medium window it widens the column over the content; in a compact one it opens the drawer, and
    a second press closes it. Its glyph does not change; `aria-expanded` says whether the navigation is shown. Before, it
    was shown only where the navigation had no place in the layout. The new `menuButtonPlacement` prop
    (`menu-button-placement`: `header`, the default, or `drawer`) keeps the former arrangement with `drawer`: the drawer's
    own first header button collapses and expands it where it has a place, and the header's button is shown only where
    it has none.
  - **The open navigation is drawn below the header, and the header stays usable.** The drawer and its scrim cover only
    what lies below the header; the header is neither dimmed nor inert, and pressing it does not close the drawer. The
    frame makes the skip link, the main region, the aside, the footer and the navigation bar inert while it is open, and
    holds the page's scroll. Focus goes into the drawer as before but is no longer kept inside it: Tab moves through the
    announcement, the header and the drawer. Escape closes it while focus is in the drawer or on the menu button.
  - **A drawer the frame holds is not a dialog when open.** Held by an app shell whose header slot is filled, the drawer
    is never a top-layer `<dialog>`: it stays the navigation landmark named by its `label`, and the menu button's
    `aria-expanded` and `aria-controls` tell that it is open. A drawer outside such a frame is a modal dialog as before.
  - **A change of the window's class no longer closes the navigation.** Between compact and medium it stays open, its
    scrim and focus where they are; only the window becoming expanded ends the overlay (`close` and one
    `navigationopenchange` with false), and narrowing again opens nothing. Held by the frame, the drawer moves to its new
    place and form over `motion.expand` as one panel instead of being redrawn at once; the rest of the frame changes at
    once. Outside an app shell a responsive drawer keeps `open` the same way, still redrawn at once.
  - **`expanded` of a responsive drawer that is not collapsible now shows (true) or hides (false) its standard
    presentation**: hidden, it takes no width and has nothing to focus. Before, it was ignored.
  - **Nothing happens at the end of closing**: from the first frame of a closing nothing is inert, the scrim takes no
    press and focus is back; the last frame is the closed drawer's first, and no element is taken away or replaced.
  - A collapsible modal drawer added open after the document's first paint now widens from its column (MOT-4); written
    open in the page's markup it is still drawn open at once.
  
  Not yet: the header, the navigation and the aside are still `position: sticky`, not `fixed` (so a pulled page can still
  move them past an end in an engine that moves a sticky box), and the platform's back action does not close a drawer the
  frame holds. Visual baselines of the fixtures are unchanged in intent; the frames the tests build from real components
  now draw the open drawer below the header.
- a52d722: **App shell: a frame without a header keeps its menu button at the top of the window.** `<tanrei-app-shell>` (React
  `AppShell`) has a new `menu-button` slot for a frame whose header region is empty:
  `<tanrei-button slot="menu-button" variant="text" label="Menu">…</tanrei-button>`.
  
  - The button is shown only where the navigation has no place in the layout (as `menu-button-placement="drawer"` shows
    the header's, whatever that attribute says); in the column and beside the content the drawer runs from the top of
    the frame and its own first header button stands for it.
  - Shown, it stands alone at the top start corner — the window class's gutter (`comp.app-shell.gutter.*`) from the top,
    inside the top inset, and from the start edge — with no band, fill or edge around it, and the main region begins
    below it. It stays at that place while the page scrolls under it (`position: sticky`), drawn over every region as a
    sticky header is, and its gutter and height are the frame's scroll offset, so a link's target and a focused element
    rest below it.
  - It adds no landmark and is reached in the header's place in the order of focus. The drawer it opens is the modal
    dialog it is outside a frame: over the whole window from its top edge, the button under its scrim, focus kept inside
    until it closes and then returned to the button.
  - With a header, what the `menu-button` slot holds is not shown, and a debug build reports it.
  - `comp.app-shell.gutter.*`'s description now names this inset; its values do not change.
  
  The web does not yet hold the button still when the page is pulled past an end (overscroll), as it does not the header,
  the navigation or the aside: they are all `position: sticky`.
  
  The app shell's module grows by about 230 bytes gzip (17.2 kB); its bundle budget is raised from 17,100 to 18,100 bytes
  for this placement, which is the only way a frame without a header can open its navigation in a narrow window.
  
  New fixtures: `compact-no-header` and `expanded-no-header`.
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
- adf8c4c: **Breaking — a boolean property is spelt as its attribute.** A web element's boolean property that was on by default
  and turned off by an attribute of another name is now that attribute's property, false by default, as an HTML boolean
  attribute is. The React wrappers' props are the elements' properties, so a React prop is now written as the attribute
  is (`<Card flush>`, as `<tanrei-card flush>`). The attributes are unchanged; only the properties and the React props are
  renamed, and the old names are gone (no alias):
  
  | Element | Was (property, React prop) | Now (property, React prop, attribute) |
  |---|---|---|
  | `tanrei-card`, `tanrei-figure` | `inset={false}` | `flush` |
  | `tanrei-bottom-sheet` | `handle={false}`, `inset={false}` | `noHandle` (`no-handle`), `flush` |
  | `tanrei-popover` | `inset={false}` | `noInset` (`no-inset`) |
  | `tanrei-carousel` | `fluidWidth={false}`, `snap={false}`, `playbackControl={false}` | `fixedWidth` (`fixed-width`), `freeScroll` (`free-scroll`), `noPlaybackControl` (`no-playback-control`) |
  | `tanrei-chip` | `removable={false}` | `notRemovable` (`not-removable`) |
  | `tanrei-combobox`, `tanrei-combobox-field`, `tanrei-search` | `wrap={false}` | `noWrap` (`no-wrap`) |
  | `tanrei-main-action-button` | `extended={false}` | `collapsed` |
  | `tanrei-modal-layer` | `scrim={false}` | `noScrim` (`no-scrim`) |
  | `tanrei-side-sheet` | `closable={false}` | `notClosable` (`not-closable`) |
  | `tanrei-tooltip` | `describes={false}` | `noDescribe` (`no-describe`) |
  
  To migrate, write the new name for the old one set to false (`extended={atTop}` becomes `collapsed={!atTop}`), and
  drop the old one where it was true. Script that set the property (`fab.extended = false`) sets the new one
  (`fab.collapsed = true`). The specs keep their platform-neutral names (`inset`, `handle`, …); each spec's web mapping
  names the property.
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
- d4af6fb: **Button — the label and the icon fade when busy changes.** When a busy Button stops being busy its label and its icon
  fade back in, and when it becomes busy they fade out, one change of opacity on the new token
  `tanrei.comp.button.motion.busy-fade-duration` (the role `sys.motion.role.state.compact`, 200 ms in the default system,
  the same at every size) and the button's `state-easing`. Nothing changes place or size, and a change of `busy` during
  the fade turns it round from the opacity then drawn. Before, both happened in one frame. The loading indicator's arc
  still appears and goes at once, and what the button exposes to assistive technology (`aria-disabled` and `busyLabel`
  as its description, on the web) still changes at once, not at the end of the fade. Under reduced motion the label and
  the icon change at once, as the button's other changes of state do on the web.
  
  **Breaking:** a test or a stylesheet that read a Button's label or icon as whole (or as gone) in the frame after `busy`
  changed now sees it partway through the fade: wait for the button's transitions to finish. On the web the label's
  default slot, not the label itself, now carries the inert `transition-delay` of `sys.motion.duration.press-hold`, and
  the icon of a busy button is at opacity 0 as well as `visibility: hidden`.
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
- 2c75918: **Button group: the lines between buttons fade.** When a toggle in a connected group is switched, or an item's
  `toggle` or `variant` changes, a line that a seam gains fades in, a line it loses fades out, and a line that changes
  between `connected.divider.color` and `connected.divider.on-fill.color` fades from one to the other. Before, all of
  this happened in one frame. The fade uses the new tokens `tanrei.comp.button-group.motion.state-duration` (the role
  `sys.motion.role.state.default`, the pace at which a medium Button changes between its looks) and
  `tanrei.comp.button-group.motion.state-easing` (`sys.motion.easing.state`). Only opacity changes. Which seams carry a
  line is still decided at once. The item's `selected` and `aria-pressed` also change at once, not when the fade ends.
  Lines are still drawn at once under reduced motion, in the frames in which the group is first drawn, and when the items
  are placed again (an item that comes, goes or moves) or joined in the other form.
  
  **Toolbar: what a toggle item's change of look follows is now in its spec.** A toggle item changes between its
  selected and unselected looks over its own Button's state motion (`comp.button.motion.state-duration` of its size,
  `sys.motion.role.state.default` at the medium size), and its `aria-pressed` changes at once. The look changes at once
  under reduced motion and in the first frames. The toolbar adds no motion or token of its own. The web already drew it
  this way, and the tests now check it.
  
  **Breaking:** on the web a divider draws its line twice: `::part(divider)::before` in the divider color and
  `::part(divider)::after` in the on-fill color. A seam shows one of them, or neither, by its opacity. Before, a seam with
  no line hid `::before` with `display: none`, and the on-fill line recolored `::before`. A stylesheet that styled
  `::part(divider)::before` alone now styles only the divider-color layer. A test that read a line in the frame after a
  toggle was switched now sees it partway through the fade, so wait for the group's transitions to finish.
- f2dd913: Button group: a new `size` (`small`, `medium`, `large`). Set on the group, it is the size of every Button in it that
  sets none of its own, so a row of small actions is written once: `<tanrei-button-group size="small">`. Only a size set
  on the group is passed down; a group that sets none leaves its Buttons at their own default. A Button's own `size`
  always wins, `medium` included.
  
  Button: a Button without a `size` is drawn at the size its nearest container sets, and at `medium` where none does. A
  size it does not have is taken as its nearest (`extra-small` as `small`, `extra-large` as `large`). Setting `size` to
  any value, `medium` included, makes it the Button's own; removing the attribute (or setting the property to `null`)
  gives it back. Reading `size` while none is set still gives `medium`.
  
  This is the first container of the size cascade: the system's density moves every height, a container's size picks
  the step, and a component's own size wins. The density tests now hold the Button at densities 0.75, 1 and 1.5 and
  minimum targets 24, 36 and 48.
  
  A page's own style that selects `tanrei-button[size='small']` does not match a Button that takes its size from a group:
  that Button has no `size` attribute.
  
  New fixture: `button-group/small`. Nothing that was drawn before moves.
  
  The cascade costs a Button about 0.4 kB gzip (33,624 to 34,059 bytes), and every bundle that pulls in a Button the same;
  a button group takes about 0.1 kB more (16,281 to 16,397). Two bundles go over their budgets with it, which rise by the
  same rule, the measured size and 5 % rounded up to the next 100 bytes: the popover's from 57,000 to 60,300 bytes
  (measured 57,343, from 56,930) and the snackbar's from 45,900 to 48,300 (measured 45,920, from 45,511). The Button
  already carries only the part of the cascade that takes a size; the part that passes one is the group's alone.
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
- e1a3154: Button: a Button that sets no `size` no longer writes `size="medium"` on itself. Since it takes the size of the
  container around it, its first render wrote the default's name as an attribute, so a Button drawn small in a small
  button group still said `size="medium"`. Only a size set on the Button is written now, and removing it removes the
  attribute. A page's style or script that reads `tanrei-button[size='medium']` on a Button that sets none finds no
  attribute. The custom elements manifest no longer marks Button's `size` as reflected by Lit: the Button writes the size
  set on it itself.
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
- 17a37da: **Callout — it opens and closes in one motion.** When a callout's `open` changes — the person closes it with its close
  button, or the product shows or hides it — its height and its opacity now change together in one motion, in the page's
  layout, on the new tokens `tanrei.comp.callout.motion.disclosure-duration` (the role `sys.motion.role.disclosure`, 400 ms
  in the default system) and `disclosure-easing` (`sys.motion.easing.spatial`). Its content stays fixed to its top edge,
  what follows it moves with its bottom edge at every frame, and the space its container keeps beside it (a flex column's
  gap, the margin prose puts before the next block) closes and opens with it, so nothing that follows steps at the end. A
  change while it moves turns it round from what is drawn. What assistive technology and focus get still changes at once:
  from the moment `open` is false the callout has no role, its content is out of the accessibility tree and the focus order
  and focus has gone back where it came from; from the moment it is true it is exposed and, live, announced. Before, the
  callout appeared and disappeared in one frame. Reduced motion and the callout's first frames still change at once.
  
  **Breaking:** on the web the container now stands in a `.box` inside the callout's shadow root, and a closed callout
  stays drawn until its motion has ended: a test that read it as gone (no box, `display: none`) or whole in the frame after
  `open` changed now reads it partway through the motion — wait for the callout's motions to finish. While the space beside
  it moves, the callout's own `margin-block-end` is animated; at rest it is the product's again.
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
- 266b875: **Chat composer — an attachment that is added or removed moves.** When a File item is added to the strip or removed
  from it — by the person, by the product, or by the composer emptying itself after `send` — the capsule now changes its
  height in one motion, on the new tokens `tanrei.comp.chat-composer.motion.resize-duration` (the role
  `sys.motion.role.resize.large`, 400 ms in the default system) and `resize-easing` (`sys.motion.easing.spatial`). The
  motion is anchored to the row of the typing area: that row, its actions and its send button keep their place against
  the capsule's bottom edge, and the items that stay keep theirs against its top edge, so where the composer stands at the
  foot of a conversation the row being written does not move at all. An item that is added fades in at its place, one
  that is removed fades out where it was drawn, and one whose place in the strip changes moves there, over the same
  motion. A change while it moves goes on from what is drawn. When the send and the stop button change places, the button
  changes at once — its name, its action, whether it is enabled — and only the glyph of the Button the composer brings
  cross-fades, over the new token `motion.glyph-fade-duration` (`sys.motion.role.state.compact`, 200 ms) with
  `motion.state-easing`; the send button's colours between enabled and disabled move as the Button's own state does. What
  assistive technology, focus and `sendable` get still changes at once: an item that is removed is out of the
  accessibility tree, the focus order and the strip's count from the first frame. Reduced motion and the composer's first
  frames still change at once. Before, CCM-35 made all of these take effect at once. Resting pictures are unchanged: no
  baseline was re-recorded.
  
  **Breaking:** on the web the strip now stands in a box of its own inside the composer's shadow root. While one of the
  product's File items leaves (`attachments="given"`), the composer puts the product's own `<tanrei-file-item>` element
  back where it stood, as its child, for the length of the motion — `inert`, `aria-hidden="true"` and `data-leaving` —
  then removes it and gives back the `inert`, `aria-hidden` and `style` it had. A script that reads the composer's children
  in that time sees it: select `tanrei-file-item:not([data-leaving])`. A test that read the capsule's height, an item's
  place or the send button's glyph in the frame after an item was added or removed, or after `sending` changed, now reads
  it partway through the motion: wait for the composer's motions to end. Every platform's tokens gain the three entries.
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
- 0e36941: Combobox chooses several values: `selection="multiple"` (default `single`, which is unchanged) with `values`, an array
  in the order the values were chosen (the attribute is a JSON array or words). Each chosen value is an input Chip in the
  box before the text, in lines that wrap; the box grows by whole lines and never hides a value behind a count. A choice
  adds the option, or takes it out where it is chosen, empties the text and leaves the list open for the next one;
  leaving the field or Escape empties the text and chooses nothing. Backspace at the start of the text moves focus to the
  last chip, where the arrows, Home and End move among the chips and Backspace or Delete removes one — the chip field's
  keys. The listbox is `aria-multiselectable`, each option says whether it is selected, the chips are a list named like
  the combobox, and a polite live region says what was added or removed (`remove-label`, `added-text`, `removed-text`,
  which read the chip field's words `entryRemoveLabel`, `entryAddedText` and `entryRemovedText` when left empty). In a
  form it submits one entry per value under its `name`, as `<select multiple>` does, and resets to its `values`
  attribute. `change` carries `detail.values`. New parts: `entry`, `entry-container`, `entry-label`, `entry-remove`. New
  tokens `comp.combobox.entries.gap`, `.row-gap` and `.typing-min-width`, aliases of the text input's entries spacing.
  Combobox spec: CMB-70 to CMB-82; the native platforms have not implemented it yet.
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
- 9ca3d46: **Breaking — the root layer `core` is grey, and Tanrei's own colors are the default system's.** `core` now values the
  vocabulary with a neutral palette without chroma, the four status palettes, the color roles drawn from them and the
  per-state rules, and declares no accent, no tints and no code colors. What was Tanrei's look moved to
  `tokens/systems/tanrei.system.json`: the accent palette (the keyboard focus ring and its `accent` roles), the four quiet
  palettes of the status containers and of the inverse status bars, and the six syntax palettes of code. `m3-like` and
  `cupertino` declare every palette and color they used to take from the root, each with a reason where Material 3 or
  Apple's guidelines have no counterpart.
  
  No shipped system moved: every stylesheet, bundle value and native constant of `tanrei`, `m3-like`,
  `m3-expressive-like` and `cupertino` is byte for byte what it was, and `fidelity.json` is unchanged. Only the bundles'
  recipe (`dial/dial.tokens.json`, which carries the layers as written) differs.
  
  What broke, for anyone who read `core` directly (a layer chain built on it, `diff_systems … core`, the Studio's preview
  of it):
  
  - `core` has no `accent` palette and no `sys.color.accent`, `on-accent`, `accent-container` or `on-accent-container`;
    its focus ring is the primary's. A layer on `core` that wants an accent declares the palette itself.
  - `core` has no `error-quiet`, `success-quiet`, `warning-quiet`, `info-quiet` or `syntax-*` palettes. Its status
    containers are tints of the status palettes themselves; its inverse status bars take the roles their component
    document names; its code is drawn in the text colors the code block's document gives it.
  - `accent: null` in a layer that extends `core` drops nothing any more: delete it.
  
  New: the root's stylesheet, `@tanrei/web/systems/core.css` (scoped to `[data-tanrei-system="core"]`), the grey starting
  point. `core` is still not offered where a system is chosen, and the build holds it to every accessibility invariant as
  it holds the default system: a finding fails `pnpm generate` and `pnpm validate`.
- 14b445d: **cupertino follows Apple's current Human Interface Guidelines** (read 2026-11-12). Its fidelity to Apple's published figures rises from 38 of 52 to 50 of 52.
  
  - **Colors.** `primary`, `error`, `success`, `warning` and `info` are Apple's system Blue, Red, Green, Orange and Cyan as Apple has published them since its June 2025 color update, in light and dark: primary is #0088ff / #0091ff (was #087aff / #4c8eff), error #ff383c / #ff4245, success #34c759 / #30d158, warning #ff8d28 / #ff9230, info #00c0e8 / #3cd3fe. The medium and high contrast schemes take Apple's increased-contrast swatches (Apple publishes one increased contrast): primary #1e6ef4 / #5cb8ff, error #e9152d / #ff6165, success #008932 / #4ad968, warning #c55300 / #ffa056, info #007eae / #6dd9ff. The containers and the other tones of these palettes follow the new seeds. Text in these colors and white text on them contrast less than before (cupertino's accessibility report lists 226 measurements, was 113), as on Apple's platforms; an imitation preset is held to fidelity, so none of them is an error.
  - **Type.** `display` and `heading-1` to `heading-3` are Regular (400), as Apple's Large Title and Title 1 to 3 are (were 700, 700, 700, 600). The display and heading emphasis steps are 300 (were 100 and 200), so emphasized display, heading-1 and heading-2 are Bold (700) as Apple's are (were 800, 900, 900). One step serves the heading family, so emphasized heading-3 is 700 and heading-4 900 where Apple's emphasized Title 3 and Headline are Semibold (600); the fidelity map lists both. cupertino's large app-bar title, which aliases `display`, is now Regular where Apple's large navigation title is Bold: a component text style cannot take its role's emphasized weight yet (mimicry gap `emphasis-per-style`).
  - **The fidelity harness** compares a color in every scheme a map names (`colors.schemes`, Tanrei scheme to the reference's appearance), and the Apple reference records the increased-contrast swatches.
  - **A model read one scheme at a time** (the MCP server) now reports the snackbar's expand and close glyph in every scheme, as a whole model does; it reported the light scheme only.
  
  No snapshot baseline moves: every cupertino snapshot stays within the comparison tolerance of its baseline with these values.
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
- 9646c7f: **Breaking — the default system's minimum target is 36, for a mouse and for a finger, and nothing a person presses is
  drawn below it.** The default system no longer keeps a 48 touch target (or a 44 pointer target) by adding space:
  `sys.target.minimum` is 36, and `sys.target.pointer` and `sys.target.touch` alias it, so one value sets all three. A
  product that follows a platform guideline sets `touch` or `pointer` above the minimum in its layer; the build refuses
  either below it. The m3-like and cupertino presets keep the targets they had (48 / 44, and their own minimums).
  
  What moves in the default system (and in the root layer, which shares these values):
  
  - **Held at 36** (from 32): the small Button, Button with menu, Copy button and segmented button; the small stacked
    input boxes (text input, select, combobox, number input, color input and their fields); the medium chip; small Tabs;
    small Pagination; the snackbar's controls; the compact rows of the tree view, navigation drawer (and its collapsed
    column), table of contents, menu, select, combobox, search and list. Their block paddings take half of what the box
    gained (a small Button has 8 above and below its label, where it had 6), and so do the small Button with menu's
    trailing half, the medium chip's avatar and remove ends and the compact collapsed drawer cell, which stay square and
    concentric with the taller box. The space between a field's clear button and the chevron or button after it
    (`comp.combobox.container.action-gap`, which the select and the text input alias) grows from 4 to 6 the same way, so
    the 36 clear button meets its neighbour instead of overlapping it.
  - **Hit areas** shrink from 44 (pointer) and 48 (touch) to 36 everywhere: a control that is drawn at least 36 reaches
    nothing past what it draws. A mark keeps its size and still reaches the target (a checkbox's and a radio button's 40
    containers already hold it; a small chip, 24, reaches 36).
  - **Spaces that existed only to keep a 48 target whole are 0:** the standard button group's gap, the docked toolbar's
    gap and the search bar's gap (each `sys.target.touch` less a small Button, never below 0), so their items now touch.
    The radio button's option row is its 40 container high (it was 48), and the carousel's controls row is 40, the
    height of its controls (it was 48).
  - The invariant that a stacked input box is as tall as a Button of the same size is now the general rule it was an
    instance of: in the default system every height that reads a step of `sys.control.height` is as tall as that step,
    or as `sys.target.minimum` where it is floored.
  - Web: the app bar's brand cell is as large as the navigation item's (the larger of the target and a medium icon-only
    Button), so its symbol still stands where the icon does; a list that is dragged near its edge reads the width of its
    scrolling band from `sys.target.touch` in pixels, whatever unit the token is written in (it read `2.25rem` as 2.25).
  
  Every web baseline of the default system that shows one of these heights, hit areas or gaps is re-recorded; the
  presets' baselines do not move. `dial.size.unit` no longer scales any target: it scales control heights and glyphs.
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
- 44976d9: Destructive across the Button's forms and its hosts.
  
  - **Button:** ten new fixtures show `destructive` beyond each variant at medium: small and large, a trailing icon,
    icon-only in tonal and outlined, narrow (filled, text) and wide (outlined), busy and full width. The BTN-40 tests now
    check every destructive fixture of the spec against its variant's destructive parts, and that each keeps the size and
    the place of every part of the same fixture without `destructive`.
  - **Dialog, side sheet, popover, button group and toolbar:** the action and button items declare `destructive`, the
    Button's own, which the host leaves as set (on the web it was already the Button's attribute; the spec now names it).
    New fixtures: `dialog/destructive-confirmation` (an alert dialog, Cancel and a filled destructive Delete),
    `side-sheet/destructive-action`, `button-group/order-cancel-delete` and `toolbar/docked-destructive-item`.
  - **Toolbar (TBR-20):** an action or a labelled Button hidden into the overflow menu is a destructive menu item while
    the Button draws destructive — not a toggle (BTN-41) and not a link (BTN-43). It used to be a plain row.
  - **Where there is no destructive look**, the specs now say so in their notes: a segmented button, a filter chip and an
    action chip, the main action button and the FAB menu. An action that deletes is a Button with `destructive`, or a
    menu's destructive item.
  
  New baselines (web, Chromium): the fourteen fixtures above, recorded on CI's Linux image.
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
- d5f05c8: FAB menu: each item appears as every surface does, and leaves the way it came. **Breaking** (a motion
  0.1.0-next.0 shipped): the items no longer only fade as they close, under reduced motion they fade instead of appearing
  at once, and under an appearance other than m3-like's they start from that appearance's values.
  
  - Under m3-like and m3-expressive-like an item enters as before: from opacity 0 and scale 0, grown from the middle of
    its end edge on both axes, over `comp.fab-menu.motion.open-duration` and `-easing`, the one nearest the toggle first
    and each next `comp.fab-menu.motion.stagger` later. Under a system that takes the FAB menu into another appearance
    (the default system's fade-scale: opacity 0 and scale 0.96) it starts from that appearance's values.
  - Closing takes every item back together the same way, over `comp.fab-menu.motion.close-duration` and `-easing`, where
    it used to only fade. Told to close while it opens, or to open while it closes, each item turns round from where it
    is, with no stagger.
  - Where motion is reduced the items fade in and out together over `sys.motion.role.reduced` (100 ms), with no scale,
    distance or blur; the toggle still changes at once.
  - What moves is a new box inside each item's shadow root, around its `container` part, so the part keeps its own state
    opacity and transitions. The `entering` class on an item's container, the `leaving` class on the list and the
    `fab-menu-item-in` and `fab-menu-leave` keyframes are gone.
  - `appearStyles()` takes `unfold: false` for a surface that grows beside what opened it: it scales on both axes under
    the `unfold` appearance too.
  
  Specs: FBM-19 says so. Baselines are unchanged: the fixtures are drawn in place, at rest.
- 74b5a43: **Field — the error row opens and closes in one motion.** When a field's error text appears, goes or changes its words
  and the field's height changes with it, the field now moves to its new height in one motion, in its layout, on the new
  tokens `tanrei.comp.field.motion.resize-duration` (the role `sys.motion.role.resize.default`, 300 ms in the default
  system) and `resize-easing` (`sys.motion.easing.spatial`). The rows are fixed to the field's top edge: the label, the
  control and every line above the error text keep their places, and what stands below the field moves with it at every
  frame. An error text that appears fades in over the field's state motion (`comp.field.motion.state-duration`,
  `role.state.default`); one that goes is taken away at once and the row closes after it. Before, the row was drawn as it
  then was in one frame. New words of the same height, an error text that takes the place of a help of the same height,
  reduced motion and the field's first frames still change at once. Every composed field that draws its rows with a Field
  follows: the text, number, color, slider, chip, one-time-code, select and combobox fields.
  
  **Breaking:** on the web the supporting row now stands in an always-rendered `.supporting-box` inside the field's
  shadow root, and a test that read the field's height, or the place of what stands below it, in the frame after its
  error changed now reads it partway through the motion: wait for the field's transitions to finish.
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
- 5fe57e9: **File upload — a row that is added or removed arrives and leaves in one motion, and a change of status moves a row's
  height.** The rows are the items of the file upload's List, and now arrive and leave as the List's items do, whether or
  not `reorderable` is set: in a column a row that is added opens its height from nothing while it fades in, and a row
  that is removed fades out where it was drawn while it closes, on the List's resize motion
  (`comp.list.motion.resize-duration`, the role `sys.motion.role.resize.large`; `resize-easing`, `sys.motion.easing.spatial`)
  and its state motion for the fade. The rows below and what stands under the file upload follow at every frame, and the
  room of `comp.file-upload.list.gap` above the list opens with the first row and closes with the last. In a strip of
  tiles a tile fades in or out at its place, the tiles whose place changes move there, and the strip's height moves where
  a line is added or taken away. When a row's status changes and that changes its height (an error text that appears, a
  bar that goes), the height moves on the same resize motion, anchored at the row's top. What is exposed changes at once:
  the list's count and positions, the form's value, the announcement and focus (FUP-30). Reduced motion and the first
  frames still draw every change at once. Before, FUP-29 drew a row that was added, removed or changed at once. Resting
  pictures are unchanged: no baseline was re-recorded.
  
  **Breaking:** on the web, while `rows="given"`, a row the product takes away is drawn leaving from the product's own
  `<tanrei-file-item>`: the file upload puts it back where it stood, as its child, for the length of the motion — `inert`,
  `aria-hidden="true"` and `data-leaving` — then removes it and gives back what it had. A script that reads the file
  upload's children in that time sees it: select `tanrei-file-item:not([data-leaving])`. A test that read a row's place or
  height in the frame after a row was added or removed now reads it mid-motion: wait for the motion to end. The List gains
  an internal channel (not a prop) that lets a component that arranges its own items in it show their arrivals and leaves
  while it is not reorderable; a List the product writes is unchanged but for one fix: an item's arrival and leave, in a
  reorderable List too, begin in the first frame drawn after the change. WebKit dated them from the frame before it, so a
  change that took longer to render than the motion lasts drew the items whole at once.
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
- 38b7cd2: **More heights read the control height ladder, and the presets hold their own targets. No resolved value changes: every
  token of every system, in every scheme, is what it was, and no picture moves.**
  
  What a layer sees differently:
  
  - **The small rows read `sys.control.height.small`.** The tree view's compact row, the navigation drawer's compact item
    and collapsed cell, the table of contents' compact row, and the menu's, list's and search suggestion's compact rows
    are now `{ "fn": "mul", "of": "{tanrei.sys.control.height.small}", "by": 1, "min": "{tanrei.sys.target.minimum}" }`,
    as the small Button is. **Breaking for a layer that set the tree view's compact row to move the others:** the menu,
    the list and the search suggestion aliased it, and no longer do; set `sys.control.height.small` to move every small
    control and row together, or each row's own token.
  - **The medium tag and key cap alias `sys.control.height.extra-small`** (24), which they equalled.
  - **m3-like and cupertino set `sys.target.pointer` and `sys.target.touch`** (44 and 48, the values they had), and m3-like
    sets `sys.target.minimum` (32), each with its reason, so the default system's targets no longer reach them. They are
    values, no longer multiples of `dial.size.unit`: a product that changes the size unit on top of a preset keeps the
    preset's targets.
  - The size descriptions of Button, Button with menu, Copy button, Chip, Tabs, Pagination, Segmented button and the
    stacked input boxes now say that the height is never drawn below `sys.target.minimum`.
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
- 2709512: `--tanrei-icon-visibility`: a product's switch for the icons it draws in the light DOM. Set to `hidden` on the root (or a subtree) while the icon font cannot draw, every glyph the package's stylesheets draw in the light DOM — `.tanrei-icon`, a slotted one too, and the glyphs `link.css`, `breadcrumbs.css`, `prose.css`, `accordion.css`, `tree-view.css`, `table.css`, `timeline.css`, `link-card.css` and `previous-next-links.css` generate — keeps its box and is not painted, so a slow line never shows an icon's name in letters after `font-display: block`'s block period, and nothing moves when the switch comes off. Unset, a glyph inherits its parent's visibility, as before. The accordion's and the tree view's own rule for a glyph the icon set cannot draw yet (ACC-33, TRV-40) now hides a slotted `.tanrei-icon` through the same switch. The README's "Fonts" section shows the script that sets it. The docs site uses it: its icons stay hidden until their font draws them, and a page whose icon font fails to load says so in the console.
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
- 0918093: **Breaking — the input boxes take the size their container sets.** A text input, a number input, a color input, a
  select and a combobox that set no `size` of their own are now drawn at the size of the nearest container that sets one —
  a toolbar's `size` today — and at `medium` where none does, as a Button is. In `<tanrei-toolbar size="small">` a select,
  a number input and a text input stand 36 high under the default system, as tall as the toolbar's small Buttons, where
  they stayed at medium before. A box's own `size`, `medium` included, still wins. The number input's steppers and the
  text and color inputs' picker button follow the size the box draws, and so do the options of a select's and a
  combobox's list: a select that takes a small toolbar's size opens small rows. A slider in a toolbar still takes nothing: its size
  is the weight of its track.
  
  What changed on the elements:
  
  - `size` is no longer written on a box that does not set it: an element without the attribute stays without it, and
    reading `size` there still gives `medium`. A style or a test that matched `tanrei-select[size='medium']` on a box
    that sets no size no longer matches.
  - The React wrappers no longer write `size="medium"` by default (that would have made it the box's own).
  - The Text field, Number field, Color field, Select field, Combobox field and Chip field declare `size` as their box
    does: unset, it is not written and reads `medium`, and the box inside them is given none and takes its container's
    size the same way; set, `medium` included, it is written and is the box's own.
  - `TanreiTextInputSize`, `TanreiNumberInputSize`, `TanreiColorInputSize` and `TanreiComboboxSize` now include `small`,
    which their specs have always listed and their styles have always drawn.
  
  The byte budget of `@tanrei/web/all` is raised from 664500 to 664900 bytes gzip (664838 measured; 764 more than
  before this change): five boxes now take a size from their container, with its custom state, its re-layout when the
  drawn size changes, and six composed fields that forward only the size the product set. What the size consumers wrote
  each for themselves — the drawn size's selector, its axis read, the token-name check — is shared now, 222 bytes less.
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
- 15ff26b: **Link card — its picture fades in, and a picture that fails folds its box away.** When a link card's picture arrives
  after the card has settled it fades in over the fill of its box, its opacity from transparent to whole on the new tokens
  `tanrei.comp.link-card.motion.picture-duration` (the role `sys.motion.role.state.large`, 250 ms in the default system)
  and `picture-easing` (`sys.motion.easing.state`); nothing changes place or size. When a picture cannot be loaded while
  its box is drawn, the box folds away in one motion of its size on the new tokens `motion.resize-duration`
  (`sys.motion.role.resize.large`, 400 ms) and `resize-easing` (`sys.motion.easing.spatial`): beside the text the box
  narrows to nothing at the card's end edge while the text widens to the whole card, above the text its height goes to
  nothing while the text rises with it, and the card's height and whatever follows the card move at every frame. A new
  image given while the box folds opens it again from the size drawn. Before, both happened in one frame. A picture the
  browser already holds when the card first draws it, one that loads or fails while the card draws its first frames, and
  both motions under reduced motion are still drawn at once; the card's name and description do not change with either
  motion. The resting card is drawn as before.
  
  **Breaking:** on the web a test that read a link card's picture as whole the moment it loaded, or read a card whose
  picture failed as already at its height without the picture, now reads it partway through the motion: wait for the
  card's motions to finish. While the box folds, the element carries `data-tanrei-folding` and animates the anchor's
  `padding-inline-end` or `padding-block-start` and its `block-size` (clipped); while a picture fades in it carries
  `data-tanrei-arriving`. Both are taken off at rest.
- b2eb818: A link's `target` is typed to take HTML's spelling of its two values as well, `_self` and `_blank`, which the elements
  already read as `same` and `new`: `<Button href="/docs/" target="_blank">` now type-checks in React and in TypeScript,
  on every element with a link form (`TanreiLinkTarget`, `TanreiLinkCardTarget`). Any other value is still a type error,
  and at run time still opens where the person is, reported in debug builds.
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
- abc6706: **List — an item that is added or taken away arrives and leaves in one motion.** In a reorderable list, an item the
  product adds now grows along the list — its height in a column, its width in a line — from nothing to its own length,
  the gap beside it opening with it, on the new tokens `tanrei.comp.list.motion.resize-duration` (the role
  `sys.motion.role.resize.large`, 400 ms in the default system) and `resize-easing` (`sys.motion.easing.spatial`), and
  fades in over the list's state motion (`comp.list.motion.state-duration`, `role.state.large`). An item the product takes
  away fades out where it was drawn and closes the same way back. The items after it follow its edge at every frame, and
  so does the list's own length. In a wrapping list the item fades in or out at its place while the items whose place
  changes move there, as on a reorder. A divider that comes or goes with the first item fades with it. A change that
  comes mid-motion (an item taken away while it arrives, or given back while it leaves) goes on from what is drawn. What
  the list exposes changes at once: the count, the positions, focus (LST-46). The list's first frames, the moment it
  becomes reorderable, a lift and reduced motion still add and take away at once. Before, LST-41 had a new or removed item
  appear or leave at once. Resting pictures are unchanged: no baseline was re-recorded.
  
  **Breaking:** on the web, while an item leaves, the list puts the product's own `<tanrei-list-item>` element back where
  it stood, as its child, for the length of the motion — `inert`, `aria-hidden="true"` and `data-leaving` — then removes
  it and gives back the `inert` and `aria-hidden` it had. A script that reads the list's children in that time sees it:
  select `tanrei-list-item:not([data-leaving])`. A test that read an item's place or height in the frame after an item was
  added or removed now reads it mid-motion: wait for the motion to end. Every platform's tokens gain the two entries.
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
- 792e1e6: List and List row: `density` is gone; each takes `size` (`small`, `medium`; default `medium`) in its place. `regular`
  is `medium` and `compact` is `small`, with the same heights, paddings, text styles and glyphs: `<tanrei-list
  size="small">`, `<tanrei-list-row size="small">`. The system's density (`--tanrei-dial-density`) still moves the
  heights of both sizes.
  
  The size passes down as a Button's does in a button group: set on a list, it is the size of every List row the list
  holds that sets none of its own. A row's own `size` now wins, `medium` included; before, a row in a list item drew the
  list's density whatever its own said. Only a size set on the list is passed: a list that sets none leaves its rows at
  their own size, and at the size a container around the list sets. A list or a row without a `size` is drawn at the
  size its nearest container sets, and at `medium` where none does; reading `size` then still gives `medium`. Setting
  it to any value makes it its own; removing the attribute (or setting the property to `null`) gives it back.
  
  A small action, link or option is no longer lower than the pointer target for a fine pointer: under a system whose
  `sys.target.pointer` is above its small item height (36 in the default system), the small item is drawn that high, as
  the medium one is. The default system draws nothing differently: its pointer target is the minimum target, 36, which
  the small item is already held at.
  
  What broke:
  
  - The `density` attribute and property of `tanrei-list` and `tanrei-list-row`, and the types `TanreiListDensity` and
    `TanreiListRowDensity` (now `TanreiListSize`, `TanreiListRowSize`; the registries a design system augments are
    `TanreiListSizeRegistry` and `TanreiListRowSizeRegistry`). A list and a row that set no size reflect no `size`, and the React
    wrappers `List` and `ListRow` pass no default one.
  - The token ids `comp.list.container.height.{regular,compact}`, `comp.list.container.padding-block.{regular,compact}`,
    `comp.list-row.container.height.{one,two,three}-line.{regular,compact}` and
    `comp.list-row.container.padding-block.{regular,compact}` are now `.medium` and `.small`, and so are their CSS
    custom properties (`--tanrei-comp-list-container-height-medium`, …) and the generated native token types. The axes
    are `comp.list.size` and `comp.list-row.size`. A layer that pins one of the old ids, or adds a density, renames it.
  - `TanreiListItemFrame` (what a list item tells a List row) has no `density` any more.
  
  Fixtures renamed, their pictures unchanged: `list/density-compact` is `list/size-small`, `list-row/compact` is
  `list-row/small` and `list-row/compact-one-line` is `list-row/small-one-line`.
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
- c8f9fe8: Menu: the menu's surface and every submenu's appear as every anchored surface does, and leave the way they came.
  **Breaking** (a motion 0.1.0-next.0 shipped): the menu no longer unfolds from a height of 0 and no longer only fades as
  it closes, and reduced motion is a fade instead of an appearance at once.
  
  - The surface starts from `sys.motion.appear.*` — opacity 0 and scale 0.96 under the default system — grown from the
    middle of the edge that faces the anchor (a submenu's: the edge that faces its item; a context menu's: the edge that
    faces the point), from its centre where `sys.motion.appear.origin` is center, over `comp.menu.motion.open-duration`
    and `-easing`, and leaves the same way back over `comp.menu.motion.close-duration` and `-easing`. Told to close while
    it opens, or to open while it closes, it turns round from where it is.
  - Under the `unfold` appearance (m3-like and m3-expressive-like) the menu unfolds from that edge at its full width, and
    a submenu from the edge that faces its item at its full height.
  - Where motion is reduced each surface fades in and out over `sys.motion.role.reduced` (100 ms), with no scale,
    distance or blur.
  - The surface is placed and measured as it rests: a submenu measured while it starts from its scale is still placed
    with its first row level with its item.
  - The surface carries `data-side` (`top`, `bottom`, `left`, `right`) where it carried the `side-top` and `side-left`
    classes, and `open` while it is shown; the `entering` and `leaving` classes and the `menu-open`, `menu-close`,
    `submenu-open` and `submenu-close` keyframes are gone.
  
  Specs: MNU-4, MNU-49, MNU-50 and MNU-61 say so. Baselines are unchanged: the fixtures are drawn in place, at rest.
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
- 08f44fd: Menu and Search: `density` is gone; each takes `size` (`small`, `medium`; default `medium`) in its place. `regular` is
  `medium` and `compact` is `small`, with the same heights, paddings, text styles and glyphs: `<tanrei-menu size="small">`,
  `<tanrei-search size="small">`. Every submenu takes its menu's size. The system's density (`--tanrei-dial-density`)
  still moves the heights of both sizes.
  
  Select and Combobox (and Select field and Combobox field): `density` is gone with no replacement prop. The options of the
  list take the box's `size`: a `small` select or combobox opens small options (36 high in the default system), a `medium`
  or `large` one medium options (48). Before, every box size opened regular options unless `density` said otherwise, so
  an open small select now draws lower rows.
  
  A menu, a search, and the list of a select or a combobox take no size from a container around them, such as a toolbar,
  a button group or a list whose size is set: they open over the page in the top layer, apart from the controls around
  their anchor, as the menus of Material and Fluent keep their own rows in a dense toolbar. A menu opened
  from a Button in a small toolbar is medium unless the menu sets its own `size`. The back button of the search's
  full-screen view is now set to `medium`, as its spec says, so a container's size no longer reaches it either.
  
  A small row or option is no longer lower than the pointer target for a fine pointer: under a system whose
  `sys.target.pointer` is above the small row's height (36 in the default system), the small row is drawn that high, as
  the medium one is. The default system draws nothing differently: its pointer target is the minimum target, 36, which
  the small rows are already held at.
  
  What broke:
  
  - The `density` attribute and property of `tanrei-menu`, `tanrei-search`, `tanrei-select`, `tanrei-combobox`,
    `tanrei-select-field` and `tanrei-combobox-field`, and the types `TanreiMenuDensity`, `TanreiSearchDensity`,
    `TanreiSelectDensity` and `TanreiComboboxDensity` (now `TanreiMenuSize` and `TanreiSearchSize`; a select's and a
    combobox's options have no prop of their own). The registries a design system augments are
    `TanreiMenuSizeRegistry`, `TanreiSearchSizeRegistry`, and, for a size added to the options, `TanreiSelectOptionSizeRegistry`
    and `TanreiComboboxOptionSizeRegistry`. The React wrappers lose their `density` prop.
  - `TanreiComboboxSize` now includes `small`, which the combobox's spec has always listed.
  - The token ids `comp.menu.{container.height, container.padding-inline, container.padding-block, container.gap,
    leading-icon.size, trailing-icon.size, mark.size, group-title.padding-inline}.{regular,compact}`,
    `comp.select.{option.height, option.padding-inline, option.padding-block, option.gap, option.leading-icon.size,
    option.mark.size, group-title.padding-inline}.{regular,compact}`, the same of `comp.combobox`, and
    `comp.search.suggestion.{container.height, container.padding-inline, container.padding-block, container.gap,
    leading-icon.size}.{regular,compact}` are now `.medium` and `.small`, and so are their CSS custom properties
    (`--tanrei-comp-menu-container-height-medium`, …) and the generated native token types. The axes are
    `comp.menu.size`, `comp.select.option-size`, `comp.combobox.option-size` (the box alone has a size axis) and `comp.search.size`. A layer that pins one of the old
    ids, or adds a density, renames it.
  
  Fixtures: `menu/density-compact` is `menu/size-small` and `search/density-compact` is `search/size-small`, their
  pictures unchanged. `select/density-compact` and `combobox/density-compact` are `size-small`, with a small box, so their
  pictures are new; and the open small selects (`select/small-open`, `select/small-label-hidden-open`, the same of
  `select-field`, and `field/select-small-open`, `field/select-small-label-hidden-open`) now draw small options.
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
- 328d945: **Breaking — the navigation drawer is resizable, by default.** Where a `<tanrei-navigation-drawer>` (React
  `NavigationDrawer`) stands beside the content — a standard drawer that is open, or a responsive drawer's standard
  presentation — a person can change its width at its end edge, and fold a collapsible drawer to its column the same way.
  
  What breaks:
  
  - Every standard drawer now has a resize handle on its end edge: **one more Tab stop**, after the drawer's last row and
    before what follows the drawer, exposed as a window splitter (`role="separator"`). It is out of sight until a mouse
    comes over the edge or it has keyboard focus; on a touch screen its line is drawn at rest. `resizable="false"`
    (React `resizable={false}`) leaves it out.
  - The drawer's end edge takes a press over the content beside it: a band 36 px wide (`sys.target.pointer`, or
    `sys.target.touch` for a coarse pointer) from the edge outward, with the handle's box at its middle. It never lies
    over the drawer, so a row's hit area keeps the drawer's full width, a group's chevron keeps its whole target, and a
    scrollbar at the drawer's end edge is still taken.
  - In an app shell, a navigation drawer stands over the main region (`z-index: 1` among the frame's regions) so that the
    edge takes the press there; the footer is still drawn over it.
  - The navigation drawer's host is no longer `overflow: hidden`: what slides in and out is cut by a `clip-path` at its
    start edge, top and bottom, and not past its end edge.
  
  What it does (NVD-96 to NVD-104):
  
  - **A drag** on the edge follows the press without a motion, between the least width (`min-width`, else
    `comp.navigation-drawer.container.min-width`, 200) and the greatest (`max-width`, else
    `comp.navigation-drawer.container.max-width`, 400, and never more than the room the parent gives — in a parent
    narrower than its width, the drawer and its rows are laid out at the room, labels cut with an ellipsis, and the width
    comes back with the room). A collapsible drawer
    folds to its column past halfway between its column and its least width, over its change of form's motion, and
    unfolds again past it; a drawer that cannot fold stops at its least width. While a drag lasts the document selects
    nothing and no iframe takes the pointer.
  - **Keys** on the handle: the arrow pointing away from the drawer widens it by 10, the other narrows it (never folding
    it); Shift, Page Up and Page Down by 100; Home and End give the least and the greatest width. On the column, the
    widening arrow, Home and End expand it.
  - **Enter, Space or a press without a drag**: a collapsible drawer folds to its column and unfolds at the person's
    width; another takes its default width (`container.width`) and then the width it had before.
  - New attributes `resizable` (on unless `"false"`), `width`, `min-width`, `max-width` and `resize-label` (the handle's
    name; empty names it by `label`). New event `widthchange` (`detail.width`), fired once when a person changes the width
    — after the drawer has set `width` — and never when the product sets it. `expandedchange` is also fired by the handle
    (a press, or a drag past the fold point). New part `resize-handle`.
  - The drawer stores nothing. A product that keeps a person's width keeps what `widthchange` carries and gives it back
    as `width` — and, in a page rendered before the element is defined, also as `--tanrei-navigation-drawer-width` on the
    element, which the drawer writes itself once defined and which the app shell's stylesheet reads for a drawer that is
    not defined yet. A drawer given a width draws it in its first frame; a width set afterwards moves over
    `motion.expand`.
  - Over the content (a modal drawer, the column and modal presentations of a responsive drawer) the drawer keeps
    `container.width`, whatever `width` says; the collapsed column keeps its own width.
  - In an app shell the main region takes the room that is left in every frame of a drag, with no motion of its own, and
    the shell keeps the place being read in the main content where it was. The shell remembers nothing of the width.
  
  **Handle: `reach`.** `<tanrei-handle reach="edge">` takes a press, shows its resize cursor and comes into sight along
  the whole length of the box its owner lays it out in (the edge of a pane), with its box and line drawn at the middle and
  its focus ring around the box. `reach="container"` (the default) is the handle as before. React `Handle` gets `reach`.
  New baselines: the Handle's `reach-edge` and the drawer's seven resized fixtures. No existing baseline changes.
  
  **Tokens.** Two new component tokens, `comp.navigation-drawer.container.min-width` (200, `dial.size.unit` × 50) and
  `comp.navigation-drawer.container.max-width` (400, × 100). A new invariant holds, in every density and every system:
  `collapsed.container.width` < `container.min-width` ≤ `container.width` ≤ `container.max-width` — an error, and a warning
  in a product layer.
  
  **Resizable frame**: its description no longer suggests wrapping a navigation drawer in it (the drawer has its own
  edge); its behaviour does not change.
  
  The navigation drawer's module grows by about 2.6 kB gzip (116,354 → 118,939 bytes, measured against main): the handle
  and the reckoning of drags, keys and the room its parent gives. Its bundle budget is raised from 118,800 to 124,900 bytes
  (measured + 5 %), as a person's control of the drawer's width is the point of this change. The Handle grows by 164 bytes
  (19,055), within its budget.
  
  The native platforms are paused and do not have this yet: their drawers stay as they were.
  
  New fixtures that need baselines: the Navigation drawer's `resized`, `resized-below-least`, `resized-collapsed`,
  `resized-modal`, `not-resizable`, `resized-rtl` and `responsive-wide-resized`, and the Handle's `reach-edge`.
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
- 14712cc: Popover: `trigger` chooses what opens it — one or more of `press` (the default), `hover` and `focus`, in any
  combination (`trigger="hover focus"` on the web). Hover is a mouse, a trackpad or a pen resting on the anchor, never
  touch; focus is keyboard focus resting on it. Both wait `showDelay` (`comp.popover.motion.show-delay`, 700 ms in the
  default system) before asking to open; a popover they open takes no focus, stays beside its anchor in every window,
  stays while the pointer is on the anchor, the gap or the popover or focus is in it, and asks to close once they have
  been gone for `hideDelay` (`comp.popover.motion.hide-delay`, 300 ms). Escape closes it wherever focus is (WCAG 1.4.13).
  With `press` as well, a press on the opener keeps a popover opened by hover open and moves focus in. New tokens:
  `comp.popover.motion.show-delay` and `comp.popover.motion.hide-delay`.
  
  **Breaking**: the popover now answers its opener's press itself. It asks with a new `toggle` event (`detail.open`,
  `detail.reason`: `press`, `hover`, `focus` or `leave`), and the product sets `open` to `detail.open`; `close` keeps its
  reasons. Remove the click handler that toggled `open` from the opener — kept, it would undo the popover's own request
  — and answer `toggle` instead (`onToggle` in React, `ontoggle="this.open = event.detail.open"` in markup). With
  `trigger` that has no `press`, the opener carries no `aria-haspopup`, `aria-expanded` or `aria-controls`.
- b8106ad: The presets' target sizes now follow their originals. **cupertino** takes Apple's figures: `sys.target.touch` 44 (iOS's default control size, 44×44pt, was 48), `sys.target.pointer` 28 (macOS's, 28×28pt, was 44), and `sys.target.minimum` stays 28, iOS's least control size and the height of its small controls; its 34 and 44 controls are unchanged. **m3-like** keeps 48 / 44 / 32, now checked against Material 3: 48dp for touch, 44dp for a pointer (a mouse or stylus), and 32dp, its extra-small button and chips, as the least drawn height. `dial.density` stays 1 in both.
  
  What breaks: under cupertino, what is taken from the touch or pointer target is smaller. Rows and items that are drawn as tall as the target are drawn at their own height under a fine pointer (radio buttons, radio groups and file items are shorter; app bar actions are 34 instead of 44), a floating toolbar's items move as far apart only as a 28 target needs, and the carousel's controls row is 44 instead of 48. The baselines under cupertino change for those fixtures; m3-like draws exactly as before.
- 93ff352: Rating, a new component: a score out of a few marks — stars by default — that a person gives, or a score already given
  (an average, a review's score), in whole marks or, where the product allows it, in halves.
  
  - Web: `<tanrei-rating>` (`value`, `max`, `allow-half`, `size`, `icon`, `label`, `option-labels`, `value-text`,
    `read-only`, `disabled`, `name`; `change` and `preview`); React: `Rating`. SwiftUI, Compose, Flutter and React Native
    are planned: their generated tokens carry `comp.rating`, and no component yet.
  - What it is to assistive technology follows the number of choices (WAI-ARIA APG): whole marks up to seven are a radio
    group with the radio group's keys; halves, or more than seven marks, a slider; read-only, one image named by `label`
    and described by `value-text`. A read-only rating shows halves whatever `allow-half` says.
  - No input takes a score back to none: a press on the score already given changes nothing. A product that needs it
    places a Button beside the rating.
  - New vocabulary: `comp.rating` — per size the mark (the icon sizes) and the round container behind it (28 / 32 / 40),
    the container's corner, and for each condition (unselected, selected) the container, mark and state-layer colors, and
    the motion of a state, a change of score and a press. The unselected mark is `sys.color.outline` (3:1 against the
    surface), the selected one `sys.color.primary`. The default system's rules keep the round state layer invisible when
    disabled, as the radio button's.
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
- 20f3d3a: Reduced motion can be set from inside the app. `<html data-tanrei-motion="reduce">` reduces motion in every component
  exactly as `prefers-reduced-motion: reduce` does: no movement, scaling or blur, a cross-fade over
  `sys.motion.role.reduced` in their place, and sizes that change at once — in the components' styles and in the motions
  they play from script (a carousel's autoplay, a marquee, a sheet's drag, a scroll). It is read as it changes, and it can
  only reduce motion: no value turns it back on where the person asked for less. `tokens.css` says either setting as one
  inherited value, `--tanrei-motion: reduce`, and the components read it with a style container query; a browser without
  style container queries follows the media query alone, and the attribute only for motion played from script.
  
  Nothing breaks: under the media query every component draws what it drew before. Inside the package each component's
  reduced rules are now written once, inside `reducedMotion()`, and a motion played from script asks `motionReduced()`
  or follows `watchMotionReduced()`, in place of the components' own media queries and `matchMedia` reads.
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
- bd5c612: Resolved token values for programs, and the browser's theme color.
  
  **`tanrei build`** writes `<id>.<scheme>.json` in the `tokens` output: every token of the system as one scheme draws it
  (`light`, `light-medium`, `light-high`, `dark`, `dark-medium`, `dark-high`), by its id, with no alias and no
  expression. A color is `#rrggbb` (`#rrggbbaa` when it is not opaque), a dimension or a duration one string with its
  unit. A canvas, a chart, a native app or a language model reads them without the token engine and without
  `getComputedStyle()`, which returns the `light-dark()` expression. The shipped systems' values are the resolved DTCG
  files in the repository's `design/tokens/`; `@tanrei/web` does not carry them (about 0.5 MB a scheme, in every install).
  
  **`@tanrei/web/systems/<id>.theme-color.json`** and **`themeColorMeta(colors)`** from `@tanrei/web/theme-script`: a
  system's surface in each scheme, and one `<meta name="theme-color">` per scheme with the media query that picks it
  (dark and light, each at more contrast too). Put the tags before `themeScript()`: the inline script and `saveTheme()`
  point them at a theme a person chose, so the browser's own interface follows it as well. `tanrei build` writes a
  product's `<id>.theme-color.json` in the `web` output.
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
- 265e59c: Size transition, a new component: a box around content whose size changes — a reply that grows by a line, a summary
  replaced by its full text, a status word that gets longer — that moves its own size to the content's new size as one
  motion, so that what follows it moves instead of jumping, while the edge it is anchored to stays still.
  
  - `axis`: `block` (the default), `inline` or `both`. `anchor`: `start` (the default: the first line never moves),
    `end` or `center`. `disabled` follows the content at once. `settle` arrives once per change, after its last frame,
    with the new width and height.
  - The time grows with the distance: `comp.size-transition.motion.duration` (`sys.motion.role.resize.default`, 300 ms)
    up to `motion.distance-step` (`sys.space.space800`, 64 px), `motion.duration-step` (`sys.motion.duration.short1`,
    50 ms) for each further step begun, never more than `motion.duration-max` (`sys.motion.role.resize.large`, 400 ms),
    on `sys.motion.easing.spatial`. `duration` sets one place's tempo, in milliseconds.
  - The first frame is drawn at rest; a change during a motion goes on from the size shown; a change of the window's
    size, the text size or the direction is made at once; a size transition whose content holds a moving one follows it;
    reduced motion makes every change at once. Nothing scrolls while it moves, and it exposes nothing to assistive
    technology.
  - Web: `<tanrei-size-transition>` (`SizeTransition` in React), alpha, with its baselines; SwiftUI, Compose, Flutter
    and React Native are planned.
  - Web, the size motion inside it (`AnimatedSize`): its duration may be a function of the distance the motion covers,
    and `fit()` may be told the size the last frame drew.
- d7cfdcf: Slider (and Slider field, and a Field around a Slider): the value indicator is drawn in the top layer (a manual
  popover placed against its handle), so an ancestor with `overflow: hidden` no longer clips it and a neighbour with a
  z-index no longer covers it (SLD-28). It follows its handle in the same frame through a drag, the value motion, a
  scroll and a resize; it is not drawn while its handle is hidden or scrolled out of sight, and is shown again above a
  dialog or popover the slider stands in that opened meanwhile. Its look is unchanged: the recorded fixtures compare
  equal. **Breaking**: the `value-indicator` part is now a popover with `position: fixed` and no `z-index` (a product
  that styled its position or level through `::part(value-indicator)` must drop that), and a `transform` on an ancestor
  no longer scales it, as no surface in the top layer is scaled.
- 8bc07c7: Snackbar: its bar appears as every surface does, and leaves the way it came. **Breaking** (a motion 0.1.0-next.0
  shipped): it no longer rises in from below by its own height plus its margin (or comes down from above at the top end),
  it no longer only fades as it closes, and under reduced motion it fades over `sys.motion.role.reduced` instead of over
  its enter and exit durations.
  
  - Shown by `<tanrei-snackbar-host>`, the bar starts from `sys.motion.appear.*` and grows from the middle of the window's
    edge it stands at: the bottom edge, or the top edge at `placement="top-end"`. Under the default system and cupertino
    (fade-scale) that is opacity 0 and scale 0.96. Under m3-like and m3-expressive-like (unfold) it unfolds from that
    edge at its full width, scaled from 0 along its height. Where an appearance gives a distance (fade-slide, blur-slide)
    it travels that far up into place at the bottom and down at the top end.
  - The timing is the snackbar's own, as before: `comp.snackbar.motion.enter-duration` and `-easing` in,
    `comp.snackbar.motion.exit-duration` and `-easing` out (m3-like keeps its 250 / 150 ms and its accelerating exit).
  - Closing takes the bar back the same way, and the next snackbar shows only once it has. Closed while it is still
    appearing, it turns round from where it is.
  - Where motion is reduced it only fades in and out, over `sys.motion.role.reduced` (100 ms), with no scale, distance or
    blur. A snackbar shown before the document is first painted is there at once.
  - Its layout is measured as laid out, not as drawn, so the action's own row (SNK-16), the expand button (SNK-23) and the
    expand motion (SNK-24) are the same while the bar appears as at rest.
  - What moves is the bar (the `container` part), not the `<tanrei-snackbar>` element. The `entering` and `leaving` classes
    on the element and the `snackbar-in`, `snackbar-in-top`, `snackbar-out` and `snackbar-fade-in` keyframes are gone. A
    snackbar drawn in place (outside a host) is unchanged: it is at rest and takes no motion.
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
- e265070: Split view (`<tanrei-split-view>`, React `SplitView`): a region divided into two panes, side by side (`axis`
  `horizontal`, the default) or one above the other (`vertical`), with a hairline between them and a Handle centred on
  it. Built from Handle, which does not change.
  
  - `primary` (`start` or `end`) names the pane that `value` measures and that folds away. `value` is its share of the
    region less the divider, in percent (50), held between `min` and `max` (10 and 90) and between `minSize` and
    `maxSize` in pixels (null: none); where the region is too small for both, the least wins, as `min-width` wins over
    `max-width` in CSS. A region that changes size keeps the share and counts the limits again.
  - The Handle is the window splitter pattern's separator: its value is the share in whole percent, its minimum 0 while
    the pane can fold, and it controls the primary pane (`aria-controls`). The arrow keys move the line the way they
    point (in right-to-left too) by `step` (5 % of the region, as react-resizable-panels counts it), Shift and Page Up and
    Page Down by `largeStep` (20 %); Home and End give the primary pane its least and its greatest share.
  - `collapsible`: Enter, Space or a press without a drag folds the primary pane away and brings it back where it was
    (`collapsed`), and a drag past half its least share folds it. A folded pane is inert and draws nothing; the line
    stands at the edge. Without `collapsible`, a press moves the line to `resetValue` (50) and the next press back, so two
    sizes are reached without a drag (WCAG 2.5.7).
  - A drag and a key are followed at once; a fold, a press and a share or a fold the product sets move by the resize
    roles, at once where reduced motion is asked for.
  - Events: `resize` in every frame of a drag, `change` once a person has changed the share, `toggle` once a person has
    folded or restored the pane, each with `{ value, collapsed }`; none for a value the product sets. While a drag lasts,
    no `<iframe>`, `<object>` or `<embed>` in either pane takes the pointer.
  
  New tokens `comp.split-view.*` (the divider's color and width; the resize and collapse durations and their curve, by
  role). No sys token is added. The web is the first platform; SwiftUI, Compose, Flutter and React Native are planned.
  New baselines: one per Split view fixture, and the `horizontal` fixture under each shipped preset. No existing baseline
  changes.
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
- af6b480: Table: `density` is gone; it takes `size` (`small`, `medium`; default `medium`) in its place. `regular` is `medium`
  and `compact` is `small`, with the same paddings and text styles: `<tanrei-table size="small">`. The system's density
  (`--tanrei-dial-density`) still moves the cells' block paddings at both sizes.
  
  A table without a `size` is drawn at the size its nearest container sets for what it holds (as a Button in a button
  group is), and at `medium` where none does; reading `size` then still gives `medium`. Setting it to any value, `medium`
  included, makes it its own; removing the attribute (or setting the property to `null`) gives it back. Without script,
  the stylesheet draws the size set on the element, as before. Its rows and cells are its own and all take its size; it
  passes none to what the product puts in its cells, its empty slot or its status line.
  
  A small row that holds a checkbox or a radio button, and a small header row that holds a sort button, are no longer
  lower than the pointer target for a fine pointer: they are drawn `sys.target.pointer` high, 36 in the default system
  where the small size alone gives 32 (44 under the m3-like preset, whose pointer target is 44). A small row that holds
  no control is as low as before. The fixtures `sortable-small`, `selection-small` and `data` draw these rows 4 px
  taller in the default system, which is the intended result, and their baselines move with it.
  
  The table's module now carries the size cascade: 26.7 kB gzip, within its budget of 27 kB.
  
  What broke:
  
  - The `density` attribute and property of `tanrei-table`, and the type `TanreiTableDensity` (now `TanreiTableSize`;
    the registry a design system augments is `TanreiTableSizeRegistry`). A table that sets no size reflects no `size`,
    and the React wrapper `Table` passes no default one.
  - The token ids `comp.table.{cell.padding-block, cell.padding-inline, cell.text.typescale,
    header.text.typescale}.{regular,compact}` are now `.medium` and `.small`, and so are their CSS custom properties
    (`--tanrei-comp-table-cell-padding-block-medium`, …) and the generated native token types. The axis is
    `comp.table.size`. A layer that pins one of the old ids, or adds a density, renames it.
  
  Fixtures renamed: `compact` is `small` and `compact-tokens` is `small-tokens` (picture unchanged), and
  `striped-compact-tokens` is `striped-small-tokens`, `sortable-compact` is `sortable-small` and `selection-compact` is
  `selection-small`. The two token fixtures and the `japanese` fixture name the new token ids and values in their cells,
  so their pictures change with their text.
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
- c749f65: **Tag group — a member that is added or removed fades, and a reordered member keeps its focus.** The members that
  change place still move there in one motion, on `tanrei.comp.tag-group.motion.move-duration` (the role
  `sys.motion.role.selection.travel`) and `move-easing` (`sys.motion.easing.spatial`), along a line and onto another line.
  Now a member the product adds fades in at its place over the same motion, and one it removes fades out where it was
  drawn while the others make room; a change that comes mid-fade goes on from the opacity drawn. An element given anew in
  place of a removed one that shows the same (same kind of member, same label) moves as that member, without a fade. A
  member moved to another place in the order is named in TGR-10: it travels there, and on the web it now keeps focus in
  Chromium too, which fires `focusout` while it removes the focused element. What the group exposes still changes at once.
  Where motion is reduced the members are placed at once and the fades stay; the first frames, an empty group's first
  member and its last one still come and go at once. Before, TGR-10 had an added member appear and a removed one leave at
  once. Resting pictures are unchanged: no baseline was re-recorded.
  
  **Breaking:** on the web, while a member fades out, the group puts the product's own element back where it stood, as
  its child, for the length of the fade — `inert`, `aria-hidden="true"` and `data-leaving`, absolutely placed — then
  removes it and gives back the `inert` and `aria-hidden` it had. A script that reads the group's children in that time
  sees it: select `:not([data-leaving])`. A test that counted the group's children in the frame after a member was
  removed now reads one more: filter, or wait for the motion to end.
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
- cbca9e1: Text input and select: `clearable` and `clearLabel`, as the combobox has them. With `clearable`, a single-line text
  input draws a clear button at its end, after the `trailing-icon` slot, while it holds a value; a press empties the value,
  emits `input` and — where the value changed since the input took focus — `change`, and leaves focus in the input (a
  pointer press never takes focus from it). A select draws its clear button before the chevron while a value is chosen; a
  press empties the value, emits `change` and gives focus back to the select, and an open list stays open. The button is a
  small icon-only text Button showing `close`, a focus stop after the control, named by `clearLabel` or the product's
  `clearLabel` word (`setWords({ clearLabel })`). Its room is kept while the value is empty, so the text, the chevron and a
  bare select's width do not move. In the select it stands after the `role="combobox"` element, never inside it. A
  multi-line text input, a date and a time draw none, and a debug build says so. The text field and the select field
  forward both props. New part `clear-button` on both elements; the text field and the select field export it.
  
  New tokens: `comp.text-input.container.action-gap` and `comp.select.container.action-gap`, the gap between the clear
  button and the next button of the box's own (the chevron, the picker button). Both follow
  `comp.combobox.container.action-gap` by default, so that the three boxes end alike. The vocabulary grows by these two; the native platforms gain the two tokens in their generated token sets
  and do not draw the clear button yet.
  
  New fixtures (`stacked-clearable`, `stacked-clearable-empty`, `outlined-clearable`, `stacked-clearable-rtl` of the text
  input; `stacked-clearable`, `stacked-clearable-empty`, `outlined-clearable`, `clearable-rtl` of the select) have new
  baselines. No existing picture changes: the text input's end buttons are laid out by one rule now, which draws the
  picker button where it was.
- a1657e3: Text input: a password field can show what was typed. With `revealable`, a `type="password"` input draws a reveal
  button at its end (after the clear button where there is one): a small icon-only text Button that is a toggle, showing
  `visibility` while the value is hidden and `visibility_off` while it is shown, named by `revealLabel` or the product's
  `revealLabel` word ("Show password" in the English pack) — one name in both states, `aria-pressed` saying which. A press
  shows the value as plain text and a second hides it; the value, the caret and the selection stay, no `input` or
  `change` is emitted, and focus does not move (a pointer press keeps it in the input, Enter and Space keep it on the
  button). It never submits a form. New prop `revealed` (reflected) and event `revealchange` (`detail.revealed`, type
  `TanreiTextInputRevealChangeDetail`). A shown value is hidden again, without the event, when its form is submitted or
  reset, when the type changes and when the field is disabled. `revealable` on any other type is ignored and reported in
  a debug build. The text field forwards the three props and the event, and reads `revealed` through from its input. New
  part `reveal-button`, exported by the text field. New word key `revealLabel`.
  
  New fixtures `stacked-password-revealable`, `stacked-password-revealed`, `stacked-password-revealable-clearable` and
  `outlined-password-revealable` have new baselines; no existing picture changes.
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
- 3327c3c: Table of contents and Description list: `density` is gone; each takes `size` (`small`, `medium`; default `medium`)
  in its place. `regular` is `medium` and `compact` is `small`, with the same heights, paddings, gaps and text styles:
  `<tanrei-table-of-contents size="small">`, `<tanrei-description-list size="small">`. The system's density
  (`--tanrei-dial-density`) still moves the row heights of the table of contents and the space between facts at both
  sizes. Timeline: `density` is gone with no replacement; the space between events is one token,
  `comp.timeline.item.gap` (16 in the default system), which the system's density moves.
  
  A table of contents or a description list without a `size` is drawn at the size its nearest container sets for what
  it holds (as a Button in a button group is), and at `medium` where none does; reading `size` then still gives
  `medium`. Setting it to any value, `medium` included, makes it its own; removing the attribute (or setting the property
  to `null`) gives it back. Without script, both stylesheets draw the size set on the element, as before. Neither passes
  its size on: a tag or a button in a description list's value keeps its own.
  
  A small table-of-contents row is no longer lower than the pointer target for a fine pointer: under a system whose
  `sys.target.pointer` is above its small row height (36 in the default system), the row is drawn that high, as a
  medium one is. The default system draws nothing differently: its pointer target is the minimum target, 36, which the
  small row is already held at.
  
  What broke:
  
  - The `density` attribute and property of `tanrei-table-of-contents` and `tanrei-description-list`, and the types
    `TanreiTableOfContentsDensity` and `TanreiDescriptionListDensity` (now `TanreiTableOfContentsSize`,
    `TanreiDescriptionListSize`; the registries a design system augments are `TanreiTableOfContentsSizeRegistry` and
    `TanreiDescriptionListSizeRegistry`). Neither reflects a `size` it did not set, and the React wrappers
    `TableOfContents` and `DescriptionList` pass no default one.
  - The timeline's `data-density` attribute: it is no longer read, and an unknown value is no longer reported.
  - The token ids `comp.table-of-contents.{row.height, row.padding-block}.{regular,compact}` and
    `comp.description-list.{fact.gap, term.gap, term.typescale, value.typescale, stat.value.typescale}.{regular,compact}`
    are now `.medium` and `.small`, and so are their CSS custom properties
    (`--tanrei-comp-table-of-contents-row-height-medium`, …) and the generated native token types. The axes are
    `comp.table-of-contents.size` and `comp.description-list.size`. `comp.timeline.item.gap.{regular,compact}` is
    `comp.timeline.item.gap`, and the timeline has no density axis. A layer that pins one of the old ids, or adds a
    density, renames it.
  
  Fixtures renamed, their pictures unchanged: in the table of contents `density-compact-nested`,
  `density-compact-three-levels`, `density-compact-current`, `density-compact-long-labels`, `density-compact-open` and
  `density-compact-rtl` are `size-small-…`; in the description list `inline-compact`, `stacked-compact`,
  `columns-compact` and `stat-compact` are `inline-small`, `stacked-small`, `columns-small` and `stat-small`. The
  timeline's `compact` fixture is removed, and `large-plan-compact` is `large-plan`, drawn with the one gap: its picture
  is new.
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
- 6805aba: Toolbar: a new `size` (`small`, `medium`, `large`). Set on the toolbar, it is the size of every Button and Button with
  menu in it that sets none of its own, in a group or not, and of its overflow button: `<tanrei-toolbar size="small">`.
  Only a size set on the toolbar is passed down; an item's own `size` always wins, `medium` included. The toolbar draws
  nothing of its own by it: an inline toolbar is still at least 40 high around small items (its container size is a
  minimum, as before), and its gaps keep the items' targets apart from the lengths they are drawn at, as they did for
  items that set their own size. A Select, Number input, Text input or Slider in a toolbar keeps its own size.
  
  The overflow button sets no size of its own any more: it is drawn at the toolbar's size, and at `medium` where none is
  set (as before). It no longer carries `size="medium"`.
  
  Button with menu and Copy button: one without a `size` is drawn at the size its nearest container sets — a toolbar's or
  a button group's — and at `medium` where none does; a size it does not have is taken as its nearest. Setting `size` to
  any value, `medium` included, makes it its own; removing the attribute (or setting the property to `null`) gives it
  back. Reading `size` while none is set still gives `medium`. A Copy button gives the size it is drawn at to the Button
  it is drawn by.
  
  What broke: a Button with menu and a Copy button that set no size no longer carry `size="medium"`, which they reflected
  from their default; a page's style or script that reads `[size='medium']` on one finds no attribute. The React
  wrappers of the two no longer pass a default `size`. The custom elements manifest no longer marks their `size` as
  reflected by Lit: the element writes the size set on it itself.
  
  New fixture: `toolbar/inline-small`. Nothing that was drawn before moves.
- ba45429: Toolbar: selection groups, fields, and items kept at the end while the items scroll.
  
  - A `<tanrei-toolbar-group>` takes `selection` (`none`, `single`, `multiple`), `value` and `values`. Its toggle Buttons, each with a `value`, become one choice (`single`, such as text alignment) or a set of choices (`multiple`, such as formatting). A group whose selection is single is a radio group and its toggles radio buttons; one whose selection is multiple keeps its toggles as toggle buttons. The arrow keys only move focus, and Space or Enter chooses, as in the WAI-ARIA toolbar pattern. The group fires one `change` for each choice, with `detail.value` and `detail.values`, and a toggle's own `change` stops at the group. Selection groups are for tools; switching views, or a choice of one among a few options that are not tools, stays with Tabs.
  - A horizontal toolbar takes `<tanrei-select>` and `<tanrei-number-input>` anywhere in its row, and one `<tanrei-text-input>` or `<tanrei-slider>` as its last item. A Select and a Number input are stops of the arrow keys and keep Up and Down Arrow; a Number input keeps Left and Right Arrow while they move its caret. The last Text input or Slider is a Tab stop of its own after the toolbar's and keeps every key. A field is never hidden into the overflow menu, and the overflow button stands before a last Text input or Slider. The toolbar gives a field no length: set one.
  - With `overflow="scroll"`, the items at the end of the row whose `toolbar-overflow` is `never`, and a last Text input or Slider, stay in place at the end edge while the items before them scroll.
  - Button: `value` is now a prop on every platform, not only the web's form value. It is never drawn or announced. A selection group reads it, and on the web a form is sent it with `name`, as before. A toggle that a group whose selection is single makes one of its choices is exposed as a radio button, checked or not, instead of a pressed toggle, and pressing it while it is checked keeps it checked and fires `click` alone.
  - React: `ToolbarGroup` gains `selection`, `value`, `values` and `onChange`.
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
- e60bcc3: Tree view and Accordion: `density` is gone; each takes `size` (`small`, `medium`; default `medium`) in its place.
  `regular` is `medium` and `compact` is `small`, with the same heights, paddings, text styles and glyphs:
  `<tanrei-tree-view size="small">`, `<tanrei-accordion size="small">`. The system's density (`--tanrei-dial-density`)
  still moves the heights of both sizes.
  
  A tree or an accordion without a `size` is drawn at the size its nearest container sets for what it holds (as a Button
  in a button group is), and at `medium` where none does; reading `size` then still gives `medium`. Setting it to any
  value, `medium` included, makes it its own; removing the attribute (or setting the property to `null`) gives it back.
  Without script, both stylesheets draw the size set on the element, as before. Neither passes its size on: an accordion
  in an accordion's item keeps its own.
  
  A small tree row is no longer lower than the pointer target for a fine pointer: under a system whose
  `sys.target.pointer` is above its small row height (36 in the default system), the row is drawn that high, as a
  medium one is. The default system draws nothing differently: its pointer target is the minimum target, 36, which the
  small row is already held at.
  
  The accordion's module now carries the size cascade (about 0.7 kB gzip), which it did not import before: 21.9 kB gzip
  alone, over its budget of 21.9 kB. Its budget is 23.1 kB (today's size and 5 %): taking a container's size is what
  the bytes buy, and it is the code every component that takes a size shares. The tree view already held the cascade
  through its Buttons and stays within its budget.
  
  What broke:
  
  - The `density` attribute and property of `tanrei-tree-view` and `tanrei-accordion`, and the types
    `TanreiTreeViewDensity` and `TanreiAccordionDensity` (now `TanreiTreeViewSize`, `TanreiAccordionSize`; the
    registries a design system augments are `TanreiTreeViewSizeRegistry` and `TanreiAccordionSizeRegistry`). A tree and
    an accordion that set no size reflect no `size`, and the React wrappers `TreeView` and `Accordion` pass no default
    one.
  - The token ids `comp.tree-view.{container.height, container.padding-block, container.padding-inline, container.gap,
    level.indent, label.typescale, icon.size, chevron.size}.{regular,compact}` and `comp.accordion.{container.height,
    container.padding-block, container.padding-inline, label.typescale, supporting-text.typescale,
    trailing-text.typescale, icon.size, chevron.size, content.padding-block-end}.{regular,compact}` are now `.medium` and
    `.small`, and so are their CSS custom properties (`--tanrei-comp-tree-view-container-height-medium`, …) and the
    generated native token types. The axes are `comp.tree-view.size` and `comp.accordion.size`. A layer that pins one of
    the old ids, or adds a density, renames it.
  
  Fixtures renamed, their pictures unchanged: in the tree view `compact` is `small`, `compact-guides` is `small-guides`,
  `chevron-none-compact` is `chevron-none-small`, `single-compact` is `single-small`, `all-parts-compact` is
  `all-parts-small` and `rtl-guides-compact` is `rtl-guides-small`; in the accordion `compact` is `small`,
  `compact-outlined` is `small-outlined`, `compact-outlined-gap` is `small-outlined-gap` and `all-parts-compact` is
  `all-parts-small`.
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
- 09f8ab7: A menu, or a docked date-time picker, whose anchor is taken out of the page before the first frame after it opened now
  closes with the reason `anchor-hidden`, as MNU-65 and DTM-51 say. The follower that tells it its anchor went learned
  which anchor it stood against only in that first frame, so an anchor removed sooner was found by its id no longer and
  by nothing else: the surface stayed open with nothing beside it. `FollowController.start()` now remembers the anchor
  it starts from.
- f51b33f: A surface placed against its anchor now stands at its anchor when an ancestor sets CSS `zoom`. The top layer takes the
  zoom of the surface's ancestors, so the surface was drawn larger and its `top` and `left` were drawn at the zoom too: a
  tooltip whose anchor stood at (280, 320) inside a `zoom: 2` box was drawn near (500, 520). The popover, the select's and
  the combobox's lists, the tooltip, the menu and its submenus, the docked date-time picker, the search's docked view and
  the FAB menu's items are now placed in the window's pixels: each stands against its anchor as it does with no zoom, its
  offset, its window margin and its arrow drawn at the zoom, and still inside the window. A full-width row of actions (a button
  group's, and a popover's, a dialog's, a side sheet's or a date-time picker's) is measured in its own pixels, so a zoom
  no longer widens the surface or stacks actions that fit in a row. The slider's
  value indicator, which already did this, now uses the same shared measure. Nothing changes without a zoom.
- 69afca4: A box whose size follows its content (the chat composer's strip, Field, Callout, File upload, Number ticker, Resizable
  frame, Split view) starts its motion in the first frame drawn after the change, in every engine. WebKit dated it from
  the frame drawn before the task that changed the content, so where that task took longer than the motion (a chat
  composer adding a file on a loaded machine) the box jumped to its new size with no frame of the motion.
- 1ade52d: **App bar: the page does not move when the bar is defined late.** A new stylesheet, `@tanrei/web/app-bar.css` (also in
  `tanrei.css`), gives a `<tanrei-app-bar>` that is not defined yet the block size it will have: the top inset, a top row
  of `container.height.small` (or an item's cell, where that is higher), and for a large bar that will be drawn expanded
  its title row as well — taller where its title and subtitle need it. It fills the bar with its condition's container
  color and shows nothing of what its slots hold until the element draws them. Before, an undefined bar was a line of
  glyph names, 22 px high, and grew to 64 px when it was defined: a layout shift of about 0.02 on a page that loads the
  bar's script late. Load the stylesheet beside the tokens; nothing else changes.
- 2f35840: App shell: the resize handle of a navigation drawer no longer covers the start of the main content. The handle's
  target lies wholly beside the drawer's end edge and is a pointer target wide (`sys.target.pointer`, or
  `sys.target.touch` for a coarse pointer): 36 in the default system. The expanded gutter is 32, so the target reached
  4 into the main content, and a press there went to the handle instead of the content.
  
  While the navigation region holds a drawer that draws its resize handle, the shell now insets the content of the main
  region, and of an aside stacked in its column, from the start by the greater of the gutter and the handle's target.
  Under the default system a full-width main region beside a resizable drawer moves its content 4 toward the end in an
  expanded window. A contained one wide enough to be centred does not move. A drawer with `resizable="false"`, a modal
  drawer and a frame with no drawer keep the gutter alone. Before the drawer is defined, `app-shell.css` reads the same
  from its attributes, so loading it moves nothing.
  
  The drawer shows that it draws its handle with a new state attribute, `data-resize`.
- e8bf9cb: App shell: a page that gives a navigation drawer back folded or at a stored width no longer shifts when the drawer
  loads. Before the drawer was defined, `app-shell.css` gave it its full default width in an expanded window even when
  the page wrote `expanded="false"`, so the main region jumped when the drawer folded itself. In an expanded window the
  stylesheet now gives a drawer that is not defined yet the place it will have:
  
  - a collapsible drawer written `expanded="false"`, or a collapsible modal drawer: its collapsed column, at the
    compact width with `density="compact"`;
  - a responsive drawer that is not collapsible, written `expanded="false"`: no space;
  - a drawer at a stored width: that width, held between `container.min-width` and `container.max-width`, as before.
    Write the width as `--tanrei-navigation-drawer-width` on the element as well as in `width`.
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
- a22289a: App shell: with `scroll="main"`, a navigation drawer's resize handle now stands beside the drawer's end edge again, so
  a person can drag it. The drawer places its handle from its own box, and the shell's rule for this scroll made the
  navigation `position: static`. A page's rule outweighs the drawer's own `position`, so the handle was placed from the
  frame's box instead and stood past the window's end edge. No drag could begin, and a pointer could not reach the
  handle. The navigation is now `position: relative` there. It is still not sticky, and its layout is unchanged.
- 1b6a2cc: App shell: the navigation leaves room for the main region and the aside. The navigation was held to the window less
  a touch target, but nothing kept room for the aside or for the main region's own insets. A navigation drawer at its
  greatest width (a drag to the window's edge, End on its resize handle, or a least width wider than the window) pushed
  the aside, and the main region's insets, past the window: at 1280 with an aside the document was 1484 wide and the
  main region had no room at all. Without an aside, the page still scrolled sideways by the main region's insets.
  
  The navigation is now never wider than the window less the main region's least width (its start and end insets and
  a touch target between them) and less the aside where it stands beside the main region (APS-5, NVD-97): 936 at 1280
  beside a 240-wide aside, and 1176 with no aside. The page is no wider than the window, in either direction (WCAG 1.4.10).
  A navigation drawer reads this as the room its parent gives it, so a drag, a key and a width the product gives all
  stop there, and its handle reports it as its greatest value. A standard side sheet in the aside is measured as it
  slides, so the drawer narrows and widens in step with it. The aside keeps its place and width: in an expanded window
  it stays beside the main region, as the window's class decides (APS-9), and the navigation gives way.
  
  The `all` bundle's budget goes from 668100 to 668300 bytes gzip. It was 668221 with this change, and within 668100
  without it. The app shell itself went from 17.7 to 17.9 kB, well inside its own budget of 18.1 kB. The bytes are the
  side sheet's measurement and the stylesheet's room rule, which keep the page from scrolling sideways.
- f6a47af: Popover, Select and Combobox: where `sys.motion.appear.blur` is 0 — every shipped system — the surface that appears
  has no filter, closed or open, and no transition of `filter` runs as it opens and closes (it went from `blur(0px)` to
  `none`, which draws nothing). In WebKit on Linux a running transition of `filter` crashes or stalls the page. A blur a
  layer sets is drawn and moves as before.
- 6f7bedc: Every surface that appears — Popover, Select, Combobox, Tooltip, Dialog, Image Preview and the Date Time Picker's
  modal: where `sys.motion.appear.distance` is 0 — every shipped system — the surface has no `translate`, closed or
  open, and no transition of `translate` runs as it opens and closes (it went from `0px 0px` to `none`, which moves
  nothing, and WebKit ran it beside the fade and the scale, with its `transitionrun` and `transitionend` events). A
  distance a layer sets moves the surface as before. A browser without style container queries still runs that
  transition, which draws nothing. Nothing is drawn differently.
- 2b1b8a9: Badge: a badge with no anchor (nothing in its slot) now draws nothing, takes no space and says nothing, and a debug
  build reports it. Before, it drew its dot or pill hanging off an empty box, over whatever came next. Given an anchor
  later, it draws on it and describes it at once; when its anchor is taken away, the anchor gets its own description
  back. A badge on an anchor is unchanged.
  
  Navigation drawer: the trailing slot of a destination and of a group no longer suggests a badge. A count at the end of
  a row is the row's `trailing-text`, read with the row; a badge marks the icon (`badge`).
- d354925: Bottom sheet: a modal sheet mounted with `open` after the document's first paint — a view a product draws in answer to
  a click — slides up over its fading scrim, as a dialog, a popover or a menu mounted open does (MOT-4). Written open in
  the page's markup it is still there in the first frame without its motion, and a standard sheet, a layout region, still
  takes its place at once either way.
- 320f78b: Button: a change of `disabled` is drawn in one update instead of two. The `disabled` attribute that reflects the
  property brings a word from the platform after the update that drew the change, and the button used to draw itself
  again for it although nothing it draws had changed. It now draws again only for a word that changes what it draws: a
  disabled fieldset around it, disabled or enabled.
- 8108674: Text input, Number input, Search, Combobox, Color input and every other component that edits text in a native
  element: an input method's composition that ends with the value as it began (cancelled with Escape, say, or one that
  committed nothing) no longer emits an `input` as it ends. The component used to send one with the unchanged value
  whenever the browser sent none after `compositionend`, and Firefox's own `input` after the end reached the page too.
  Both are gone now, because no value changed (TXI-1, TXI-4). A committed composition still ends with exactly one
  `input` that is not composing. Where the last `input` during the composition reported a value the field no longer
  holds (the limit cut the commit back to where it began), one `input` reports the value again.
  
  Search and Combobox had their own check for this, used only when the view or the list closed between the end of a
  composition and that `input`. It is gone, because the shared rule now covers it. Combobox: a composition that
  inserted nothing in a field the person had not edited yet no longer opens the list. `NativeTextController` takes a
  `reported` option (the value the component's `input` reports, where the element shows a suggestion or a completion
  in its place), and its `settled` hook now receives whether an `input` closes the composition.
- 6645c5b: Carousel: the browser's momentum no longer takes over a touch release's settle on a busy page. The row is held from
  the lift, but a browser stops its own momentum only once it has the held row's style, a frame or more later when the
  main thread is busy. Until then the momentum kept scrolling the row, and the carousel took that scroll for the person's:
  it gave up the settle and settled again from wherever the momentum had carried the row, one item past the one the
  finger stopped on, or one item back after a drag back. A release's settle now holds the row to the end of its motion
  and replaces any scroll that comes during it. The person cannot pan a held row, and a new touch, the wheel or a mouse
  press still stop the settle at once.
- 8c108d1: Carousel: a move by the keys, a dot, the previous and next controls, a settle or an advance now always ends on the
  resting position itself. The last frame of the motion wrote the curve's value there, and WebKit can call a motion
  finished while its progress is still a hair under 1 (0.9999999999999999). It also keeps whole scroll offsets, so the
  row could come to rest a pixel short of its resting position (415 for 416) and stay there. It depended on the frame
  times, so it showed now and then. The last frame now writes the resting position's offset.
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
- 37da571: Chat composer: composers share their stylesheets. Each composer used to adopt a stylesheet of its own to draw the
  capsule's corners and the groups' least height from the line height it measures, so a page with 100 composers held
  99 more sheets than a page with one. The rules for a measured line are now one stylesheet per line height, shared by
  every composer that measured it; the composer still writes no custom property. Nothing drawn changes.
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
- 39cfd08: Navigation drawer: as a collapsible modal drawer closes, the focused destination's color moves with its width (NVD-35,
  NVD-40). Focus left the panel before the change of form's motion was in force, so in Chromium the selected destination's
  focused color went back over the state motion, ahead of the width (half its way while the width had gone a quarter of
  its own); it now takes the change of form's duration and easing, in step with the width, in every engine.
- 8104798: Navigation drawer: focus no longer moves on its way through a collapsible modal drawer's opening and closing (NVD-19,
  NVD-22, NVD-35, NVD-37, NVD-40).
  
  - A pointer's press on the menu button of the open drawer moves no focus before the drawer closes. The press gave focus
    to the button (Chromium, Firefox) or to the dialog itself (WebKit), so the focused destination lost its focused color
    over the state motion before the drawer began to narrow, out of step with its width. Focus now stays where it is until
    the close is under way, and then goes back to the menu button with no focus indicator, as the press gave it before.
  - Opened by the product while the selected destination in its column has focus, the drawer keeps focus there as it
    widens and as it narrows back. Before, the engines gave focus to the menu button (Chromium) or to the dialog (Firefox,
    WebKit) as the dialog was shown, and back. In WebKit the destination's focused color dropped at once in the first
    frame and climbed back over the widening. In Chromium the destination and the menu button each began a motion that
    ended in no time. Closing, focus left the destination and came back to it.
  
  `openModal()` (the primitive every modal surface opens with) takes `keep`: an element inside the dialog that already
  has focus as it opens, and keeps it.
- c7b509e: Navigation drawer: a collapsible modal drawer narrowing back to its column is exposed as its column is (NVD-23,
  NVD-40). From the moment it closed until the column took its place, its closed `<dialog>` was still exposed as a dialog
  named by the drawer's label, around the navigation landmark; while it narrows the dialog now takes the landmark's role
  and name (`role="navigation"`, its inner `<nav>` `role="none"`) and is not focusable itself, so assistive technology
  meets the navigation landmark and its destinations, as in the column, and no dialog. Opened again while it narrows, it
  is the modal dialog again.
- d5d3e8f: Navigation drawer: a collapsible modal drawer is no longer modal from the moment it closes (NVD-22, NVD-40, MDL-5). It
  narrowed back to its column while it was still a modal dialog, so the page behind stayed inert, held from scrolling and
  from the pointer, and focus went back only when the column took the dialog's place at the end of the motion. It now
  closes with `closeModal()`: focus goes back at once — to its menu button, slotted in the narrowing panel, or to whatever
  had focus when it opened — the page takes focus, the pointer and the wheel again, and the panel narrows and its scrim
  fades in the top layer as before, the column then drawn as its last frame was. Where motion is reduced it is its column
  again at once. Opened again while it narrows, it turns back from where it is. `closeModal()` takes two new options for
  such a surface: `interactive` (it takes focus and the pointer while it leaves; only its scrim takes none) and `moves`
  (what its exit moves besides what an appearance moves, held as shown where it changes hands); `openModal()` takes
  `moves` too. A leaving dialog's scrim no longer takes the pointer (`modalExitStyles()`).
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
- 2cc506b: Search and Combobox: a view or list that closes between the end of an input method's composition and the `input`
  that closes the composition now stays closed. That `input` arrives in a later task, so an Escape pressed in the gap
  (or the product closing the view) was followed by the view opening again and an `input` that changed nothing. Now
  that `input` opens nothing, and it is emitted only where the composition changed the value or the text. What the
  person types next opens the view as before.
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
- ede88e8: In Firefox, a wheel at the end of a box that scrolls inside a component no longer scrolls the page behind it. Firefox
  keeps to `overscroll-behavior: contain` only within one wheel transaction, which a wheel that scrolls nothing neither
  begins nor prolongs: a wheel at an end the box already stood at, or one 1.5 s after the last that scrolled it, went to
  the page. Each of these boxes now cancels a wheel turned toward the end it stands at, along the axis it scrolls: the
  menu's items, the select's and the combobox's list, the popover's content, the search's docked view, the calendar's
  year view, a row or a column of tabs, a toolbar that scrolls, the carousel's row, a compact table of contents, an
  expanded snackbar's text, a docked date-time picker's body, a standard side sheet's and bottom sheet's content, and the
  app shell's navigation and aside (as the navigation drawer's items already did). A wheel with Ctrl, one across the
  axis the box scrolls, and one that the box or a scroller inside it can still take go on as before. Chromium and Safari
  already kept the page still, and nothing changes there.
  
  The navigation drawer's items no longer cancel a wheel turned more sideways than down at their end.
- 0d23356: **English names the Control key in full.** The English docs, the specs and the web package's API descriptions write
  `Control` where they tell a reader which key to press (`Control+Enter or Command+Enter`, `Control+A`, a wheel with
  Control), as Google's and Apple's style guides spell the modifiers out and as the platform's keyboard shortcut property
  writes them; they wrote `Ctrl`. The glossary's "Key names" table says so. `Ctrl` stays where a page quotes the legend
  the Keyboard shortcut draws on a key (`Ctrl+Shift+K` beside `⇧⌘K`), and the translations keep `Ctrl`, as their keyboards
  print it. Only words change; no behaviour does.
- dcc5d30: Date-time picker: a docked picker written open in the page's markup is there in the document's first frame instead of
  growing in as the page loads (MOT-4); mounted open after the first paint it still grows in from its anchor.
- 99de42c: Date-time picker: in the dial mode, the minute selector that typing on the hour selector moves focus to now shows its
  focus indicator in every browser (DTM-22, DTM-28), as the minute wheel does in the wheels mode (DTM-20). The picker
  gave it the indicator only where the hour selector matched `:focus-visible`, and whether a key pressed after a
  pointer's press makes it match is each browser's own call: Chrome and Safari said yes, Firefox no, so after a press on
  the hour selector and two digits Firefox showed no indicator on the minute selector. The spec now says that focus is
  keyboard focus.
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
- 84946fb: In Safari, the colors that closing a dialog changes now move over their motion however long the closing task takes:
  those of the element focus leaves inside the dialog, and those of the opener focus goes back to. WebKit dated that change
  from the frame drawn before the closing task, and where the task took longer than the change lasts it was drawn over at
  once, with no frame of it. Closing now starts them from the first frame drawn after the task, as opening already did
  (`statesFromNextFrame`). Nothing changes in Chromium and Firefox, which already start these motions in the next frame.
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
- 11963f3: Navigation drawer: three motions that could be drawn at once now play from their first frame. A modal drawer that opens
  starts the menu button's change of colors (it loses focus) in the first frame drawn after the opening, with the drawer's
  slide; WebKit dated it from the frame before, so on a loaded machine the button could take its new colors before the
  drawer's first frame. A drawer held below an app shell's header that moves to a new presentation starts its panel's and
  its scrim's move in the first frame drawn after the change; WebKit drew the panel in its new place at once where the
  change's task outlasted the move. A standard drawer opened or closed in the frames just after its room changed (or after
  a key's step on its resize handle) slides by its motion, where it was drawn opened or gone at once.
- 3132a46: Navigation drawer: a modal drawer now always leaves a strip of scrim you can press to close it, however narrow the
  window. Over the content the drawer stays `container.width` wide (240 in the default system), but it never comes closer
  to the window's end edge than `sys.target.touch`, and that limit includes its start inset. The scrim is the press target
  that closes the drawer, and it now stays at least a touch target wide (WCAG 2.5.8). A modal side sheet keeps the same
  distance, and an app shell keeps it beside its navigation. Before, the drawer was limited only by the window's full
  width, so in a window narrower than 240 plus the touch target the strip shrank and then disappeared.
  
  The limit applies to a drawer that slides in, to a collapsible drawer that widens from its column, and to a drawer an app
  shell holds below its header. It follows the window as the window resizes. Each row is laid out at the narrower width.
  The slide still starts and ends wholly off-screen.
  
  A collapsed drawer whose parent is narrower than its column (72 in the default system) now takes the parent's width. Its
  icons stay where they are, the overflow is cut at its end edge, and its edge line is drawn there. This applies to a
  standard drawer and to a collapsible modal drawer's column. Before, a standard drawer was cut at its start edge, which
  hid its icons, and a collapsible modal drawer's column reached past its parent. Opened from there, the column widens
  from the width it is drawn at.
  
  No baseline changes: every fixture's window is wide enough that the limit leaves `container.width` whole.
- b8bdb5f: Navigation drawer: a modal drawer written open now moves focus to its selected destination (or else its first
  focusable element) when it is inserted into a page that is already drawn, as it does when it is mounted with the page.
  Inserted together with its items, the drawer was shown before the items had drawn their cells, so focus stayed on the
  drawer's dialog. Focus now moves once the items have drawn, in the same task, before the drawer's first frame. Items
  that arrive after the drawer is shown take the focus it could not give, while focus is still on the drawer's panel:
  items the product adds later, or items the browser has not yet parsed.
  
  The byte budget of `@tanrei/web/all` goes from 666900 to 667200 bytes gzip (667148 measured; 281 more than before this
  change): the drawer waits for its items' first render, owes focus to items that arrive later, and holds it on its panel
  while the document is parsed — the focus a modal drawer gives as it opens, wherever it is inserted. The three share one
  path (28 bytes less than written apart). The navigation drawer's own bundle grows by 272 bytes and stays within its
  budget.
- 7e694f4: Navigation drawer: keyboard focus on a collapsed cell that the browser scrolls into view shows its name also when the
  cell's box first only touches the window's edge. The name opened at that moment, was counted out of sight by the
  tooltip and closed at once, and was not opened again (NVD-56).
- a3f8151: Navigation drawer: keyboard focus on a collapsed cell that lies outside the window shows its name once the browser has
  brought the cell into view. The name was opened one frame after the focus, and where the browser scrolled the cell in
  later than that (WebKit, sometimes; any page that scrolls smoothly) the tooltip opened against an anchor out of sight,
  closed itself at once and was not shown at all (NVD-56).
- cdaabaa: Navigation drawer: in Chrome and Edge before 145 and Safari before 18.4, closing an open collapsible modal drawer with a
  pointer's press on its menu button no longer draws a focus indicator on the button (NVD-22, NVD-37). Those browsers do
  not know `focus()`'s `focusVisible` option, so the focus given back after the press was drawn as a script's focus, with
  the indicator, after a drawer opened from the keyboard. There the press now gives focus itself, as the browser does,
  with no indicator; browsers that know the option are unchanged.
  
  `hasFocusVisibleOption()` (a primitive) says whether the browser's `focus()` reads the option.
- c8f2fae: Navigation drawer and search: written open in the page's markup, a modal drawer and the search's dialog and
  full-screen views appear at once, with no motion (MOT-4), as the other modal surfaces do. The modal drawer slid in and
  its scrim faded in over the first frames, and the search's view and its scrim faded in, in every engine. The drawer is
  now drawn at once when it opens before the document's first paint; the search opens its view with `openModal()`, whose
  entrance, opened later, begins in the first frame drawn after the opening task as the other modal surfaces' does.
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
- 32c4e10: The FAB menu's toggle now turns, and its first item takes its focused colors, over their motions in Safari however long
  opening the menu takes. WebKit dates a transition begun in a task from the frame drawn before that task, so where opening
  took longer than those motions last (the default system in right-to-left took about 200 ms on a four-CPU Linux machine,
  against a state motion of 250 ms) the toggle was drawn turned and the first item focused at once, with no frame of
  either. The motions the open and the closed state begin now start in the first frame drawn after that task, as the
  items' own appearance already did. Nothing changes where opening is quick, or in Chromium and Firefox.
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
- 910c7b6: Pagination, calendar and date-time picker: in Chrome and Edge before 145 and Safari before 18.4, focus that moves after
  a pointer's press no longer shows a focus indicator (PGN-14, PGN-19, CAL-7, CAL-15, CAL-19, DTM-3, DTM-28). Those
  browsers do not know `focus()`'s `focusVisible` option and drew that focus as the last one was drawn, so after keyboard
  focus the indicator moved on with it:
  
  - Pagination: pressing the control that has keyboard focus (next on the second-to-last page) put focus on the page now
    current with the indicator. There the press now takes the focus itself first, as a pointer's.
  - Calendar: pressing a neighbouring month's day while a day had keyboard focus, or pressing the year that had keyboard
    focus, put focus on the new active day with the indicator. There the press now gives focus as the browser does.
  - Date-time picker: a modal picker opened by a pointer's press showed the indicator on the day, the year or the selector
    it focused in Chrome and Edge before 145. There the focus the dialog gives is now kept as the browser drew it.
  
  Safari before 18.4 still shows the indicator on a modal picker opened by a press, as it does on the focus of any modal
  dialog it opens, and after a press on a pagination's link, which takes no focus from a press there.
  
  In every browser, a modal date-time picker opened from the keyboard now shows the indicator on the focus it moves in:
  whether the picker was opened from the keyboard was read after the dialog had taken focus from its opener, so it never
  was. Browsers that know the option are otherwise unchanged.
  
  `pressGivesFocus()` (a primitive): where `focus()` does not read `focusVisible`, a press on the element that has
  keyboard focus lets that focus go, so that the press gives it again as a pointer's.
- aa194f8: An open overlay that follows its anchor (a tooltip, a menu and its submenus, a FAB menu, a search view, a docked
  date-time picker, a popover, a select's or a combobox's list) no longer runs its placement check in every frame while
  nothing moves. The follower compared a size the ResizeObserver reported with one read by `getBoundingClientRect()`,
  which gives the box after its transform and, in Firefox, at another precision, so each report after observing again
  counted as a change. An open plain tooltip in Firefox was checked 60 times a second for as long as it was open, as was,
  in every engine, an overlay whose surface a page drew with a transform; and a menu's surface was checked in every frame
  of its entrance, whose scale it read as a size. Sizes are now compared only with sizes the observer reported, and a followed element
  that did not move keeps its place observer instead of having it set again.
- 14aff2c: Form-associated elements other than the Button: the platform's word that the element is disabled no longer draws it
  a second time. They read a fieldset's part of their disabled state from the platform where they render (`:disabled`,
  less their own attribute), and draw again only when the platform's word changes what was drawn, so the word for their
  own reflected `disabled` attribute draws nothing. A change of `disabled` — their own, or a fieldset's around them — is
  now drawn in one update instead of two by the text, number, color and one-time-code inputs and fields, the select and
  select field, the combobox and combobox field, the chip field, the embedded text input, the chat composer, the search,
  the file upload, the checkbox, the checkbox group, the switch, the slider, the slider field and the rating; the radio
  button and the radio group drew three times for some changes and now draw at most twice. A select and a combobox no longer read their
  options again when an attribute of their own changes.
- e0eaa64: A glyph of the icon set that becomes drawable — its face has loaded, after the element that draws it has settled on a
  page loaded cold — now starts no transition. The check of a select's, a combobox's or a menu's chosen option fades its
  `visibility` and `opacity` in and out, and when the face arrived it started a `visibility` transition from the hidden
  mark it had never shown (it was then finished at once, so nothing was seen to move, but a motion was begun). The glyph
  and what is in it are now marked drawn with no transition.
- 61cebf8: Components that draw glyphs of the icon set (checkbox, switch, menu, snackbar, copy button and the others that wait
  for the icon font before drawing a glyph) cost a page less work. The page's fonts are listened to once, not twice for
  each instance: a page of 1,000 checkboxes had 2,000 listeners and now has 2. A change of state that keeps a glyph's
  name and family (checking a checkbox, turning a switch on) no longer reads the layout: toggling 1,000 checkboxes read
  it 4,000 times and now reads it 0 times. A text face that finishes loading no longer has every glyph measured again;
  only a face of a family a glyph is drawn in does. What is drawn, and when, is unchanged: a glyph still appears in the
  first frame its font can draw it, and nothing is drawn in its place while it cannot.
- 7a1eb3e: An accordion and a tree view built many at a time while the icon set's face is not there yet (still loading, or never
  made available) no longer lay the page out once each. Each measured the name of its glyph in the icon family in its own
  update, and a hundred of them laid the page out a hundred times; they now look up the family and measure the name with
  every other one of the task, after all of their renders — once for all of them. The accordion now shares the tree
  view's (and the table's) way of telling whether the icon set can draw. A tree view also looks for the scrolling box it
  stands in (for its sticky parents) with the others, after their renders, and looks for it at the end of a filter only
  when there is a row to keep in place. Nothing drawn changes.
- f4248ab: Text field (multi-line, auto-resized), embedded text input and chat composer: a letter typed while the height still
  moves after a line break no longer cuts the motion off. Until now the height jumped to its end in one frame whenever a
  change arrived during the motion — which, at a normal typing speed, is almost every line break followed by a letter.
  The change replaced the running motion with one from the height then shown, as it should, but the replaced motion's
  cancellation is reported a frame later, and that report was taken for the end of the new motion. A report of a motion
  that was replaced now ends nothing; the height goes on along its curve to the end height. Nothing else changes: no
  baseline moves.
- 629730e: In Chrome and Edge, the marquee text's passes and the carousel's autoplay progress now always go on after a hold ends.
  Two holds in a row could stop them for good. In the first, the motion starts or goes on and is held again in a later
  task, before a frame is drawn. In the second, it is let go while a frame is drawn: the pointer leaving, which Chromium
  sends then, or a product moving focus from a frame callback or a resize observer. Played with `play()` there, the
  motion never got a start time from Chromium. The marquee's text stood still while its fade went on. The carousel's
  current dot stopped filling where the clock had stopped and did not move again until the row moved on, if the clock
  had counted no time between the start and the hold. Both are now played on from the frame being drawn, from where they
  were held, which the shared `playFromThisFrame` does for every motion a component holds and plays on. Firefox and
  Safari were not affected.
- f778ab4: In Safari, the colors that closing an image preview changes now move over their motion however long the closing task
  takes: those of the element focus leaves inside the preview, and those of the opener focus goes back to. WebKit dated
  that change from the frame drawn before the closing task, and where the task took longer than the change lasts it was
  drawn over at once, with no frame of it. Closing now starts them from the first frame drawn after the task, as opening
  already did (`statesFromNextFrame`). Nothing changes in Chromium and Firefox.
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
- 3df6fcc: List: an item named by the text of its content is drawn in one update when it is built instead of two. Its content's
  first `slotchange` used to draw it again although its first update had already read that content. It is still drawn
  again when its content changes what it draws: its name, its description, or the name of its handle.
- 61c31a6: Fewer forced style and layout passes when many carousels, steppers, paginations, segmented buttons or number tickers
  are built at once. Each of them measured in its own update — the carousel its tokens, its width, its direction and its
  scroll offset; the stepper and the pagination whether their full form fits; the segmented button whether its size draws
  a check — and had the browser style and lay out the page for it there, once for each instance and more. They now read
  after the renders of the task, together with every other component's, and write after all of them; the carousel then
  scrolls every row once all their tracks are laid out. One resize observer watches every instance of each of the four,
  so a window resized under a hundred of them is read in one pass too. A carousel reads its autoplay interval only where
  its progress fill is drawn, and a number ticker reads its animation, and the motions to stop, only when it changes from
  a number it drew. A hundred of any of them now cost the passes ten do. Nothing drawn changes.
- ad6f7bd: Fewer forced style and layout passes when many chat composers, embedded text inputs or date and time pickers are built
  at once. A multiline embedded text input measured the lines of its text in its own update — its line, its width, then
  the height its text needs — and had the browser style and lay out the page three times for it, once per instance; the
  chat composer then measured its line and its width the same way. Both now read after the renders of the task, together
  with every other component's, and write after all of them: a text area's height is measured in two steps, every text
  area of the task given no height at once while its box keeps the height it has, so nothing around it moves. A picker
  decided its layout, its actions' row and the room they leave in a chain of reads and writes in its own update, and did
  it again in the update that lets its dial handle move with motion a frame after it opened; it now takes each step with
  every other picker's, and that update arranges nothing. One resize observer watches every instance of each of the
  three, so a window resized under a hundred of them is read in one pass too. A hundred chat composers now cost the
  passes ten do; a hundred pickers opened at once still pay, each, for being shown modally and for starting their
  entrance. Nothing drawn changes.
- 16c656e: A menu and a list cost the same for each item at 1,000 items as at 100. Each item tells its menu or list when a prop the
  container reads changes, and the container re-read every item each time — so building N items, or changing N labels at
  once, did O(N²) work: about 7.6 s to build a menu of 1,000 items and 1.5 s for a list, in Chromium. The container now
  re-reads its items once per turn, in a microtask before the next frame, however many of them changed in it (and at
  once, before it handles a key, a press or focus). A menu of 1,000 items builds in about 0.2 s, a list in about 0.13 s;
  every frame draws the items as before.
  
  Debug builds count each re-read on `globalThis.__tanreiCounts` (`menu.sync`, `list.sync`), for the performance tests; a
  production build counts nothing. No baseline changes.
- aba6c70: In Safari, the colors that closing a menu changes now move over their motion however long the closing task takes: those
  of the item focus leaves, and those of the anchor focus goes back to. WebKit dated that change from the frame drawn
  before the closing task, and where the task took longer than the change lasts it was drawn over at once, with no frame
  of it. Closing now starts them from the first frame drawn after the task, as opening already did
  (`statesFromNextFrame`). Nothing changes in Chromium and Firefox.
- 7495506: Menu: a menu whose items are all inside groups now puts focus on its first enabled item when it opens, as MNU-1 says.
  Before, a menu that was mounted already open (a product that draws its menu only while it is open), or opened in the
  same task that gave it new groups, left focus on the anchor in Chromium and Firefox, and the arrow keys did nothing:
  the menu placed focus before its groups had drawn their slots, and a browser does not focus an item that is not drawn.
  Now the menu waits for itself, its groups and its rows to draw, then places focus. The wait is only microtasks, so no
  input comes between; a menu whose items are already drawn places focus at once, as before. This also covers a menubar's
  menu opened with Up Arrow, which still takes focus on its last enabled item (MBR-9).
- fe62465: Menu: a key pressed before the opening motion has drawn its first frame (End on a busy machine) no longer scrolls the
  list part of the way. The menu waits for the surface to come to rest, as it does while the motion runs, and then
  brings the item into view.
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
- e6068b9: Menu: a pointer at rest no longer takes focus from the keys. Safari sends a pointer move to whatever comes under a mouse
  that has not moved once the menu's items scroll under it, so an End, a Down Arrow or a typed character that scrolled a
  long menu moved focus a moment later to the item under the mouse, and the next key went on from there. A pointer move
  at the place the same pointer last was is now no move; a pointer that moves onto an item still moves focus there, as
  before, in every browser.
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
- 9283a03: In Safari, a menu closed by Tab now moves the colors of its anchor over their motion however long the closing task
  takes. Tab gives focus back to the anchor before the product closes the menu, so closing found focus already outside
  the menu and left the anchor's change to WebKit, which dated it from the frame drawn before the task: where the task took
  longer than the change lasts, the anchor was drawn focused at once, with no frame of it. That change now starts in the
  first frame drawn after the task (`statesFromNextFrame`), as every other way of closing a menu already did. Nothing
  changes in Chromium and Firefox.
- 073a8bd: Menu, its submenus, a docked date-time picker and the search view are placed inside the visible part of the window, as
  the popover, the select and the combobox already were: above the on-screen keyboard, and only where a visual viewport
  that is scrolled or zoomed shows the page. On iOS the keyboard shrinks the visual viewport and not the layout one, so a
  menu opened near a focused field used to open under the keyboard. The popover, the select and the combobox now also
  keep below the top of a visual viewport scrolled down (iOS moves it to keep a field in view), not only above its bottom.
  
  **Breaking** (the module exports of 0.1.0-next.0): `placeMenu`, `placeAtPoint`, `placeSubmenu` and `MenuBox` are no
  longer exported by the menu's module. They live with the other placement geometry, which is internal to the package.
- 06647d8: Menubar: a menu is built when it is first shown, no longer when the bar mounts. A bar of seven menus now makes 9 updates
  of its own at mount instead of 16 (no `tanrei-menu` is created for a closed menu), and its menus' items half as many.
  The first opening is unchanged — the same motion, place and focus, by every input — and a menu once built is kept.
  Until a menu is first shown, `tanrei-menubar-menu`'s shadow root holds no `tanrei-menu` and its items are assigned to no
  slot, so they have no computed style.
- 1ecb145: Menubar: a bar inserted whole as markup after its elements are defined (`innerHTML`, `insertAdjacentHTML`: a view a
  single-page product draws) now holds its entries, as MBR-1 and MBR-32 say. The browser upgrades the bar, and runs its
  `connectedCallback`, before the menus and bar items inside it, and no child is added after that: the bar read no
  entry, drew an empty row and never told a menu written open where it was drawn, so a bar drawn in place (`inline`)
  opened that menu in the top layer instead. The bar now reads its entries again once they are upgraded, before their
  first update: each is drawn where the bar places it from its first frame (MOT-3).
- 6b2167e: A collapsible modal navigation drawer that is inserted into the page already open now opens in the write that follows
  the reads every component makes together, as every other modal surface does. So when a product draws such a drawer in
  the same task as it sets a dialog's or a modal layer's `open`, the one that comes later is on top and takes focus, in
  either order. Before this, the drawer opened in its own first update, under a dialog set open before it in that task.
  
  The drawer now draws its header for the buttons, title and main action it holds from its first render, read from its
  children. Before this, the header was drawn only once its slots had reported what they held, one update later. A drawer
  written open with no selected destination still gives focus to its first header button (the menu button), not to the
  first destination after it (NVD-19).
  
  SRC-9 now says where focus goes when a search's view closes and the bar's input or the trigger cannot take focus back:
  to the platform's default for a closed overlay, as POP-22 and MDL-5 say. The web already does this.
- c13331a: A modal surface opened at the end of a long task now plays its entrance and its scrim's fade from the first frame drawn
  after that task, in every engine. WebKit dated both from the frame drawn before the task, so where opening took longer
  than the entrance (a modal date-time picker rendering its calendar on a busy machine) the scrim — and the modal layer's,
  the side and bottom sheets' and the image preview's own fade or slide — was drawn whole at once. `openModal()` holds the
  dialog's entrance and its `::backdrop` transitions at their start and plays them from the next frame, as
  `AppearController` already did for an appearance; this covers the dialog, the modal layer, the modal side and bottom
  sheets, the image preview, the popover's sheet and the modal date-time picker.
- 801a2ad: A surface closed at the end of a long task now plays its exit, and its scrim's fade, from the first frame drawn after
  that task, in every engine. WebKit dated an exit begun in a task from the frame drawn before it, so where closing took
  longer than the exit the surface and its scrim were gone in the first frame after it, without a frame of their motion.
  `closeModal()` holds the dialog's exit and its `::backdrop` transitions at their start and plays them from the next
  frame, as `openModal()` does for the entrance; `AppearController.exit()` does the same for the surface it moves. This
  covers the dialog (centred and as a sheet), the modal layer, the modal side and bottom sheets, the image preview, the
  popover's sheet, the modal date-time picker, and every other surface that `AppearController` moves (a popover, a
  select's or a combobox's list, a tooltip).
- d93ce2b: In Safari, the colors that closing a modal layer changes now move over their motion however long the closing task
  takes: those of the element focus leaves inside the layer, and those of the opener focus goes back to. WebKit dated that
  change from the frame drawn before the closing task, and where the task took longer than the change lasts it was drawn
  over at once, with no frame of it. Closing now starts them from the first frame drawn after the task, as opening already
  did (`statesFromNextFrame`). Nothing changes in Chromium and Firefox, which already start these motions in the next frame.
- 9b30315: The dialog, the modal layer, the bottom and side sheets, the date and time picker and the Button with menu do less
  work per instance when many are built at once.
  
  - **Shared motion work.** The hold that starts a motion from the next frame (`statesFromNextFrame`, a surface's
    entrance, a modal dialog's opening) lists its motions with every other host's reads of the turn, still in the task,
    and the frame that plays them on runs every request of that frame in one callback, all reads before any write.
  - **Group items.** One resize watch serves every Button in a group, so the Button with menu forces no more style or
    layout passes at 100 than at 10 (was 180 more).
  - **Dialog.** It reads its choices, the window and the keyboard with every other dialog's reads of the turn, opens in
    the write that follows, and lays out in steps that each read with the others. One resize watch serves every dialog.
    A closed dialog is not laid out; it is laid out as it opens. Its actions are given the dialog's variant in the same
    turn as they connect, before any frame. Building 100 open dialogs forces 450 more passes than 10 (was 2520); what
    is left is `showModal()`'s own work. Building 100 closed ones reads the layout or style 90 more times (was 1080).
  - **Side sheet.** The same steps and one resize watch; a closed sheet is given its variants and is not measured.
    100 sheets force no more passes than 10 (was 270 more); 100 closed ones read 270 more times (was 1530).
  - **Modal layer, bottom sheet, date and time picker.** The keyboard's cover, the heights and the actions' variant are
    read with every other host's reads of the turn. Each forces 270 more passes at 100 than at 10 (was 720, 900 and
    630): what is left is `showModal()`'s own work.
  
  Focus still goes in as each surface opens, after it is placed; of several modal surfaces opened in the same task, the
  topmost takes it. Nothing drawn, exposed or announced changes. The forced-pass budgets of the dialog, the modal layer,
  the bottom sheet and the date and time picker are lowered to the new counts; the side sheet's and the Button with
  menu's are removed. The read budgets of the closed dialog and side sheet are lowered.
  
  Reading together is a module of its own (`read-together`), apart from the frame's read phase, so that what only reads
  together does not bring the phase's resize observer into its bundle. The byte budgets of two bundles are raised to
  what they measure now: the dialog's (31800 to 32400 bytes gzip; 32310 measured), for the steps its layout and its
  opening are now made in, and the toolbar's (70000 to 70300; 70268 measured), which carries the motions' shared hold
  and frame through its menu.
  
  Two more byte budgets are raised, measured with main merged in. `@tanrei/web/all` goes from 664500 to 665900 bytes gzip
  (665847 measured; 1773 more than before this change): the dialog's and the side sheet's layout in steps that read
  together, and the frame that plays every held motion in one callback. The dialog and the side sheet share one resize
  watch now (95 bytes less). The file upload goes from 107200 to 107300 (107299 measured; 355 more): it holds its menu's
  entrance with the reads of the turn, which brings reading together and the shared frame into its bundle.
- 6ee3c72: Modal surfaces (dialog, modal layer, modal side and bottom sheets, image preview, popover as a sheet, modal navigation
  drawer, search as a dialog or full screen, modal date and time picker): where the browser cannot keep a classic scroll
  bar's room for what is fixed to the window — Safari, and Chrome on macOS, under a scroll bar styled with
  `::-webkit-scrollbar` — the window widens by the bar's width while the page's scroll is held, and an element fixed across
  it moved. The hold now measures how much the window gained on each side and sets it on the document's root as
  `--tanrei-scroll-hold-inset-left` and `--tanrei-scroll-hold-inset-right`, only while the scroll is held and only where
  the window grew. A product's elements fixed to the window's edges add them to their insets, with `0px` as the fallback,
  and stay where they were (the modal layer's page shows how). The snackbar does so itself, at the bottom and at the top
  end. Nothing breaks.
- 7a19510: Modal surfaces (dialog, modal layer, modal side and bottom sheets, image preview, popover as a sheet, modal navigation
  drawer, search as a dialog or full screen, modal date and time picker): the page's scroll hold now measures the scroll
  bar's room again each time the window is resized while it is held. Before, it measured once, as the surface opened, so a
  window made shorter or taller while it was open (a bar that would come back, or would not) kept the old padding and the
  old `--tanrei-scroll-hold-inset-left` / `-right`, and the page shifted sideways by the bar's width when the surface closed.
  A page whose root sets `scrollbar-gutter: stable` itself is now measured too: Safari, and Chrome on macOS, keep no gutter
  for a scroll bar styled with `::-webkit-scrollbar` even when the page asks for one, so the page shifted by the bar's width
  as the surface opened. Nothing breaks.
- 55bc61a: Modal surfaces (dialog, modal layer, modal side and bottom sheets, image preview, popover as a sheet, modal navigation
  drawer, search as a dialog or full screen, modal date and time picker): in Chrome and Edge on Windows and Linux, where
  the scroll bar takes room, the page behind no longer narrows by the scroll bar's width while the surface is open.
  Holding the page's scroll keeps the bar's room as a stable gutter. Chromium reports that gutter as no room taken, so
  padding as wide as the bar was added over it. The room the hold keeps is now read from the root's own box, and padding
  is added only where the browser keeps no gutter: Safari, and Chrome on macOS under a bar styled with
  `::-webkit-scrollbar`. There, an element in `position: fixed` across the window still moves by the bar's width, as
  before. Nothing breaks.
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
    `transition-property` lists only what moves (`opacity`, `scale`, `translate`), and so does the appearance every
    surface that opens beside a control is drawn with: those popovers are all manual and each leaves the top layer only
    after its own exit has finished.
  - The page's scroll, held while a modal surface is open (MDL-2), no longer moves the page sideways where the scroll bar
    takes room: the root keeps that room (`scrollbar-gutter: stable`, or as much padding where the engine keeps no gutter
    for the bar). Nothing changes where the bar is drawn over the page.
- 04337f7: Image preview, modal layer and dialog: written open in the page's markup, a modal surface appears at once, with no
  motion, as its spec and the motion principles say (MOT-4, IMP-33). The image preview's container, with the controls
  and the caption in it, faded in over the enter motion all the same, and so did the modal layer's container and scrim
  and the dialog's scrim: everything in the image preview and the layer was drawn translucent for the first third of a
  second, its text and icons below their contrast. `openModal()` now draws the dialog and its scrim open at once before
  the document's first paint (or when asked with `{ instant: true }`); a surface opened after that plays its entrance as
  before.
- 88f6193: A modal surface no longer gives focus to its first control for a moment as it opens. Before this, `showModal()` gave
  focus to the first control inside the dialog, and the component then moved it where it belongs: to the element marked
  `autofocus`, the dialog itself, or the search's input. That control held focus for no frame, but it still started a
  200 ms transition of its focused colors. The affected controls were the close button of a modal side sheet or bottom
  sheet, the back button of a search's full-screen and dialog views (in every engine), and the first action of a dialog
  or of a popover shown as a sheet (in Chromium). Now, while `showModal()` runs, everything inside the dialog is inert.
  So focus goes to the dialog itself in one move, and from there to where the surface sends it. The opening shows only
  the surface's own motion. Where focus ends, and whether it draws its focus indicator after a key or a pointer opened
  the surface, are unchanged.
  
  An image preview gives focus to its stage, and `showModal()` now gives it there directly, in one move. Going through
  the dialog first would make Chromium bring the style and the layout up to date again for every preview opened in a
  task. Building a hundred open dialogs now forces 270 style and layout passes more than building ten does, against 450
  before, and the dialog's forced-pass budget follows the count down (from 472 to 283).
  
  The dialog's byte budget goes from 32400 to 32500 bytes gzip: it measures 32434. It grew by the few lines that make the
  dialog's content inert around `showModal()`. Every modal surface shares those lines, and a shorter form measured
  larger. `@tanrei/web/all` measures 668481, within its budget of 668500.
- 8da3d7b: Modal surfaces whose `open` is set in one task now stack in the order it was set, whatever their kinds: the one set
  later is on top, takes focus, and gives focus back on closing to where the earlier one moves focus. This is how the
  native `<dialog>` stacks with its `showModal()` calls. Before this, a bottom sheet, a side sheet, a modal date-time
  picker, an image preview or a modal navigation drawer opened in its own update, while a dialog and a modal layer
  opened later in the same task. So `dialog.open = true; sheet.open = true` put the dialog on top. Now every modal
  surface opens at the same point of the task: the write that follows the reads every component makes together.
  
  A standard navigation drawer, bottom sheet or side sheet opened under a modal surface it is not inside, in the same
  task or later, now gives focus back on closing to the element that had focus before that surface opened. Before this,
  it gave focus back to an element inside the modal surface, which had closed by then, so focus was lost. NVD-28, BSH-3
  and SSH-3 now say so.
  
  The byte budget of `@tanrei/web/all` goes from 667400 to 668000 bytes gzip. It measures 667990, 639 more than before
  this change. The five surfaces that now open in the write each wait for it, a collapsible modal navigation drawer makes
  its whole opening update there, and the modal layer keeps where each surface returns focus. The function that answers
  for the standard regions stands apart from the modal layer, so the dialog and the modal layer carry only the record of
  openers: 26 and 18 bytes more. No component's own bundle goes over its budget. The image preview's budget of forced
  passes goes down from 1132 to 661. It measures 630 now, against 720 before this change: a hundred previews that open
  in one task now open in one write.
- 1300097: Modal layer, image preview, navigation drawer and date-time picker: opened in the same task above a dialog, a sheet, a
  modal picker or a modal drawer that has not moved focus in yet, each now returns focus on closing to the element that
  surface moves focus to as it opens, as two dialogs or two sheets already did. Before this, it returned focus to wherever
  the lower surface's `showModal()` had put it, such as its first button or the dialog element. A modal date-time picker,
  and a modal navigation drawer whose items are drawn after it opens, now also tell a surface opened above them in that
  task where they move focus, so that closing it returns focus to the calendar's active day (or the hour wheel, or the
  selector) or to the selected destination. The modal layer's MDL-8 now says what happens when two modal layers open in
  the same update.
  
  The byte budget of `@tanrei/web/all` goes from 667300 to 667400 bytes gzip (667351 measured, 139 more than before this
  change): the modal date-time picker and the modal navigation drawer now say where they move focus as they open, and
  when they have, and every modal surface asks the modal layer for where focus goes back. The picker's three ways of
  giving focus now share the one target they name and the drawer checks one thing less, which took 39 bytes back. No
  component's own bundle goes over its budget.
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
- ed22865: **Navigation drawer: a destination keeps an end chevron's room only after trailing content of its own.** With the
  chevron at the end (and in a collapsible drawer, which draws a start chevron there), a destination's row kept the
  chevron's room and a gap, empty, at its end whether it had anything there or not. It now keeps them only after its own
  trailing content (a count, a glyph, the mark of a link that opens elsewhere), so that the trailing content of a level
  still stands in one column; a row with nothing at its end gives that room to its label: 32 px in the default system (the
  chevron's 20 and the gap's 12). In the documentation site's 240 px sidebar a component's label, two levels deep, had
  88 px and now has 120. Fixtures in which a destination's label was cut show more of it.
- 51771d8: Navigation drawer: a change of form (folding to the icon column, unfolding, a collapsible modal drawer widening and
  narrowing) now keeps its motion in force until the drawer's width motion has ended. Before, it ended on a page timer
  of the change's duration. A motion that played more slowly outlasted that timer, for example on a slowed page or one
  whose first frame came late after a long task. For the rest of the motion the parts the form recolors took the state
  motion's duration instead of the change's, and a width drawn without motion (a drag, a change of room) stopped
  moving with the change. Where motion is reduced, the change of form is drawn at once, so no motion of it is in force
  even for a moment; before, it stayed in force until the next task. A drag's move that takes the place of the width's
  motion still ends it, so the drag follows the press from there.
- 4e7bdd8: Navigation drawer: when a person folds or unfolds the drawer, or gives it its default width, an app shell around it
  now holds the place being read until the drawer's width motion has ended. Before, the hold ended on a page timer of
  the change's duration plus 100 ms. A motion that played more slowly outlasted that timer, for example on a slowed page
  or one whose first frame came late after a long task. For the rest of the motion the main content moved under the
  reader: about 528 px in one frame of the fold at a quarter of its speed. A change that starts no width motion still
  ends its hold in the frame after it is drawn. That covers reduced motion and a key's step.
- 6c7f52d: Building many navigation drawers at once no longer has the browser style and lay out the page for each. A resizable
  drawer measures its widths and its scrollbar after the renders of the task, together with every other component's, and
  one observer watches the room and the scrollbar of every drawer, so a frame's changes are read for all of them before
  any is written. Drawers built in one task also settle their first frame's styles once for all of them before their
  motions are given back. A hundred drawers now cost the passes ten do. Nothing drawn changes.
- 927c90a: Navigation drawer: the room its parent gives wins over its least width. The spec said both that a drawer's least
  width wins over its greatest, the room included (NVD-97), and that an app shell's navigation is never wider than the
  window less a touch target (APS-5). The drawer was already drawn at the room, so nothing reaches past its parent or
  needs a sideways scroll to be reached (WCAG 1.4.10), as Android's drawer and Compose's drawer sheet also keep to the
  room their parent gives. The spec now says so (NVD-97, APS-5, `minWidth`). What changed in the drawer: below its
  least width, its resize handle said the least width as its value and its least and greatest; it now says the width
  drawn, the room, for all three (the column's width stays its least where the drawer folds), so the value is never out
  of the handle's range. A drag, a key or a press on the edge there still changes nothing and emits nothing, and the
  width given comes back with the room.
- ad0773a: In Safari, the navigation drawer's motions now play however long the task that opens or closes it takes. WebKit dated
  a motion begun in a task from the frame drawn before that task, and where the task took longer than the motion lasts it
  was drawn over at once, with no frame of it. Each of these now starts in the first frame drawn after the task
  (`statesFromNextFrame`, `startFromNextFrame`), as the modal drawer's slide and the colors inside it already did:
  
  - the colors of the element focus goes back to when a modal drawer closes, where that element is outside the drawer
    (a menu button in the page);
  - a standard drawer's slide as it opens or closes, and the colors of what focus leaves and goes to as it does;
  - a drawer held below an app shell's header, opened over the content or closed: its slide, its scrim's fade, and the
    colors of the app shell's menu button that focus leaves and goes back to.
  
  Nothing changes in Chromium and Firefox.
- ac7c2d3: Navigation drawer: in Firefox, a wheel over the drawer's items no longer scrolls the page once the items are at
  their end. Firefox keeps to the list's `overscroll-behavior: contain` only within one wheel transaction, and an event
  that scrolls nothing does not extend it. So, 1.5 s after the list reached its end, it gave the next turns to the page:
  someone still turning the wheel, or turning it again, scrolled the page 400 px a turn. The drawer now cancels a wheel
  turned toward an end its items already stand at. It still lets through a wheel turned with Ctrl (the page's zoom, and
  a trackpad's pinch), one turned sideways, one over items that cannot scroll, and one that a scroller inside the items
  can still take. Chromium and Safari already kept the page still, and nothing changes there.
- 66f1b1c: The packages say on npm where their documentation is (`homepage`, the package's page on the docs site), where to
  report a bug (`bugs`, the repository's issues) and what they are (`keywords`). `@tanrei/mcp` carries `mcpName`, its
  name in the MCP registry. `pnpm generate` writes them from `tanrei.config.json` (its new `site`) and
  `docs/registries/npm-keywords.json`.
- e985d43: Number input: the elements it watches for wrapping (its container and its input's line) are given back to the page's
  resize observer exactly as they were given, and an input that leaves the page before its first update ends watches
  nothing. Such an input used to stay watched after it was gone.
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
- 5186d65: Date-time picker and calendar: the focus indicator of the hour and minute selectors, and of the calendar's days, years
  and view toggle, is now the component's own, as the wheels' and the period's already were, so it is the same in every
  browser (DTM-22, CAL-19). After a pointer's press on one of them, a key that works it (an arrow, Enter, Space, a digit
  that stays on the hour) now shows the indicator in Firefox too, where only Chrome and Safari showed it, and a press on
  the hour dial hands the minute selector the indicator exactly when the hour selector had it. In Safari 17.5 to 18.3,
  which draws a modal dialog's first focus after a click with the indicator, a modal picker opened by a press no longer
  shows it on the calendar's day or year or on the selector. The calendar's `focus({ focusVisible })` now shows the
  indicator or not as asked in every browser, also on a day that already has focus. The indicator looks as before, in
  forced colors too.
- c89c4b6: In Safari, the colors that opening or closing a date-time picker changes inside it now move over their motion however
  long that task takes. Closing a picker, docked or modal, changes the colors of the day that focus leaves; WebKit dated
  that change from the frame drawn before the closing task, and where the task took longer than the change lasts (about
  one time in six in a Linux runner's WebKit) it was drawn over at once, with no frame of it. The picker now starts what
  its opening and its closing begin inside it from the first frame drawn after the task, with the same shared rule
  (`statesFromNextFrame`) as the dialog, the menu and the sheets. Nothing changes in Chromium and Firefox, which already
  start these motions in the next frame.
- acee0da: In Safari, the colors that closing a popover beside its anchor changes now move over their motion however long the
  closing task takes: those of the element focus leaves inside it, and those of the opener focus goes back to. WebKit dated
  that change from the frame drawn before the closing task, and where the task took longer than the change lasts it was
  drawn over at once, with no frame of it. Closing now starts them from the first frame drawn after the task
  (`statesFromNextFrame`), as the dialog, the menu and the sheets do. Nothing changes in Chromium and Firefox.
- a532977: A popover shown as a sheet (in a compact window) and a search's full-screen or dialog view now open where every other
  modal surface opens: in the write that follows the reads every component makes together. So when their `open` (a
  search's `expanded`) is set in the same task as a dialog's, a modal layer's or a sheet's, the one set later is on top
  and takes focus, whatever their kinds. Before this, the popover's sheet and the search's view opened in their own
  update, under a dialog set open before them in that task.
  
  Opened above a modal surface that holds its opener inert, the popover's sheet gives focus back on closing to where focus
  was as it opened — where that surface gives focus — since its opener cannot take it (POP-22: the platform's default for a
  closed overlay, which a native `<dialog>` gives too). The search's view does the same when the bar's input or the
  trigger cannot take focus back. Before this, focus was lost in Firefox and WebKit.
  
  The byte budget of `@tanrei/web/all` goes from 668000 to 668300 bytes gzip. It measures 668276, 286 more than before
  this change: each of the two surfaces now waits for the write and reads the keyboard's cover with the other reads, and
  keeps where focus goes back when its own target cannot take it. The popover's bundle grows by 181 bytes and the
  search's by 161, both within their budgets.
- 393a0c8: In Safari, the colors that closing a popover drawn as a sheet (a compact window) changes now move over their motion
  however long the closing task takes: those of the element focus leaves inside the sheet, and those of the opener focus
  goes back to. WebKit dated that change from the frame drawn before the closing task, and where the task took longer than
  the change lasts it was drawn over at once, with no frame of it. Closing the sheet now starts them from the first frame
  drawn after the task (`statesFromNextFrame`), as closing the popover beside its anchor already did. Nothing changes in
  Chromium and Firefox.
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
- b0e5f61: Fewer forced style and layout passes when many components are built at once. A component that read a choice of kind
  (a Button variant, an axis, an arrangement) from the cascade in its own update had the browser style the page for it
  there, once for each instance: a hundred calendars built in one task styled the page a hundred times. The calendar's
  axis, the carousel's, the chat composer's and the snackbar's Button variants, an open image preview's control variants
  and the one-time code input's row marks are now read after the renders of the task, together with every other
  component's, and written after all of them — once for all of them, before any frame, and read again at every update
  (never kept). A side sheet, a popover, a dialog, an image preview and tabs read several choices with one computed
  style, and a closed popover reads none. A hundred calendars, or a hundred one-time code fields, now cost the passes ten
  do. Nothing drawn changes.
- b9d4879: Fewer forced style and layout passes on three paths that still read once per instance. A carousel with autoplay
  read its interval from the cascade in its own update and again as each row came to rest, and the playback glyphs' font
  the same way; it now reads them with every other component's reads of the turn, before any of them writes. A carousel
  arranged while it moves (a new item width during a scroll) no longer reads its scroll offset again after its writes: it
  takes the offset its row was just scrolled to. A scroll area whose fit only its sentinels tell (content a fraction of a
  pixel past the box) asks whether anything inside takes focus in the next frame's read phase, with every other area,
  instead of in its own intersection callback; the role and the tab stop follow a frame later on that path. Building 100
  autoplay carousels with a progress fill now forces no more passes than 10 (was 630 more), and so do 100 carousels
  arranged mid-motion (was 180 more) and 100 such scroll areas (was 88 more). Nothing drawn changes.
- a45036e: The popover, the tooltip, the snackbar and the image preview do less work per instance when many are built at once.
  
  - The popover's placement (and that of every surface placed beside an anchor) is made in steps: each step's reads are
    made with every other popover's of the turn, before any of their writes, still before the first frame. A popover
    drawn whole at once no longer draws its closed state first. One resize watch serves every popover. Building 100 open
    popovers forces 179 more style or layout passes than building 10 (was 971); what is left is the appearance's own work.
  - The tooltip enters the top layer, and is placed, once the renders of the turn are done, and only if it is still the
    one showing: of many tooltips opened at once, those that gave way to the next are never presented. One that was never
    presented has nothing to take away when it closes. 100 tooltips force no more passes than 10 (was 353 more).
  - The snackbar measures its text with every other snackbar's of the turn, through one resize watch for all of them,
    and changes a class for the measurement only where it differs. Its text is scrolled back to its top only when it had
    shown expanded. 100 snackbars force no more passes than 10 (was 180 more).
  - The image preview measures its stage with every other preview's of the turn, and a picture that loads or fails is
    placed from what was measured, reading nothing. Building 100 open previews forces 1079 more passes than 10 (was 1440);
    what is left is the modal dialog's and the appearance's own work.
  
  Nothing drawn, exposed or announced changes. The forced-pass budgets of the popover and the image preview are lowered
  to the new counts; the tooltip's and the snackbar's are removed.
- ef0af92: The loading indicator, the marquee text, the scroll area and the split view no longer have the browser style or lay out
  the page once for each instance as they are built. The loading indicator reads its tokens with every other host's of
  the turn, through a probe placed as it is inserted; the marquee text measures its widths the same way; the scroll area
  reads its blur's layer count the same way; and the scroll area, the marquee text and the split view each share one
  resize observer between all their instances, so a frame's reports are all read before any is written. The split view
  no longer asks its pane for motions to stop when nothing moves. Building 100 of each first fixture now forces no more
  style or layout passes than building 10 (was 90, 180, 135 and 90 more), so their own forced budgets are removed. Nothing
  drawn or exposed changes: a show delay the product gives still starts at insertion, and the first frame shows each
  component as before.
- db7055c: The READMEs on npm no longer say that the packages are not on npm. Each is written as it reads from 0.1.0 on
  (`npm install @tanrei/web`), and what it says exists — the version, what to install while it is a prerelease, each
  platform's components by status — is written by `pnpm generate` from the repository, so it never claims more than is
  there. During the 0.x prereleases backward compatibility is not kept: any prerelease may break anything, and its
  changeset says what broke.
  
  `@tanrei/web`'s README is a short guide for its users (it was 953 KB, and npm showed only its first 65,536
  characters); the implementation notes it held stay in the repository as `packages/web/IMPLEMENTATION.md`, which the
  package does not ship.
- e336a97: Faster first frames on long pages: elements no longer have the browser style or lay out the whole page for a read of
  their own while the page is still defining its elements. Each such read cost a long page a tenth of a second in Safari
  and Firefox, once for every module that arrived in a task of its own. On the documentation's Button page (about 950
  elements) the time spent in these reads before the first frame is about halved in Safari and cut by about a quarter in
  Firefox. Nothing is drawn differently, and the first frame painted shows what it showed before.
  
  - A table measures whether it scrolls, and writes its region and focus stop, after the frame's layout and before its
    paint, with every other table of the frame, instead of in a microtask of the task that wrote it.
  - A closed menu no longer reads the form of its shortcuts. It reads it when it opens, and its rows keep the form
    they were last given until then.
  - An app bar reads the window width it is compact below, and where its scrolling element is scrolled to, after the
    frame's layout, instead of as it is connected and in its first update.
  - A navigation drawer brings its items to the offset given and its selection into view after the first frame's
    layout, and reckons its pinned rows there, instead of in microtasks before the frame and in a frame callback. A
    script that reads `scrollOffset` in a frame callback before the drawer's first frame is painted now finds the
    offset it gave, or 0 where it gave none, until that frame's layout.
  - An element drawn by a stylesheet of its own (a table, a figure, an accordion and the others) asks whether the page
    loaded that stylesheet once for the page. The first question answers it for every such element on the page, where
    each kind used to ask in its own definition.
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
- e6f540c: In WebKit, a dialog or a modal side sheet written open in the page's markup whose actions are stacked no longer fades
  its scrim in as the page loads (MOT-4). The dialog was drawn open at once, but laying it out again in the task that
  opened it had WebKit start the scrim's entrance from its starting style anew. A modal dialog opened before the
  document's first paint now keeps its scrim from starting a transition until that paint.
- b1ddfd8: Modal layer, Dialog, Bottom sheet, Side sheet, Navigation drawer, Date-time picker and Search: where the scrim blur
  (`comp.modal-layer.scrim.blur` and the tokens that alias it) is 0 — every shipped system — the scrim has no backdrop
  filter, instead of `blur(0px)`, which drew nothing. In WebKit on Linux a backdrop that holds a filter makes the page redraw
  everything under it whenever anything changes: on a page of 27 open modal date-time pickers a 1-pixel change took about
  2 s to draw, and 16–23 ms without the filter. A blur a layer sets is drawn as before.
- 3b1d8a5: Search and navigation drawer: a closing modal view or drawer stays drawn until its exit has played, in every engine,
  and gives focus back at once (MDL-5, MDL-7), as the dialog, the sheets and the other modal surfaces do. The search's
  dialog and full-screen views closed with a bare `close()` and kept themselves drawn with a discrete `display` and
  `overlay` transition, which only Chromium plays: in Firefox and WebKit the view and its scrim vanished with no fade.
  They now close with `closeModal()`. The modal navigation drawer slid out while it was still modal, so the page behind
  stayed inert and focus went back only when its motion ended; a drawer that slides now closes with `closeModal()` too,
  and its slide and its scrim's fade begin in the first frame drawn after the task that opens or closes it. A
  collapsible modal drawer still narrows to its column while it is modal, and gives focus back once the column has taken
  the dialog's place.
- 551ad4c: Search: a view that closes keeps drawing its content while it fades out. Before this fix the suggestions' listbox was
  emptied as soon as the view closed. In the dialog and full-screen views only the header faded, and the dialog view's
  height dropped to the header's at once. The docked view faded out empty. Now the docked, dialog and full-screen views
  draw the suggestions and the active row as they were at the moment of closing, even if the product adds or removes
  suggestions meanwhile, until the fade ends. A group of results below the suggestions keeps its space above it. What the
  search exposes changes when it closes, as before: the input is a search box again at once, without `aria-expanded`,
  `aria-controls` or an active descendant, and the view that fades out is inert. Opened again before it has gone, the
  view shows what the search holds now. Where motion is reduced it is gone at once, as before.
- 01aa43a: A search view that opens now shows its own motion only. The row it makes current as it opens (the query row, or the
  first result) appears current from the view's first frame; before, it faded into the focused state over 250 ms after
  the view was first drawn. This was seen in every engine: for results in the docked, full-screen and dialog views, and
  for the query row in a modal view opened from a trigger. A row the person makes current afterwards, with an arrow key,
  still moves. `afterTwoFrames()` (where settling ends) is now exported from the primitives.
- 2eb03ec: Search: a docked view written open (`expanded`) in the page's markup is there in the document's first frame instead of
  growing in as the page loads (MOT-4); mounted expanded after the first paint it still grows in from the bar.
- 6c626ae: Search: a docked view that is not shown draws nothing. Drawn in place (`inline`), the docked view is not a popover, so
  nothing hid it while the search showed its dialog or full-screen view, was collapsed, or had no content. It stayed a
  0 × 0 box at the start corner and still painted its 1 px elevation ring, a dot just outside the search. The view is
  now rendered only while it is open, as a popover or in place. The specification (SRC-7) now says that a docked view
  that is not shown draws neither its surface nor its elevation. Baselines are unchanged: the dot lay outside every
  fixture's captured area.
- fef5abf: A search's full-screen or dialog view drawn in place (`inline`, as the documentation draws it) and written `expanded`
  in the page's markup is now there in its first frame (MOT-4), instead of fading in from its starting style as the page
  loads. Marked open after the document's first paint, it still fades in. `atOnce()` (`src/primitives/modal-exit.ts`),
  which changes a dialog with no transition on it or its scrim, is now exported for this.
- e9cc3aa: Select, combobox and image preview: used correctly, they no longer warn in a debug build when a React product renders
  them. React's wrappers set each option's `value` and each image's `alt` as a property once the elements are in the
  document, and the child writes it to its attribute — which the parent reads — only in its own update. So the parent's
  checks ran on children without what the product gave them: a select warned that its value "names no option" and that
  "two options share the value ''", a combobox that "an option has the empty value", and an image preview mounted open
  that "the image at 0 has no alt". The checks now wait until the children's own updates are done, and judge them as the
  product gave them. A value that names no option, two options that share a value, an option without a value and an
  image without an alt are still reported, once.
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
- 14046b7: A state an element's parts take in the last moments of its first frames now arrives without a motion, as MOT-3 says.
  An element settles until two frames after its first update, and nothing in it starts a transition meanwhile; but a
  state written after the last frame drawn while it settled — in a task before the frame callback that lets it go — was
  styled in the same pass as the end of settling, and moved from the state before it. An image preview written open
  showed it: its zoom-in control, enabled when the image has loaded, faded its colors in from disabled whenever the
  image loaded in that gap. The page is now styled once, for every element let go in that frame, before settling ends.
- 4e8cfcc: Bottom sheet and side sheet: a modal sheet appears the way every sheet does, using the same pieces as the dialog
  (`appearStyles()` with the sheet role, `AppearController`, `closeModal()`). The popover and the dialog shown as a bottom
  sheet in a compact window move the same way.
  
  - It slides in from its own size beyond its edge: the bottom edge for a bottom sheet, the end edge for a side sheet
    (the left edge in right-to-left). It is never faded or scaled, under every appearance, m3-like's `unfold` included.
    It leaves the same way, from wherever it is drawn (where a drag left it, too), over the exit motion on the
    accelerating curve. It stays drawn in the top layer until the slide has played, in every engine. A slide turned round
    goes on from where it has got to.
  - The scrim fades in step with the slide, over the same duration and curve.
  - Where motion is reduced, the sheet and its scrim only fade, in place, over `sys.motion.role.reduced` (100 ms in the
    default system). They used to fade over the sheet's own 400 and 350 ms. A standard bottom sheet's reduced fade takes
    the same 100 ms. The popover and the dialog shown as a bottom sheet fade over the same 100 ms.
  - The sheet durations are unchanged (400 ms in, 350 ms out in the default system). So are the baselines: the fixtures
    are drawn at rest.
  - `appearStyles()` takes `offset`: a translate the open surface stands at instead of none, where a gesture moves it
    (a sheet's drag). A surface with the sheet role is no longer given `scale: 1 1` while closed, which started a
    transition of `scale` that drew nothing. `sheetScrimStyles()` (new, in `scrim.ts`) draws a sliding sheet's scrim.
    `sheetLookStyles()` takes `motion`: the dialog's selector for its motion, where `sheet` names the dialog through the
    shadow host.
  
  The shared motion costs about 2 kB gzip in each sheet's bundle: the bottom sheet's budget goes from 48,200 to 50,700
  bytes (measured 48,222) and the side sheet's from 44,900 to 47,400 (measured 45,058), each the measured size and 5 %.
  
  BSH-1 and SSH-2 now say how the sheet and its scrim move. The SwiftUI, Compose, Flutter and React Native platforms are
  paused, and their sheets were not changed or checked against the new wording.
- 7f7e4fb: In Safari, the colors that closing a modal side sheet or bottom sheet changes now move over their motion however long
  the closing task takes: those of the element focus leaves inside the sheet, and those of the opener focus goes back to.
  WebKit dated that change from the frame drawn before the closing task, and where the task took longer than the change
  lasts it was drawn over at once, with no frame of it. Closing now starts them from the first frame drawn after the task,
  as opening already did (`statesFromNextFrame`). Nothing changes in Chromium and Firefox.
- 3a64e86: Bottom sheet and side sheet: two modal sheets opened in the same task now stack as if the later had opened from the
  earlier, as two dialogs already did. Focus goes into the later one. Closing it returns focus to the element the earlier
  sheet moves focus to as it opens: the element marked `autofocus`, or the sheet itself. Closing the earlier one then
  returns focus to the element that had it before either opened. Before this, the later sheet returned focus to wherever
  the earlier sheet's `showModal()` had put it, such as its close button. A dialog opened above a sheet in the same task
  now gets the same focus return. The bottom sheet's BSH-23 and the side sheet's SSH-15 now say what happens when two
  modal sheets open in the same update.
  
  Bundle budgets: the modal layer's budget rises from 16 800 to 16 900 bytes (gzip) and `@tanrei/web/all`'s from
  667 200 to 667 300. Where a surface owes focus is now kept by the window's modal layer (`modalLayer.owesFocus()`,
  `gaveFocus()`, `opener()`), which every modal surface imports, so the modal layer component's bundle carries it too,
  although that component does not use it: 59 bytes more (16 788 to 16 847), against 12 bytes of room. The sheets now share
  where they give focus (`sheetFocusTarget()`) rather than each keeping a copy, which brought `all` from 135 bytes over
  main to 42 (667 170 to 667 212), still 12 over its budget. Moving the bookkeeping out of `modalLayer` would keep it out
  of the modal layer's bundle, but every dialog and sheet asks the layer for it, and the layer is where the open surfaces
  are known.
- d0de4b8: The package's `sideEffects` now names every module whose loading defines an element, so a bundler that honours the
  field (esbuild, Rollup, Vite, webpack) keeps each definition a component brings with it — the buttons of a calendar,
  the copy button of a code block, the menu of the breadcrumbs, the requirement tag of a field. Importing a component
  from `@tanrei/web/components/<name>` already defined all of them; what changes is that a build from the package's
  sources (a workspace that bundles `src/`, or the package's own `tanrei.bundle.js`) no longer warns that an import of a
  component was ignored, and that the field frame, which defines the tag, is declared too.
- ccb6524: Side sheet: a modal sheet mounted with `open` after the document's first paint — a view a product draws in answer to a
  click — slides in over its fading scrim, as a dialog, a popover or a menu mounted open does (MOT-4). Written open in the
  page's markup it is still there in the first frame without its motion, and a standard sheet, a layout region, still
  takes its place at once either way.
- abced4a: Side sheet: a standard sheet no longer makes the page scroll sideways. Its panel slides out past the end of its width,
  and only a `clip-path` hid that part, so the page stayed one panel wider than the window — closed, and in every frame
  of the slide. Opening the sheet moved focus into a panel that was still partly past the window's edge, and the window
  scrolled sideways by the panel's width (320 px in the default system) in Chromium, Firefox and WebKit, in an app
  shell's aside and at the end of any page's row, left to right and right to left. The panel is now held by a box that
  ends with the sheet's width and clips what passes it, so the page is never wider than the window; that box draws the
  variant's elevation, which still shows toward the content. A modal sheet was not affected. Nothing drawn changes: the
  side sheet's baselines are unchanged.
  
  `@tanrei/web/all`'s bundle budget rises by 100 bytes, to 668200: the box and its rule add 42 bytes gzip to it
  (668107), 7 over the budget it had; the side sheet's own bundle grows by 49 bytes, to 47364, within its budget.
- 1a4d2b0: Slider (and Slider field, and a Field around a Slider): what an ancestor's `zoom` and `transform` do to the value
  indicator in the top layer is now a requirement of the spec (SLD-29), tested in Chromium, Firefox and WebKit. Under an
  ancestor's `zoom` the indicator is magnified with the content: twice as large under `zoom: 2`, twice the offset from its
  handle, centred on it and kept inside the window. Under an ancestor's `transform` it keeps its own size, as every
  overlay in the top layer does, and still stands the offset above the handle where the handle is drawn, centred on it.
  The behaviour is unchanged; only the earlier note that a transform no longer scales it left out that zoom does.
- 029e299: Snackbar: F6 reaches it. A snackbar's controls stand at the end of the focus order, where its host is, so reaching an
  Undo from the keyboard meant a walk to the end of the page. Now F6 or Shift+F6, while `<tanrei-snackbar-host>` shows a
  snackbar with a control, moves keyboard focus to its first control (the text while it scrolls, else the action, the
  expand button or the close button) with its focus indicator, from anywhere in the page or in the modal surface the
  snackbar shows in, and F6 or Shift+F6 from inside it moves focus back to where it was. Closing it still gives focus
  back the same way. While no such snackbar is shown the key is left alone, so the browser's own F6 goes on, and a
  product that gives F6 a meaning of its own keeps it by handling the key first (`preventDefault()`). For a shortcut of
  its own (an Undo on Command+Option+Z), a product calls the new `focusCurrent()` on the host, which returns whether focus
  moved.
- 52cf232: Snackbar: a notice raised while a modal surface is open can now be seen, pressed and heard. A modal `<dialog>` makes
  everything outside it inert, so a snackbar shown from the host behind a dialog could not be reached until the dialog
  closed — an Undo was out of reach when it mattered, and the message was not announced. Now, while a Tanrei modal surface
  is open (a dialog, a modal layer, a modal side or bottom sheet, a modal navigation drawer, an image preview, a popover's
  sheet, a search's dialog or full-screen view, a modal date-time picker), `<tanrei-snackbar-host>` shows its snackbar
  inside the topmost one: drawn above the surface and its scrim at the same place, pressable, announced from live regions
  inside the surface, and reached by Tab after the surface's own controls within its focus trap. A snackbar asked for
  while a surface is open shows at once instead of waiting for it to close; one already showing moves inside the surface
  as it opens and back as it closes, still open, not announced again, its timeout started again from its whole length.
  Escape in the snackbar closes the snackbar and leaves the surface open, and a press on the snackbar is never a press on
  the surface's scrim. What broke: a snackbar no longer waits for a modal dialog to close, nor pauses under one. While it
  is shown inside a surface it is in that surface's shadow tree, so a page's own CSS rules for `tanrei-snackbar` (and its
  parts) do not reach it there, and its `action`, `dismiss` and `expandedchange` events do not bubble out to the document:
  style it through its tokens, and use what `show()` resolves with or listen on the snackbar itself.
- cd48cda: Avatar group, Toolbar and Search: a page's reset no longer changes their spacing. A page's rules beat the rules a
  component gives the elements it slots, so a reset such as `* { margin: 0; padding: 0 }` (a documentation site's,
  Tailwind's preflight) took away the avatar group's overlap, the space between a floating toolbar's items, the centring
  of a docked toolbar's only item and the space before a search bar's trailing buttons. The component now makes that
  spacing from its own box: the avatar group's row is a grid whose columns are each the side less the overlap, and a
  floating toolbar and a search bar's trailing buttons are spaced by elements of the component's own between them.
  Nothing is drawn differently, and the elements stand where they stood. The toolbar and the search bar no longer write
  `--tanrei-kept-*` custom properties on the product's elements.
- 4e480be: Component specs: 37 more specs say where each part of their anatomy is drawn on the web (`platforms.web.parts`),
  70 of the 98 in all, and `validate` now requires it of every spec whose web status is not `planned`. The 28 left
  (`PARTS_PENDING` in `packages/tools/src/parts.js`, each with what it lacks) write `parts` once it can be written: most
  have parts no target can name yet — an element of the product's light DOM (a native element or a `data-*`
  attribute), an element of a shadow tree that exports no CSS part, or an element outside the host — and three modal
  components wait for an anatomy figure that numbers the parts of their open fixture. The specs the MCP server returns
  carry the new parts.
  
  Web: `custom-elements.json` now lists the `indicator` part of `<tanrei-menubar-menu>`, the glyph a menu's title has
  always drawn under that name. Nothing is removed or renamed.
- 4b8dd96: In Safari, what opening or closing a surface changes inside it now moves over its motion however long that task takes.
  WebKit dates a transition or an animation begun in a task from the frame drawn before that task, so where the task took
  longer than the motion lasts, the end state was drawn at once with no frame of it. The changes now start in the first
  frame drawn after the task. Each one was seen dropped in WebKit when the opening task was held past its motions:
  
  - the menu: the first item's focused colors, as the menu opens and as a submenu opened by a key opens;
  - the navigation drawer: the selected destination's focused colors as a modal drawer opens, and a collapsible drawer's
    rows widening from its column and narrowing back to it;
  - the dialog, the side sheet, the bottom sheet and the modal layer: the focused colors of the element marked for
    initial focus;
  - the image preview: its controls' states as it opens;
  - the date-time picker: a docked picker's entrance and its exit, which were drawn whole or gone at once.
  
  The FAB menu's toggle turn and its first item's colors use the same shared rule (`statesFromNextFrame`) as these. Nothing
  changes where opening is quick, or in Chromium and Firefox, which already start these motions in the next frame.
  
  A motion held this way is now played from the next frame by giving it that frame's time as its start. Played with
  `play()` from that frame, a motion Chromium was already waiting to start when it was held (begun by the key before, with
  no frame drawn since) never got a start time, and stood at its start for good: a menu item's colors, as a key opened a
  submenu right after the key that moved focus off the item.
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
- 3952e87: Tabs: a reveal, the scroll that brings a tab into view over the indicator's motion, now always ends on its scroll
  position itself. Its last frame wrote the curve's value there, and an engine may call a motion finished while its
  progress is still a hair under 1 (WebKit, within its timing tolerance: 0.9999999999999999). WebKit also keeps whole
  scroll offsets, so the tabs could come to rest a pixel short of their position and stay there. The last frame now writes
  the position itself.
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
- c943bb4: Tooltip: a tooltip inserted whole as markup after its elements are defined (`innerHTML`, `insertAdjacentHTML`: a view a
  single-page product draws) now gives a Tanrei anchor its shortcut as its keyboard shortcut (`aria-keyshortcuts` on the
  anchor's native control), as TIP-27 says, and its text alone as its description. The browser runs the tooltip's first
  update before the anchor has drawn its control: the tooltip wrote the keys on the anchor's host, the host moved them
  onto its control as the product's own, and the tooltip then took them for a shortcut the anchor states itself — so it
  added the keys to the description instead and left no keyboard shortcut. The tooltip now reads its anchor once the
  anchor has drawn.
- f31e5d7: A tooltip that shows reads its anchor before it places itself, and draws an entrance made whole at once without asking for its transitions again. Ten tooltips now force no more layout and style passes than a hundred, and a menu's or a popover's entrance made at once forces half as many as before. Nothing a person sees changes.
- 669cd45: Tree view: a tree that appears on a page that is already drawn (a single-page product showing a view) is in its
  selection from its first frame. Its selected rows no longer fade in from the unselected colors over the state motion
  for their first 100 ms or so: the rows' `aria-selected` and `aria-expanded` are written when the tree is connected,
  before anything styles them — the tree's own stylesheet check, or a product that reads the layout of what it has just
  inserted — and again before its first update for a value set in between. A change of selection afterwards moves as
  before.
- 2220dec: Tree view: a change of any token (a change of contrast, a scheme, a system) restyles a page of trees for less. Where
  each level's rows begin is now said once for each list, from two counts that every item hands on (how many items hold
  it, of each of the two steps an item may take) and two step lengths said once on the tree, instead of a length that
  grew by every level's whole expression of the size tokens and was substituted again on every item and every row
  (858 characters at the third level). Nothing it draws changes: every row's padding, grid columns and height, its
  container's, chevron's, icon's and trailing text's boxes and every guide are the same in Chromium, Firefox and WebKit
  over sizes, chevron placements, icon spaces, highlights, product indents, both directions and a width narrow enough
  to hold the deepest level back from the middle. On the restyle page with ten trees (740 tree elements), a change of
  contrast takes WebKit about 7 ms less style recalculation (59 to 52 ms, against 28 for the page without trees), and
  Chromium about 2 ms less.
  
  The byte budget of `@tanrei/web/all` goes from 667400 to 667500 bytes gzip (667406 measured, 52 more than before this
  change): the two step lengths, the counts and the guides' own start are new declarations, which the arithmetic they
  replace on every item does not quite pay for in bytes. The tree view's own bundle stays within its budget.
- 1d49987: Tree view: a change of any token restyles a page of trees for less in WebKit and Chromium. Where motion is reduced, a
  row's chevron box, its container and its supporting and trailing texts no longer have reduced rules of their own: the
  row's reduced rule sets `--_trv-still: none`, and their transitions read it (`var(--_trv-still, <their own>)`). The
  build writes every reduced rule of the sheet again under the root's `--tanrei-motion` style query, and such a rule
  costs WebKit at every element it matches each time the tree is styled again, a pseudo-element about four times an
  element; the row's chevron box and container are pseudo-elements. Nothing drawn or moved changes: every transition and
  animation value of every element and pseudo-element of a tree is the same in Chromium, Firefox and WebKit, with no
  preference, with the person's setting, with the product's attribute, with the product's `--tanrei-motion` on an
  ancestor or on the tree, and inside a product's shadow root (the sheet adopted there); and every row's geometry, as
  before, over sizes, chevron placements, icon spaces, highlights, indents, both directions and a narrow width. A change
  of contrast on a page of fifty trees takes WebKit 8 ms less style recalculation with the usual reduced-motion reset on
  the page (117 to 109 ms), 6 ms less where motion is reduced without it (65 to 59) and 4 ms less where it is not (70 to
  66); Chromium 6, 2 and 1 ms less; Firefox the same.
- d250142: Tree view: a change of any token restyles a page of trees for less in WebKit. Where a row begins, and what stands
  before its text, are no longer said in a custom property on each list (`--_trv-at`, `--_trv-lead`): each row computes
  them from its level's two counts in the properties that place it (its padding and grid columns, its container, its
  focus glow and its ripple). WebKit compares every inherited custom property that holds a `var()` with the value it
  had, token by token, on every element and pseudo-element that inherits it; said on a list, those two long lengths
  were compared again on every item, row and part under it at each change of contrast, scheme or system. Nothing it
  draws changes: every row's padding, grid columns, height and box, its container's, chevron's, icon's, trailing text's
  and ripple's boxes and every guide are the same in Chromium, Firefox and WebKit over sizes, chevron placements, icon
  spaces, highlights, product indents, both directions and a narrow width, and in forced colors in Chromium. A change of
  contrast on a page of fifty trees takes WebKit about 20 ms less style recalculation where motion is reduced (133 to
  113 ms) and 8 ms less where it is not (87 to 79); on the restyle page with ten trees, about 3 ms less.
- 1e0fe14: The browser floor is written in numbers: Chrome and Edge 125, Firefox 126, Safari 17.5 (macOS and iOS), set by
  `light-dark()`, CSS `round()` and custom states (`:state()`), with the JavaScript at ES2022. The web getting-started
  page (in all six languages) and the package README list each feature with its versions, and show how a product's entry
  point tests the features and loads the app with `import()` only when they are there, so that it can tell an older
  browser's visitor instead. The package's build now parses every file of `dist/` as ES2022 and fails on anything later.
  A box-shadow's lengths are read without a regular-expression lookbehind, with the same result. Nothing breaks.
- 8ff53f3: The components' shadow styles ship without their comments and indentation. The build takes them out of every Lit
  `css` template, in `dist/tanrei.bundle.js` and in the modules under `dist/` that a bundler reads. Strings, `url()`, escapes, interpolations, custom property values (whose runs of whitespace
  become one space) and the spaces that separate tokens stay. `dist/tanrei.bundle.js` is 15 % smaller (18 % with gzip),
  and `@tanrei/web/all` bundled for production 15 % (18 % with gzip). The styles mean the same as before; only text
  read back from a sheet, such as a value with `var()` in it, can show fewer spaces.
- cfc0657: The modules under `dist/` ship without source maps. Each map named its source under `src/`, which the package does
  not ship, so it led a debugger, or a bundler that reads maps (Vite warns that the map points to missing source files),
  to files that only the repository has. The 301 maps and the `//# sourceMappingURL=` comment in each module are gone:
  the package is 3.7 MB and 301 files smaller unpacked. `dist/tanrei.bundle.js` keeps its map, which carries its
  sources in itself.
- 6884e96: The package's `sideEffects` names only files the package ships: the modules under `dist/` and the style sheets. The
  nine `./src/…` patterns it also listed matched nothing in an installed package, since `src/` is not published. The
  package's own bundle (`dist/tanrei.bundle.js`), which is made from the sources, reads the same list for them, so it is
  byte for byte what it was. A bundler keeps exactly what it kept before.
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
