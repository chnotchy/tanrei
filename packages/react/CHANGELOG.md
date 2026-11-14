# @tanrei/react

## 0.1.0-next.1

### Minor Changes

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
- bc9b8bd: **Breaking — `@tanrei/react` has one entry per design system, and its main entry is the default system's.** What a
  product can import is what its system has, so an editor offers, and a type check accepts, only that:
  
  | Entry | What it exports |
  |---|---|
  | `@tanrei/react` | the default system's components (Tanrei) |
  | `@tanrei/react/m3-like`, `@tanrei/react/m3-expressive-like`, `@tanrei/react/cupertino` | that preset's components |
  | `@tanrei/react/advanced` | the components listed as advanced, the building blocks of others, in every system |
  | `@tanrei/react/all` | every wrapper, whichever system has its component: for a product's own system and for building one |
  
  What breaks:
  
  - `FabMenu` and `FabMenuItem` are no longer exported by `@tanrei/react`: the FAB menu lives in the m3-like layer, and
    the default system does not descend from it. Import them from `@tanrei/react/m3-like` or
    `@tanrei/react/m3-expressive-like` (or `/all`).
  - `SegmentedButton` and `Segment` are no longer exported by `@tanrei/react`: the default system leaves the segmented
    button out. Import them from `@tanrei/react/m3-like`, `/m3-expressive-like` or `/cupertino` (or `/all`).
  - `TextInput`, `NumberInput`, `ColorInput`, `OneTimeCodeInput`, `EmbeddedTextInput`, `Combobox`, `FilePicker` and
    `ModalLayer` — the advanced components — are no longer exported by `@tanrei/react`: import them from
    `@tanrei/react/advanced`. A product usually writes the component built from one instead (`TextField`, `NumberField`,
    `ColorField`, `OneTimeCodeField`, `ChatComposer`, `ComboboxField`, `FileUpload`, `Dialog` and the other surfaces), and
    each one's doc comment now names them.
  - In `@tanrei/react`, `variant` takes none of the values the default system leaves out: `<TextField variant="outlined">`
    (and `filled`) is a type error, for the text field, the chip, color, number, select and combobox fields, and the
    select. The preset entries take their own values (`/m3-like`'s `TextField` takes `outlined`); `/all`
    and `/advanced` take every value. This is a type only: the wrapper is the same component in every entry, so a
    bundler still keeps only what is imported, from any entry.
  - The package's main module is `dist/entries/generated/index.js` (was `dist/index.js`); a deep import of `dist/index.js`
    no longer resolves. Every entry exports `setWords`, `missingWords` and `TanreiEvent`.
  
  The entries are generated from the components manifests (`scripts/entries.js`), and the manifests now name each
  component's React entry (`react.import`): the system's own entry, `@tanrei/react/advanced` for an advanced component,
  and `@tanrei/react/all` in a product's manifest (`tanrei build`), where the system has no entry of its own.
  
  The React generator now reads the tag prefix and the npm scope from `tanrei.config.json` instead of writing them.
- f137126: **Breaking — React event props.** Every event prop is now `on` and the event's name in camel case, as React names its
  own (`onKeyDown`): 22 props that took the DOM event's lowercase name are renamed. The elements still fire their events
  in lowercase (`expandedchange`), as the platform's own events are named, so a listener added with `addEventListener`
  is unchanged.
  
  | Was | Is |
  |---|---|
  | `onAttachmentschange` | `onAttachmentsChange` |
  | `onContextrequest` | `onContextRequest` |
  | `onControlshiddenchange` | `onControlsHiddenChange` |
  | `onCopyfailed` | `onCopyFailed` |
  | `onCurrentchange` | `onCurrentChange` |
  | `onDetentchange` | `onDetentChange` |
  | `onEntryerror` | `onEntryError` |
  | `onExpandedchange` | `onExpandedChange` |
  | `onIndexchange` | `onIndexChange` |
  | `onLoaderror` | `onLoadError` |
  | `onNavigationopenchange` | `onNavigationOpenChange` |
  | `onPausedchange` | `onPausedChange` |
  | `onPickerrequest` | `onPickerRequest` |
  | `onPresentationchange` | `onPresentationChange` |
  | `onResizeend` | `onResizeEnd` |
  | `onResizestart` | `onResizeStart` |
  | `onRowschange` | `onRowsChange` |
  | `onSelectionchange` | `onSelectionChange` |
  | `onSendablechange` | `onSendableChange` |
  | `onSendblocked` | `onSendBlocked` |
  | `onWindowclasschange` | `onWindowClassChange` |
  | `onZoomchange` | `onZoomChange` |
  
  The old names are not kept as deprecated aliases: the package has had only a prerelease, and an alias would add a
  second listener for the same event and a second name to every editor's completions. TypeScript reports an old name as
  a prop the wrapper does not have; JavaScript reports nothing, so search a project for the names on the left.
  
  The copy button's and the code block's failure event is named `copyFailed` in their specs, as every other event is
  named in camel case; the web event is still `copyfailed`, and the native callbacks are still `onCopyFailed`.
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

### Patch Changes

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
- db60c6c: Popover, Select and Combobox: a surface that appears starts its entrance in the first frame drawn after it opens. In
  Safari and other WebKit browsers an entrance begun at the end of a long task — a list whose rows were rendered by the
  key that opened it, on a slow machine — was dated from the frame drawn before that task: part of it was over before
  its first frame, and all of it, the surface drawn whole at once, where the task outlasted the entrance.
- 2dd0327: An input chip is one Tab stop. Its remove action leaves the Tab order (`tabindex="-1"`): it stays pressable by pointer, touch and assistive technology and keeps its name, and the keyboard removes the chip with Backspace or Delete on the chip itself, as before — once per press, never for the repeats of a held key. While the chip can be removed, its button announces the two keys with `aria-keyshortcuts="Delete Backspace"`; a disabled or `not-removable` chip announces none. In a tag group, Tab now goes from chip to chip, and after a removal focus goes on to the next chip, or the one before where none follows, as it already did. The chip field already took every chip out of the Tab order and is unchanged. No baseline changes: only the focus order and an ARIA attribute differ. The native platforms still have the remove action as a second stop; each follows when it catches up.
- 7495506: Menu: a menu whose items are all inside groups now puts focus on its first enabled item when it opens, as MNU-1 says.
  Before, a menu that was mounted already open (a product that draws its menu only while it is open), or opened in the
  same task that gave it new groups, left focus on the anchor in Chromium and Firefox, and the arrow keys did nothing:
  the menu placed focus before its groups had drawn their slots, and a browser does not focus an item that is not drawn.
  Now the menu waits for itself, its groups and its rows to draw, then places focus. The wait is only microtasks, so no
  input comes between; a menu whose items are already drawn places focus at once, as before. This also covers a menubar's
  menu opened with Up Arrow, which still takes focus on its last enabled item (MBR-9).
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
- ed22865: **Navigation drawer: a destination keeps an end chevron's room only after trailing content of its own.** With the
  chevron at the end (and in a collapsible drawer, which draws a start chevron there), a destination's row kept the
  chevron's room and a gap, empty, at its end whether it had anything there or not. It now keeps them only after its own
  trailing content (a count, a glyph, the mark of a link that opens elsewhere), so that the trailing content of a level
  still stands in one column; a row with nothing at its end gives that room to its label: 32 px in the default system (the
  chevron's 20 and the gap's 12). In the documentation site's 240 px sidebar a component's label, two levels deep, had
  88 px and now has 120. Fixtures in which a destination's label was cut show more of it.
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
- 73b6291: On a server, the React wrappers now write their props as attributes. Before, `renderToString(<TextField label="Name" />)` gave a bare `<tanrei-text-field>`: the label, the value and the states only arrived after hydration. Now each string, number and boolean prop the element reads from an attribute is written as that attribute, under the attribute's name from the elements' manifest (`maxLength` is written as `maxlength`, `supportingText` as `supporting-text`) and by the element's own converter. A prop at its default writes nothing, so a `false` is never written as present, and a boolean that is on by default and turned off writes what the element reads as off (`icon-only="false"`, `no-handle`). Handlers, objects and arrays are still set in the browser. The shadow root is not rendered on the server, and Lit's server renderer (`@lit-labs/ssr-react`) is not supported. The React guide has a new Next.js (App Router) section, in all six languages.
- e91d709: Smaller bundles: a product that imports a few wrappers now bundles only those wrappers and their elements, not every
  element of `@tanrei/web`. `import { Calendar } from '@tanrei/react'` went from about 2.4 MB minified (esbuild; 2.8 MB
  with Vite) to about 154 kB (200 kB with Vite) — the calendar and the buttons it draws, plus React and `@lit/react`.
  Importing a wrapper still defines its element, and the elements it is drawn with; nothing else changes in how wrappers
  are imported or used. The package now declares `"sideEffects": false`, so a bare `import '@tanrei/react'` defines no
  element: import the wrappers you render.
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
- Updated dependencies [2cf22e1]
- Updated dependencies [73d9b8e]
- Updated dependencies [a03d145]
- Updated dependencies [132b7ce]
- Updated dependencies [09f8ab7]
- Updated dependencies [4e905c9]
- Updated dependencies [f51b33f]
- Updated dependencies [69afca4]
- Updated dependencies [6e7a404]
- Updated dependencies [1ade52d]
- Updated dependencies [bf5b6de]
- Updated dependencies [f1e78ee]
- Updated dependencies [2f35840]
- Updated dependencies [e8bf9cb]
- Updated dependencies [8d0e2b0]
- Updated dependencies [f799b0a]
- Updated dependencies [b96f9a9]
- Updated dependencies [a22289a]
- Updated dependencies [a52d722]
- Updated dependencies [1b6a2cc]
- Updated dependencies [f6a47af]
- Updated dependencies [6f7bedc]
- Updated dependencies [9fd3a23]
- Updated dependencies [02031c4]
- Updated dependencies [2b1b8a9]
- Updated dependencies [98e34cc]
- Updated dependencies [adf8c4c]
- Updated dependencies [48873d6]
- Updated dependencies [d354925]
- Updated dependencies [d4af6fb]
- Updated dependencies [930031d]
- Updated dependencies [320f78b]
- Updated dependencies [6b01d3e]
- Updated dependencies [2c75918]
- Updated dependencies [f2dd913]
- Updated dependencies [08d45b6]
- Updated dependencies [bf096fd]
- Updated dependencies [68c45ed]
- Updated dependencies [e1a3154]
- Updated dependencies [d5e0409]
- Updated dependencies [17a37da]
- Updated dependencies [8108674]
- Updated dependencies [6645c5b]
- Updated dependencies [8c108d1]
- Updated dependencies [d0d5136]
- Updated dependencies [5c2597b]
- Updated dependencies [266b875]
- Updated dependencies [16bbd73]
- Updated dependencies [37da571]
- Updated dependencies [6d5fe67]
- Updated dependencies [01640f4]
- Updated dependencies [f535d8f]
- Updated dependencies [c96a911]
- Updated dependencies [39cfd08]
- Updated dependencies [8104798]
- Updated dependencies [c7b509e]
- Updated dependencies [d5d3e8f]
- Updated dependencies [6636594]
- Updated dependencies [16608f6]
- Updated dependencies [0e36941]
- Updated dependencies [90e6108]
- Updated dependencies [88c14f0]
- Updated dependencies [de75588]
- Updated dependencies [2cc506b]
- Updated dependencies [d97b53b]
- Updated dependencies [ede88e8]
- Updated dependencies [aae9ddd]
- Updated dependencies [0d23356]
- Updated dependencies [90c0631]
- Updated dependencies [9ca3d46]
- Updated dependencies [14b445d]
- Updated dependencies [dcc5d30]
- Updated dependencies [99de42c]
- Updated dependencies [fda53ad]
- Updated dependencies [78932fb]
- Updated dependencies [9646c7f]
- Updated dependencies [d8fb809]
- Updated dependencies [2e4a5ab]
- Updated dependencies [44976d9]
- Updated dependencies [3b0cc7e]
- Updated dependencies [84946fb]
- Updated dependencies [0dd718d]
- Updated dependencies [108305a]
- Updated dependencies [aacef9e]
- Updated dependencies [3bbfeaf]
- Updated dependencies [0a98a97]
- Updated dependencies [25dd0d0]
- Updated dependencies [8405fc9]
- Updated dependencies [11963f3]
- Updated dependencies [3132a46]
- Updated dependencies [b8bdb5f]
- Updated dependencies [7e694f4]
- Updated dependencies [a3f8151]
- Updated dependencies [cdaabaa]
- Updated dependencies [c8f2fae]
- Updated dependencies [0a27acd]
- Updated dependencies [e690d47]
- Updated dependencies [db60c6c]
- Updated dependencies [e9038b1]
- Updated dependencies [991095d]
- Updated dependencies [d5f05c8]
- Updated dependencies [32c4e10]
- Updated dependencies [74b5a43]
- Updated dependencies [bbd7afb]
- Updated dependencies [654a435]
- Updated dependencies [8d5a636]
- Updated dependencies [66ad9dd]
- Updated dependencies [74c9435]
- Updated dependencies [5fe57e9]
- Updated dependencies [f744584]
- Updated dependencies [b0e55fb]
- Updated dependencies [8c13679]
- Updated dependencies [910c7b6]
- Updated dependencies [aa194f8]
- Updated dependencies [14aff2c]
- Updated dependencies [e0eaa64]
- Updated dependencies [61cebf8]
- Updated dependencies [7a1eb3e]
- Updated dependencies [6d89bfe]
- Updated dependencies [377bc4a]
- Updated dependencies [41aabb3]
- Updated dependencies [f4248ab]
- Updated dependencies [38b7cd2]
- Updated dependencies [629730e]
- Updated dependencies [3990b23]
- Updated dependencies [df119df]
- Updated dependencies [b921047]
- Updated dependencies [c3e2126]
- Updated dependencies [d418520]
- Updated dependencies [e711cc1]
- Updated dependencies [2709512]
- Updated dependencies [a72bfbb]
- Updated dependencies [f778ab4]
- Updated dependencies [0918093]
- Updated dependencies [2dd0327]
- Updated dependencies [da87128]
- Updated dependencies [397cd93]
- Updated dependencies [aaba9dc]
- Updated dependencies [15ff26b]
- Updated dependencies [b2eb818]
- Updated dependencies [abc8133]
- Updated dependencies [0a27acd]
- Updated dependencies [3df6fcc]
- Updated dependencies [abc6706]
- Updated dependencies [6e9bc90]
- Updated dependencies [792e1e6]
- Updated dependencies [1a22c3c]
- Updated dependencies [61c31a6]
- Updated dependencies [ad6f7bd]
- Updated dependencies [16c656e]
- Updated dependencies [c8f9fe8]
- Updated dependencies [5287d31]
- Updated dependencies [aba6c70]
- Updated dependencies [7536862]
- Updated dependencies [08f44fd]
- Updated dependencies [7495506]
- Updated dependencies [72469f9]
- Updated dependencies [fe62465]
- Updated dependencies [3188580]
- Updated dependencies [4d18319]
- Updated dependencies [e6068b9]
- Updated dependencies [a0f001b]
- Updated dependencies [71dad17]
- Updated dependencies [9283a03]
- Updated dependencies [073a8bd]
- Updated dependencies [06647d8]
- Updated dependencies [1ecb145]
- Updated dependencies [712e7d2]
- Updated dependencies [d1611cc]
- Updated dependencies [6b2167e]
- Updated dependencies [c13331a]
- Updated dependencies [801a2ad]
- Updated dependencies [d93ce2b]
- Updated dependencies [0a27acd]
- Updated dependencies [9b30315]
- Updated dependencies [6ee3c72]
- Updated dependencies [7a19510]
- Updated dependencies [55bc61a]
- Updated dependencies [727c99d]
- Updated dependencies [58937c0]
- Updated dependencies [04337f7]
- Updated dependencies [88f6193]
- Updated dependencies [8da3d7b]
- Updated dependencies [1300097]
- Updated dependencies [2fe1f5a]
- Updated dependencies [c9d76e2]
- Updated dependencies [45ca156]
- Updated dependencies [19e74c3]
- Updated dependencies [25ecc35]
- Updated dependencies [ed22865]
- Updated dependencies [51771d8]
- Updated dependencies [4e7bdd8]
- Updated dependencies [6c7f52d]
- Updated dependencies [328d945]
- Updated dependencies [927c90a]
- Updated dependencies [ad0773a]
- Updated dependencies [ac7c2d3]
- Updated dependencies [fb1ce26]
- Updated dependencies [66f1b1c]
- Updated dependencies [e985d43]
- Updated dependencies [07507aa]
- Updated dependencies [8e7e057]
- Updated dependencies [1c85b08]
- Updated dependencies [17a9754]
- Updated dependencies [dd76e41]
- Updated dependencies [9fd9aba]
- Updated dependencies [5186d65]
- Updated dependencies [c89c4b6]
- Updated dependencies [b1fb04c]
- Updated dependencies [acee0da]
- Updated dependencies [7072d6a]
- Updated dependencies [a532977]
- Updated dependencies [393a0c8]
- Updated dependencies [14712cc]
- Updated dependencies [b8106ad]
- Updated dependencies [2a2437f]
- Updated dependencies [6016e87]
- Updated dependencies [93ff352]
- Updated dependencies [14c4ed6]
- Updated dependencies [b0e5f61]
- Updated dependencies [fba98d4]
- Updated dependencies [b9d4879]
- Updated dependencies [a45036e]
- Updated dependencies [ef0af92]
- Updated dependencies [db7055c]
- Updated dependencies [e336a97]
- Updated dependencies [20f3d3a]
- Updated dependencies [aa0133e]
- Updated dependencies [2087222]
- Updated dependencies [bd5c612]
- Updated dependencies [155b5de]
- Updated dependencies [6e23003]
- Updated dependencies [5368526]
- Updated dependencies [afb26f3]
- Updated dependencies [e6f540c]
- Updated dependencies [b1ddfd8]
- Updated dependencies [590e070]
- Updated dependencies [3b1d8a5]
- Updated dependencies [551ad4c]
- Updated dependencies [01aa43a]
- Updated dependencies [615f0c9]
- Updated dependencies [2eb03ec]
- Updated dependencies [05e39e7]
- Updated dependencies [6c626ae]
- Updated dependencies [0424ae9]
- Updated dependencies [fef5abf]
- Updated dependencies [fefe825]
- Updated dependencies [e9cc3aa]
- Updated dependencies [d31aedb]
- Updated dependencies [ca2160c]
- Updated dependencies [b1ba89f]
- Updated dependencies [cb29df6]
- Updated dependencies [14046b7]
- Updated dependencies [4e8cfcc]
- Updated dependencies [7f7e4fb]
- Updated dependencies [3a64e86]
- Updated dependencies [d0de4b8]
- Updated dependencies [7139c1d]
- Updated dependencies [ccb6524]
- Updated dependencies [abced4a]
- Updated dependencies [265e59c]
- Updated dependencies [1a4d2b0]
- Updated dependencies [d7cfdcf]
- Updated dependencies [8bc07c7]
- Updated dependencies [59c520f]
- Updated dependencies [9bd59f4]
- Updated dependencies [029e299]
- Updated dependencies [52cf232]
- Updated dependencies [cd48cda]
- Updated dependencies [4e480be]
- Updated dependencies [e265070]
- Updated dependencies [e0810e9]
- Updated dependencies [4b8dd96]
- Updated dependencies [1f0c823]
- Updated dependencies [77b361c]
- Updated dependencies [0a27acd]
- Updated dependencies [0a27acd]
- Updated dependencies [b9c5fbe]
- Updated dependencies [348b6be]
- Updated dependencies [e088124]
- Updated dependencies [af6b480]
- Updated dependencies [d43dd75]
- Updated dependencies [2442137]
- Updated dependencies [3952e87]
- Updated dependencies [754642a]
- Updated dependencies [3589b98]
- Updated dependencies [c749f65]
- Updated dependencies [552dad2]
- Updated dependencies [d6814f1]
- Updated dependencies [cbca9e1]
- Updated dependencies [37db622]
- Updated dependencies [2d1369b]
- Updated dependencies [a1657e3]
- Updated dependencies [afb4e69]
- Updated dependencies [26e14d1]
- Updated dependencies [07c7d78]
- Updated dependencies [3327c3c]
- Updated dependencies [f669310]
- Updated dependencies [11e9c59]
- Updated dependencies [6805aba]
- Updated dependencies [f421db8]
- Updated dependencies [ba45429]
- Updated dependencies [c943bb4]
- Updated dependencies [bd70c47]
- Updated dependencies [f31e5d7]
- Updated dependencies [e60bcc3]
- Updated dependencies [669cd45]
- Updated dependencies [0f0e1eb]
- Updated dependencies [2220dec]
- Updated dependencies [1d49987]
- Updated dependencies [d250142]
- Updated dependencies [1e0fe14]
- Updated dependencies [8ff53f3]
- Updated dependencies [b787a0c]
- Updated dependencies [cfc0657]
- Updated dependencies [6884e96]
- Updated dependencies [5029351]
  - @tanrei/web@0.1.0-next.1

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

### Patch Changes

- Updated dependencies [f181fc2]
  - @tanrei/web@0.1.0-next.0
