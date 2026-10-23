# @tanrei/docs

## 0.1.0-next.1

### Minor Changes

- 50b5234: Documentation site: every page that has a Markdown version now has actions at its head. They are Tanrei's Button with
  menu, in the page header's actions part: beside the title in a wide head, under its text in a narrow one. The main
  action copies the page as Markdown. The menu has View as Markdown, Open in ChatGPT and Open in Claude, which start a
  chat that reads the page's Markdown. Below them, under "MCP server", are Add to Cursor and Add to VS Code, the editors'
  links that install the MCP server, and an item that copies the Claude Code command. Each copy, and a copy that fails,
  is announced in a snackbar. The words are in the site's six languages. Where no script runs, a link to the page's
  Markdown takes the actions' place. The MCP server is the one the page on AI agents configures. Its name and package
  come from `tanrei.config.json`.
- a25945b: **Theme Studio: Export, and the banner of a shared layer.**
  
  - **Export**, in the bar, opens a side sheet. Its first line says whether the schema, the token engine and the build's
    checks accept the file (problems stop the download; warnings lead to Accessibility). A layer on an example of the
    theme gallery (m3-like, cupertino, m3-expressive-like) **depends on the example** by default, and can instead
    **write every value**: the file then holds what the example gives as well as what you changed, extends what the
    example extends, and builds to the same stylesheet, documents and warnings as the file that depends on it. A component
    that lives in the example (the FAB menu) is still included from it. Three tabs follow: **File** (copy, or download as
    `<id>.system.json`), **CSS** (the declarations of the stylesheet `tanrei build` writes for the web that differ from
    the base system's, as the build writes them, and the whole `<id>.css` to download) and **What next** (the commands,
    each one the CLI takes as it is, and a link to the layer to copy).
  - **No one-line command.** The CLI takes no layer in a command (`tanrei init` takes an id and a shipped system), so
    Export shows none: What next runs `tanrei init`, then puts the downloaded file in place of the one it writes.
  - **The banner of a shared layer** replaces the earlier notice. It says which layer came with the link and what it is
    built on, names the visitor's own layer, and keeps it until they keep the link's layer, edit it, or go back to theirs;
    it offers Export, so a layer that was sent can be taken as a file without replacing anything. A link opened where
    nothing was kept now shows the banner too, which may be closed.
  - The file under every panel keeps its id, name and checks, with Export and Start over; its JSON, copy, download and
    next steps moved to Export. `mountStudio` takes `links.start` (the page that takes a product from a layer to every
    platform), and the page's API has `openExport(tab)` and `closeExport()`.
- 19c402d: **Theme Studio previews the layer on five screens built from Tanrei's components.** The preview no longer shows a
  button and a few samples: it draws an **overview** of every kind of component (with the system's own text styles,
  icons, intents, steps and the layer's own tokens), a **dashboard**, a **settings form**, a **list and its detail**, and
  a **documentation page**, chosen from the preview's bar. Every component on them follows the layer, and the overview
  draws one sample per variant and size a component declares — buttons, cards, tabs, chips, tags, callouts — a variant
  or a size the layer adds included. The screens' text is a product's, in each of the Studio's six languages, with
  numbers, money and dates formatted for the language.
  
  - **How it is seen.** Light, dark, or the two side by side (one large pane by default), and the three contrast levels as
    the documentation's header offers them. None of it is the layer's: it is remembered in this browser and never saved
    in the file. A screen is drawn once, and switching screens or modes moves what exists.
  - **What a setting reaches.** `highlight(ids)` outlines, for a moment, the parts of the screen that read any of these
    tokens or a token that follows one of them, and says how many there are; `clearHighlight()` takes the outline off.
    It is there for the Studio's controls to call while one is hovered or focused (`ctx.highlight`), and for a script
    (`window.tanreiStudio.highlight`).
  - The host loads `@tanrei/web/table.css` and `@tanrei/web/prose.css` with the Studio's other stylesheets: the screens
    hold a table and a page of text (the standalone app and the docs page do).
  
  **Breaking (Studio dictionaries).** A language file gains `screens` and loses the old card sample's words
  (`sample.cardTitle`, `cardBody`, `link`, `cancel`, `save`).
- 0c59e32: **Theme Studio is a tool of its own page.** On the docs site it moves to `/studio/` (and `/<language>/studio/` in each
  translation): the whole window, with the Studio's own bar and none of the documentation's header or navigation. The
  page that held it, Foundations › Theme Studio, is now a short page about the tool that links to it.
  
  - **The frame.** A bar across the top — the host's brand and items, **undo** and **redo**, the file's state — and under
    it the rail of levels, a large preview and, on the right, the panel of what the level edits. Each column scrolls by
    itself. The panel is resized by a handle (Tanrei's Handle: dragged, or from the keyboard — the arrow keys, Home and
    End, Enter to its least and back), and the width is kept in the browser, for each level apart: Every token and
    Source keep their wider start. In a narrow window the three stand in one
    column. The controls are the ones the Studio had; they moved into the frame as they were.
  - **Undo and redo** step through what was committed, from the bar or with ⌘Z and ⇧⌘Z (Ctrl+Z, Ctrl+Shift+Z and Ctrl+Y
    elsewhere); in a field that holds text the keys stay the field's. With a file behind the Studio (`tanrei studio`),
    each step is saved like any other edit.
  - **The layer is in the address.** On the docs site the layer is written into the page's fragment (`#layer=…`, the
    layer file's text compressed and in base64url), so a link copied from the address bar opens the Studio on the same
    layer, in any browser. A link never writes over the layer a browser kept: the Studio shows the link's layer under a
    notice, keeps the visitor's own until they edit the link's or choose **Keep this layer**, and **Back to my layer**
    returns to theirs.
  
  **Breaking (`mountStudio`).** The Studio now takes the whole page it is mounted in and draws its own bar; a host gives
  its items to that bar with the new `bar: { start, end }` option instead of drawing a bar of its own (the standalone
  app's brand, file, language and theme are now in the Studio's bar). `address: true` keeps the layer in the page's
  address. The Studio no longer writes `data-ts-mounted` on the document's root, and its stylesheet no longer sets
  `--sl-content-width`: a host gives it a page of its own.
- 6224e55: **Theme Studio: a rail of the look, the panel it opens, and Inspect.** The four levels (Essentials, Groups, Every
  token, Source) are gone.
  
  - **The rail** lists what a layer holds. First the nine rows of the look, in the order of how much of it they change:
    brand color, gray, typeface, size (density and the size unit, with the least target), corners, corner smoothing,
    icons, press feedback and focus. Each says what it holds now and draws a small sample in the layer itself. Then the
    rest: the base system, the eight dials, every palette, each component, every behaviour, your vocabulary, the layer's
    own words, and accessibility. Pressing a row shows its controls in the panel on the right, where Groups' panels now
    stand, each with its row. The row the panel shows is marked as the current one. The file (its id, the checks, copy
    and download) stays at the foot of every panel, and the preview's warnings count opens Accessibility.
  - **Lock and shuffle.** Each row has a lock. The bar's **Shuffle** gives every row that is not locked another of its
    usual values, written as that row's own controls write them, in one step to undo. The locks are kept in the browser.
  - **Inspect** opens over the panel, wider, at **Tokens** (the token tree and the chosen token's editor, then the
    pattern rules) or **Source** (the layer file). It is a toggle in the bar, and opens at the tab it was last at. A link
    to a token, such as a component's "Every token of it" or a token named in a warning, opens Inspect at that token.
    The panel's width is kept apart for the sections and for each tab of Inspect.
  - In a narrow window each list of the rail is one line that scrolls by itself, above the preview and the panel.
  - The words are in the six languages.
  
  **Breaking (`mountStudio`'s API).** `setLevel` is gone: `show({ section })` shows a section (`color`, `neutral`,
  `typeface`, `size`, `radius`, `smoothing`, `icons`, `press`, `focus`, `base`, `dials`, `palettes`, `components`,
  `behavior`, `vocabulary`, `about`, `a11y`), and `show({ inspect: 'tokens' | 'source' })` opens Inspect. `getState()`
  reports `section`, `inspect` and `locks` in place of `level`, and `shuffle()` shuffles. The Studio's root says
  `data-section` and `data-pane` in place of `data-level`. What the browser keeps changes shape: a section, Inspect's
  tab, the locks and a width for each pane.

### Patch Changes

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
- c7149b0: Documentation site: the brand marks reach the site. The header's link to the first page is the symbol, drawn inline
  in `sys.color.on-surface` so it follows the scheme and the contrast, at an icon's size in an icon button's box (its
  centre, its inset and its focus ring are the menu button's), with the site's name as its accessible name. The
  favicon is the symbol, following the reader's scheme and contrast by itself; the ICO (16, 32, 48), the home-screen
  icon (180) and a social image (the wordmark, 1200 × 630, now named by `og:image`) are rendered from the marks at
  build time. The marks live in `design/brand/`, are refreshed from Figma with `pnpm brand:pull`, and `pnpm generate`
  paints the copies an image needs (the README's header uses them).
- 8e1a3bb: Documentation site: the content security policy is enforced, no longer only reported.
  
  - The host's header (`public/_headers`) is now `Content-Security-Policy`, not `Content-Security-Policy-Report-Only`. It
    adds the origins of the analytics beacon the host puts into every page (`https://static.cloudflareinsights.com` for the
    script, `https://cloudflareinsights.com` for its reports) and `'wasm-unsafe-eval'`, which the search needs to compile
    its index's WebAssembly. Enforced without it, the search would stop working.
  - The build writes a second policy into every page, as a `<meta http-equiv="Content-Security-Policy">` right after its
    `<meta charset>`: it names the SHA-256 hash of each inline script the page holds and of each event handler in its
    markup (the demos' `onclick`, through `'unsafe-hashes'`). A browser enforces both policies, so an inline script runs
    only if the page holds it by its hash. The hashes are per page because the whole site's would not fit in one header
    line, and they change whenever the scripts' text does.
  - What broke: an inline script or event handler that a page creates while it runs (not written into its HTML) is
    refused. A script the host injects inline into a page is refused too.
- a8ece3c: Documentation site: the Accessibility and Color pages state the contrast the token build enforces, and no less. Text
  in the two high-contrast schemes is held at 7:1, not 4.5:1; large text has no lower threshold (every text role is held
  at 4.5:1); and a status's mark is held at 3:1 on its own tonal container. Each ratio on the two pages, in every
  language, is read from the build's own constants (`CONTRAST_THRESHOLDS`, now exported by the token build's invariants),
  so a page cannot drift from what the build checks.
- d7a53ae: Documentation site: a page loads the scripts of the elements it draws, and no others. A page's demos used to import
  the whole of `@tanrei/web`, which defines every element of the package, and every page's content column imported the
  Table, the Callout and the Code block whether it had one or not. Each page now asks for the module of each element it
  holds that is not defined yet, from a table made from the web package's Custom Elements Manifest when the site is
  built; an element added later, or drawn in a component's shadow root, is defined the same way. The search is defined
  when it is first used: until then its trigger is drawn by the stylesheet and works as a button (a press, Enter or
  Space, both chords), a pointer over it or focus on it defines the element, and what is typed right after a chord
  goes into the field. The home page's script falls from 608 KB to 172 KB compressed, a component's page (Button)
  from 611 KB to 320 KB. In the browser's console, the whole package is `await tanrei`; it is fetched only when
  asked for.
- 8f724ab: Docs site: every page, in all six languages, has a Markdown version beside it — `<path>.md` for the page at
  `<path>/` (`/foundations/color.md`, `/ja/components/button.md`), and `index.md` for each language's home page — and
  names it in its head (`<link rel="alternate" type="text/markdown">`). The page that was not found has none. The file is
  written from the built page when the site is built, from the part the site's search reads, so it says what the page
  says in the page's own language: headings, prose, lists, tables as GFM tables, code blocks as fenced blocks with their
  language, notices as quotes with GitHub's alert mark, each tab of a set under its label, link cards as a list. The
  examples the page draws are left out. It opens with a front matter — `title`, `description`, `url` and
  `last_updated`, which is the date the sitemap gives the page, read once from the same history — then the title and
  the description.
  
  A component's page holds its own prose and, in its Specs section, the component's current spec as Markdown in place of
  the tables drawn from it (in English, as the spec is written in every language): `/components/<name>.md` was the spec
  alone and is now the whole page. `/llms-full.txt` still holds the specs alone. The head's link of a translated
  component page now names that language's file, without `hreflang="en"`.
- 668746d: Documentation site: a fixture's own document is only what a window of the fixtures' gallery draws.
  
  - A stage no longer has the action that opened its fixture alone in a new tab, and the gallery no longer begins with
    "Every fixture on a page of its own" (in every language).
  - `/fixtures/<component>/?id=<fixture>` draws that fixture, as a window shows it; without `?id` it draws nothing (it
    drew every fixture of the component), and `?theme=` is gone (the document takes the site's stored scheme, and a
    window sets its own).
  - The sitemap no longer lists the 90 pages under `/fixtures/`; each still says `noindex` and stands outside the site's
    frame.
- 21b2f2a: Documentation site: every fixture of every component is drawn.
  
  - The App shell, Code block, Inline code, Link, Menu, Navigation drawer, Previous and next links, Steps and Timeline
    pages drew none of their 258 fixtures ("Not available in the installed web build", which was not so: the site's own
    renderer did not know their markup). Each is now drawn alone in a window of its own.
  - A fixture drawn in a window — those, and every presented one (a modal dialog, a sheet, a tooltip) — is drawn from the
    web package's own document of it, the one its tests take each baseline from, at the size of that baseline: what the
    page shows is what every platform's baseline is compared with. A dialog's actions stand in its actions row, and a
    popover beside its anchor, as there.
- 9c3d438: Documentation site: a component's fixtures are a gallery of stages, not a table.
  
  - Every fixture stands on a stage of its own, named by its id, with the props that make it as its caption, grouped by
    the first token axis of the spec that tells its fixtures apart. Its header holds the stage's scheme (light or dark),
    a copy of the fixture's markup and a link to the fixture alone.
  - At a phone's width every fixture is in view: in the table, the drawing of most fixtures began past the table's
    visible box and could only be found by scrolling the table sideways.
  - A fixture as wide as its layout starts at the harness's width, fills its stage, and can be made narrower or wider
    with a handle on the stage's edge (a window splitter: drag it, or use the arrow keys, Home, End and Enter).
  - A presented fixture (a modal dialog, a sheet, a tooltip, a docked picker) is drawn presented, in a window of its own
    the size the web harness gives it, instead of an "Open" button. Nothing it opens leaves its window, and it never
    takes the focus from the page.
  - A horizontal divider, a linear progress indicator and a slider were drawn 0 px wide; they are drawn at the harness's
    length.
  - `/fixtures/<component>/` shows every fixture of a component on one page, and `?id=<fixture>` one fixture alone.
- e9d5389: Documentation site: every fixture is drawn from the web package's own document of it, in the page too.
  
  - A fixture drawn in the page is now the stage the web package's tests draw it on and take its baseline from, with the
    component's staging scoped to it: what the Specs tab shows is what every platform's baseline is compared with. The
    site's second renderer of fixtures is gone.
  - The Code block, Inline code, Link, Navigation drawer, Previous and next links, Scroll area, Steps and Timeline pages
    draw their fixtures that are not presented in the page, instead of each in a window of its own; a scroll area is
    scrolled to its middle there by the same step its document takes.
  - A stage holds the room of its baseline before it is drawn, and that is the room it takes: nothing below it moves when
    it is drawn (179 stages of 2,390 grew at 1440 wide, 345 at 390).
  - A fixture as wide as its layout has its width handle wherever its staging gives it that width, and is laid out at the
    column's width where the column is narrower.
  - The words "Not drawn on this page yet; see the examples above." are gone in every language: every fixture of a
    component the web implements is drawn.
- 8045f4c: Documentation site: a component's fixtures stand one under another.
  
  - Each stage of the Specs tab's fixtures is one row of one column, as wide as the column, instead of a row of stages
    side by side that wrapped where it ran out of room. What a stage draws keeps its own size, in the middle of it; the
    headings of the axis the stages are grouped by stay.
  - The width handle of a fixture as wide as its layout can make it as wide as the stage's whole row.
- ea556be: The fixture gallery's windows draw on the site again. The host sent `X-Frame-Options: DENY` with every document, which
  refuses a frame of the same site too, so every window of a component page's Specs tab (`/fixtures/<component>/?id=…`)
  stood empty. The fixture documents are now sent `X-Frame-Options: SAMEORIGIN` and the pages' `Content-Security-Policy`
  with `frame-ancestors 'self'` (framed by this site, and by no other); every other document is still framed by no page, and the
  pages' policy now allows a frame of the site's own documents (`frame-src 'self'`). A window the browser
  refused to draw no longer makes the page's script throw and stay `inert`. The docs' browser tests serve the built site
  with the host's headers, read as the host reads `_headers`, and a test asks that the windows of a component page draw
  their fixtures.
- 3508143: Documentation site: the getting-started pages read as they will from 0.1.0 on, in the six languages. The Web, React
  and Your own design system pages install from npm first (`npm install @tanrei/web`, `@tanrei/react` with
  `@tanrei/web`, `@tanrei/cli` as a development dependency, `npx -y @tanrei/mcp`) and build from the source second;
  Getting started no longer says that nothing has been released. One notice at the top of each install page says what
  differs today, from the version in `tanrei.config.json` and the paused platforms: while the version is a prerelease,
  its dist-tag and what to install until the release (during the 0.x prereleases backward compatibility is not kept);
  on a paused platform's guide, that it is not published until it catches up with the specs. Where nothing differs the
  notice draws nothing, so the pages need no edit when 0.1.0 is released. A paused platform's registry steps are under
  "Once it is published". The governance now says what npm's `latest` is until 0.1.0.
- a9d2fb1: Documentation site: the header's actions stand on one line, and the bar holds only those of the window's class. The
  theme's select had its box 2 above the search trigger beside it: the bar's cell is as tall as the minimum target, and
  the select drew its box at the top of it. The header now gives the select no cell height, so the bar centres its box,
  and its own hit area still reaches the target. The bar also held both arrangements of the actions, four items, of
  which the stylesheet hid one or two; now only the arrangement of the window's class has the bar's actions slot, three
  items at most in a wide window and two in a compact one, chosen before the bar is defined and again when the class
  changes.
- d507f74: Documentation site: the header, left to right — the menu button at every width (it collapses and expands the sidebar
  beside the content and opens its column over it; the drawer no longer has a row of its own for it), the wordmark, the
  design system the lists show as a button beside it that opens a menu of the shipped systems and "Edit theme" (Theme
  Studio), the search, the appearance as an icon button whose menu holds the color scheme (auto, light, dark), the
  contrast (standard, medium, high) and "Edit theme", and the language as an icon button whose menu links the six
  languages. In a compact window the design system's button stands first in the drawer. The "All components" switch moves
  to the top of the drawer's list. Removed: the theme's select and the compact window's combined menu of theme and
  language. Snapshot baselines are unchanged: no fixture draws the site's header.
- 2cdcfc1: Documentation site: the home page's hero is drawn right before its elements are defined, and nothing in it moves when
  they are.
  
  - The primary action's label is never drawn in the plain link's color over the Button's dark fill. The plain anchor
    each link form holds until its element is defined is now taken away in the same task as the element is defined, by
    the first module script of every page; it was taken away only once the whole web package had arrived, while the
    header's script had defined the Buttons long before (about 3.9 s on a throttled phone, 0.4 s on a desktop line).
  - The title and the copy stand at the top of the hero's first column instead of at the middle of the specimen beside
    them, and the specimen's stage holds the rows its Buttons take once drawn: the desktop home page's layout shift
    (CLS) was 0.058 and is 0.
- 43eb500: Documentation site: a page not in Japanese no longer downloads whole files of Noto Sans JP for the Japanese it
  quotes.
  
  - Noto Sans JP comes in about 120 files by Unicode range, and a page takes each whole file one of its characters is
    in. The Button page's guideline quotes 保存 and デプロイ: six characters, 107 KB of three files. The site now also
    registers the family cut down to the Japanese characters its specs and its pages in the other languages hold, as
    "Noto Sans JP Cut", named before Noto Sans JP in each text stack on a page whose language is not Japanese. The
    characters are drawn with the same glyphs at every weight; one the cut does not hold falls through to the family's
    own files. A page in Japanese is drawn as before and never asks for the cut.
  - What a page transfers before it is idle, at 412 px: the Button page 1196 KB → 1152 KB, Text field 1498 → 1313,
    Combobox 1497 → 1414, Field 1431 → 1230, Text input 1386 → 1289, Table 1373 → 1218. The home page draws no Japanese
    and takes 1 KB more (the cut's faces in the stylesheet).
  - A font file is no longer inlined into the site's stylesheet however small it is: inlined, every page would carry it.
- 08ee59e: Documentation site: the header's language menus mark the language being read as the menu's current link item
  (`current`), not with a trailing check glyph. Assistive technology is now told which language is current
  (`aria-current="page"` on its link), and the row is drawn with the menu's current fill, as the menu specifies for the
  destination a person is at; a check belongs to a choice the menu holds, which a language link is not.
- 0fccfb4: Documentation site: every page says when it last changed, under its title and description ("Last updated October 22,
  2026", in the page's language). The date is the one the sitemap gives the page — the newest merge into the published
  branch of what the page is made from — read from the history once per build, never the time of the build. A
  component's page now also changes when its component tokens change (its own group's file and any shared set that
  names it), and a page that draws token tables when anything under `tokens/` changes; the sitemap's dates follow.
  Every page's JSON-LD now describes the page itself (`WebPage`: its address, title, language and description) with that
  date as `dateModified`. The sitemap, the page's head, its Markdown's `last_updated` and `dateModified` write the
  date as one string, in UTC. The day under the title is the reader's: written in the page's language for the
  reader's own time zone before the page is first drawn, so the same change reads 23 October in Tokyo and 22 October
  in Los Angeles. Without script it is the UTC day, the one the sitemap names.
  Broke: a page's `date` front matter and the "Published" line it drew are gone — no page carries a date of its own.
- a2f3711: Documentation site: text for language models and other programs that read the site, generated from each system's
  components manifest and the specs, never from the site's pages. `/llms.txt` is the site's index in the llms.txt form:
  the components the default system ships first (and its advanced parts), then apart the ones it does not ship — the
  segmented button, which it leaves out (with what to use instead), and the FAB menu, which lives in the m3-like layer —
  then the shipped design systems, the site's pages and an "Optional" section. Each shipped system has an index of its
  own at `/systems/<id>/llms.txt`, which follows that system's manifest. `/components/<name>.md` is every component's
  page as Markdown: its availability in each system, its names and status on each platform, its anatomy, props (with the
  web attribute), events, slots, items, states, accessibility, every requirement in EARS form with its id, and its tokens
  as written. `/llms-full.txt` holds the pages of every component the default system ships, in one file. A component's
  page names its Markdown version in its head (`<link rel="alternate" type="text/markdown">`, in every language).
- 875bf9c: Documentation site: a component's page as Markdown (`/components/<name>.md`) and `/llms-full.txt` escape a `<` that a
  spec's text writes outside a code span, so a placeholder such as `comp.tag.<variant>.disabled.container.color`, or an
  element named in prose such as `<dialog>`, is read as text and not swallowed as an HTML tag.
- 9cef2ff: Documentation site: nothing says any longer that Tanrei is unreleased. The home hero's eyebrow says "prerelease" from
  the version in `tanrei.config.json`, in the six languages, and drops the word when the version is a release. The
  Callout's examples (its spec's `docs-caution` and `icon-info` fixtures, and the Callout page) are a caution and a note
  of the same form that say nothing of a release: "Back up before you migrate", and a behaviour that "may change in a
  later version". `SECURITY.md` says which versions receive fixes instead of "nothing has been released yet". Intended
  visual change: the web baselines of the Callout's `docs-caution` and `icon-info` fixtures, whose text changes.
- b7b098d: Documentation site: every page has an image of its own for a shared link, and its head tells search engines what it
  is. The image (1200 × 630, `/og/<page>.png`) is drawn at build time from the light scheme's colors and type tokens:
  the wordmark, the page's title and description in the page's language, and on a component's page each platform's
  status. English, Spanish, Japanese and Arabic pages have images in their own language; Simplified Chinese and Hindi
  pages show the English page's, as the build has no face for those scripts. The single `/og.png` for every page is
  gone. The head now says `og:locale` as `ja_JP` with the other languages as alternates, titles the first page by what
  Tanrei is («Tanrei — design system for Web Components, SwiftUI, Jetpack Compose, Flutter and React Native», no longer
  «Tanrei | Tanrei») with `og:type` `website`, titles a component's page «Button — accessible UI component | Tanrei
  design system», and carries JSON-LD: the page's breadcrumb trail on every page, the site and its source code on the
  first page, and the platform's language on each platform's getting-started page.
- f3a2f2e: Documentation site: every live example, every stage of a component's gallery of fixtures and every figure drawn from
  the repository stand in one frame.
  
  - **Its code.** A Code button in the frame's header opens the example's code under it, closed until a reader opens it:
    the markup as a product writes it, in HTML or in React with the React package's components and props (the choice is
    kept for every example). The copy button copies the code in the kind chosen. The gallery's copy now copies the same
    code.
  - **Its direction and width.** A button draws the example right to left (left to right on a page that reads right to
    left), and a handle on the stage's end edge makes it narrower or wider.
  - **It follows the page.** Every example is drawn under the design system chosen beside the brand in the header, and in
    the scheme and contrast of the appearance menu. The examples' contrast rows and the figures' design-system switches
    are removed: the header's menus are the one place to choose. An example the default system does not have is still
    drawn under the preset it lives in.
  - **It is drawn when it is near.** What an example holds is defined once it comes near the view, so a long page no
    longer fetches and defines, as it loads, the components of examples far below.
- 7692001: Documentation site: every live example and spec fixture is drawn as the web package draws it.
  
  - The Tree view's previews: the chevron no longer lies under the icon, and the supporting text stands apart from the
    label. The page had only the copy of `tree-view.css` that Theme Studio's bundle carries, in `tanrei.components`,
    which comes before Starlight's layers, so Starlight's reset took the tree's margins.
  - The Accordion's spaced sets keep the space between their items (the same cause), and the Button page's paragraph
    in the body text style is drawn at its size (`text.css` was not loaded at all).
  - The Radio button's selected fixtures are drawn selected: they shared one `name` in one page, so each unselected the
    one before it.
  
  Every stylesheet the package ships is now loaded for every page into a layer of the docs' own, and the site's tests
  compare every preview of the built pages with the package's own drawing in a browser.
- 36b6495: Documentation site: the sidebar lists the page on using Tanrei with AI agents under Getting started, after the page on
  your own design system, in the six languages. A Node test holds the hand-written sidebar to every page outside the
  component pages, so a page added without its line fails.
- 1c4e7da: Documentation site: the sidebar filters itself, and "/" goes to its field.
  
  - The sidebar is the navigation drawer with `filterable` on: a field above the list narrows it to the pages and groups
    whose name holds every word typed, opening for the time being the groups that hold them, and says how many match (or
    that none does). It marks nothing in a name, and keeps nothing: emptying the field puts the sidebar back as it was.
    Its name, hint, count, the words for no match and its clear button are in the six languages.
  - "/" anywhere on the page, outside a field, moves focus to that field. In a medium window it expands the column of
    glyphs first; in a compact one it opens the drawer over the content. Command+K and Control+K stay the site's search,
    from the filter field as well; "/" typed in the search, or pressed on one of its results, stays the search's.
  - Until the drawer is defined, the field's room is held, so the rows below it do not move when it is drawn; where no
    script runs there is no field.
- 287a36b: Documentation site: the sidebar no longer moves when its navigation drawer is defined.
  
  - Until the drawer is defined, the sidebar is laid out the way the drawer lays out its header, using the drawer's and
    the button's tokens. The menu button sits on the icon column, centred on the header's height. Beside it, at the
    drawer's own inset, the choice of design system sits above the "All components" switch, and each control holds its
    own room. The first row comes header.gap below them. Before this, the stand-in kept only a 48 px row for the menu
    button and gave the two controls no room. Every row then moved down when the drawer arrived: by 100 px on a
    desktop (122 px in Spanish).
  - What the desktop component pages shift as they load, measured on the production build in Chromium at 1440 × 900:
    0.0139 → 0.0051 on the chip page, 0.0120 → 0.0031 on the switch page, 0.0119 → 0.0012 on the Spanish button page,
    and 0.0201 → 0.0087 on the field page. At a phone's width nothing changes, because the drawer is not in the layout
    there before it is defined.
- 63f56aa: Documentation site: its address is read from `site` in `tanrei.config.json`, and its title from `name`.
  
  - The canonical URLs, the sitemap, `robots.txt` and the origin the link step counts as the site's own all take it from
    there. `robots.txt` is now written by the build; its content is unchanged.
- b185bf5: Docs site: every page of the sitemap says when it last changed (`<lastmod>`), as sitemaps.org defines it and as
  search engines read it — only while it is accurate and follows a change to what the page says. The date is the newest
  commit, along the first parents of the branch the site is built from, of the page's own source in its language (the
  English page where a translation does not exist yet) and, for a component's page, of its spec; never the time of the
  build. Each sitemap in the index is dated by its newest page. The history has to be there: the build stops in a
  shallow clone instead of giving every page the date of its last commit, and the docs' checkouts in CI and in the
  deployment fetch the whole history (`fetch-depth: 0`).
- ddf6ff1: Documentation site: a state matrix, the live component in each of its states.
  
  - The button's Specs section shows every variant, at rest and selected, enabled, disabled, hovered, focused and
    pressed, in one table drawn under the default system, with the design system and contrast switches in its header.
    The states it does not draw (loading) are named under it.
  - Hovered, focused and pressed are the browser's own states, which no attribute of a component can set: the site
    restyles them on its side, copying each of the component's rules for that state onto a docs-only attribute at the
    same specificity. The component's public surface is unchanged. A press is drawn as the chosen system answers one.
  - A cell is a picture: it cannot be focused or used, and says in words what it shows. Each cell holds the room of the
    component's baseline before its script arrives, so nothing on the page moves.
- cf6aeb9: Theme Studio's stylesheets are loaded by the page that hosts the Studio, not by its entry module.
  
  - `@tanrei/studio` no longer imports its stylesheets from its entry. The host loads them with the page that mounts the
    Studio: `@tanrei/web/icons.css`, `tree-view.css`, `accordion.css` and `description-list.css`, and
    `@tanrei/studio/studio.css`. The standalone app does this in `app/main.ts`, and its built stylesheet is unchanged.
  - Documentation site: the Studio's stylesheet is linked by the six Theme Studio pages only (21.8 KB). Before, a 101 KB
    sheet was linked from 755 of the 845 pages. The Theme Studio page draws exactly as before.
- 1bedea1: Documentation site: a choice of design system beside the list of components and at the top of the sidebar (Tanrei's
  Select field, one option for each shipped system, read from the components manifests). The lists show the default
  system's components until the reader chooses another; a component the chosen system does not have is not drawn in
  either list (the page being read stays in the sidebar), and the index says in one line what that system does not have
  and what it uses instead. The choice is kept on the device under the same key as a set of tabs with `syncKey="system"`.
  
  The page of a component that some systems do not have — the FAB menu, the segmented button — leads its overview with a
  note drawn from the manifests: which systems have it and which entries register it, which do not and why, what they
  use instead (each a link), and the line of a layer and the import that take it into a product's own system. The notes
  written by hand on those two pages, in six languages, are gone.
  
  A new page, Getting started › Presets, in six languages: how to use a preset on the web (its stylesheet, its
  attribute, its entry, its fonts), each preset's facts read from its layer, its resolved tokens and its manifest (the
  fonts to load and their packages, the components and the values of `variant` it has and does not have beside the
  default system), and how a product on the default system takes one preset component into its own layer
  (`components.include`) and draws it with its own tokens.
- 9f5a4e1: Documentation site: a page on using Tanrei with AI agents, under Getting started, in the six languages
  (`/getting-started/ai-agents/`). It shows what an agent can read in the packages (the web package's Custom Elements
  Manifest, the tokens as custom properties, the `[tanrei]` warnings of a development build), how to connect
  `@tanrei/mcp@next` in Claude Code, Cursor, VS Code and other MCP clients, and what each of the server's tools and
  resources answers; it gives a rules section to copy into a product's `AGENTS.md` (components from Tanrei, values from
  tokens, the default system only) with two lines for a product that has its own layer; and it lists what the default
  system leaves out, rendered from the status file. A Node test holds the page to the server's own lists of tools and
  resources, and to the custom properties, packages, exports and names the packages have, in every language. The
  Getting started page links to it.
- 4d8e4ef: Documentation site: one frame for the figures drawn from the repository, and a switch that draws a figure under
  another shipped design system.
  
  - A figure is drawn under the default system. The design systems a preset ships are behind a row of tabs in the
    figure's header; a preset's stylesheet is loaded when its tab is pressed, once for the page, and only that figure
    changes. The button's page shows its variants this way.
  - The figure holds its room before its elements are defined, in the tokens of what it draws, and what it shows stands
    in one row that scrolls sideways where the column is narrower: nothing under it moves when its script arrives. The
    button's variants no longer wrap into two rows at a phone's width; they scroll inside their stage.
  - The data the coming figures are drawn from — a component's numbered parts and their text alternative, its lengths,
    motions, color roles, state grid and playground controls — is made from the specs and the resolved tokens, and the
    figures' words are in the six languages.
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
- e711cc1: Icons: a `.tanrei-icon` can take its glyph's name from `data-icon` instead of its text —
  `<span class="tanrei-icon" data-icon="folder"></span>`. `icons.css` draws the name as generated content with an empty
  alternative, so it is the same glyph at the same size, selection and fill, but the name is no longer text of the page:
  it is not in `textContent` or `innerText`, in what people copy, or (from Firefox 128 and Safari 17.4) in the accessible
  name of the control around it. Right-to-left mirroring reads the attribute too, for a bare icon (`observeIcons()`) and
  for one in a component's icon slot, and follows a changed `data-icon`. `data-icon=""` is no name. The Icons page
  describes it in six languages.
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
- 0dcaf3c: Tanrei does not accept outside contributions, and says why: every change from outside is a way for code its
  maintainers did not write to reach the products that install it, and the current security climate makes that a risk
  the project does not take. Pull requests from outside are closed unmerged, and proposals for new components or tokens
  are not taken; issues are for bug reports and questions. `CONTRIBUTING.md`, `AGENTS.md`, the governance and the docs'
  Contributing and How Tanrei is built pages (in every language) state it, and a new component or a breaking change is
  now the maintainers' decision, made before the spec changes, where it used to start with an issue.
  
  During the 0.x prereleases backward compatibility is not kept: any prerelease may break anything, with no
  deprecation period first, and its changeset says what broke. The governance and `CONTRIBUTING.md` say so.
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
- 19fad98: The web guide has a Testing section, in six languages. Tests that render Tanrei's elements run in a real browser
  (Vitest's browser mode or Playwright Test): jsdom and happy-dom are not supported, and no stand-ins are shipped. The
  section also covers finding a control by its role and name inside the element's shadow root, finding a tab or a
  dialog's action through the element that holds the named role (chaining from the role finds nothing, because the
  content is slotted), checking an open menu through its items (the element takes no room in the page), and failing a
  test on `[tanrei]` warnings. `@tanrei/web` adds a test that checks each of those locators in Chromium, Firefox and
  WebKit.
- Updated dependencies [2cf22e1]
- Updated dependencies [73d9b8e]
- Updated dependencies [a03d145]
- Updated dependencies [132b7ce]
- Updated dependencies [4e905c9]
- Updated dependencies [bf5b6de]
- Updated dependencies [f1e78ee]
- Updated dependencies [8d0e2b0]
- Updated dependencies [f799b0a]
- Updated dependencies [f6a47af]
- Updated dependencies [9fd3a23]
- Updated dependencies [02031c4]
- Updated dependencies [2b1b8a9]
- Updated dependencies [98e34cc]
- Updated dependencies [48873d6]
- Updated dependencies [930031d]
- Updated dependencies [6b01d3e]
- Updated dependencies [08d45b6]
- Updated dependencies [bf096fd]
- Updated dependencies [68c45ed]
- Updated dependencies [d5e0409]
- Updated dependencies [d0d5136]
- Updated dependencies [5c2597b]
- Updated dependencies [16bbd73]
- Updated dependencies [6d5fe67]
- Updated dependencies [01640f4]
- Updated dependencies [f535d8f]
- Updated dependencies [c96a911]
- Updated dependencies [6636594]
- Updated dependencies [16608f6]
- Updated dependencies [90e6108]
- Updated dependencies [88c14f0]
- Updated dependencies [de75588]
- Updated dependencies [d97b53b]
- Updated dependencies [aae9ddd]
- Updated dependencies [908d897]
- Updated dependencies [90c0631]
- Updated dependencies [fda53ad]
- Updated dependencies [78932fb]
- Updated dependencies [d8fb809]
- Updated dependencies [2e4a5ab]
- Updated dependencies [3b0cc7e]
- Updated dependencies [0dd718d]
- Updated dependencies [108305a]
- Updated dependencies [aacef9e]
- Updated dependencies [3bbfeaf]
- Updated dependencies [cf6aeb9]
- Updated dependencies [0a98a97]
- Updated dependencies [25dd0d0]
- Updated dependencies [8405fc9]
- Updated dependencies [7e694f4]
- Updated dependencies [a3f8151]
- Updated dependencies [0a27acd]
- Updated dependencies [e690d47]
- Updated dependencies [db60c6c]
- Updated dependencies [e9038b1]
- Updated dependencies [991095d]
- Updated dependencies [bbd7afb]
- Updated dependencies [654a435]
- Updated dependencies [8d5a636]
- Updated dependencies [66ad9dd]
- Updated dependencies [74c9435]
- Updated dependencies [f744584]
- Updated dependencies [b0e55fb]
- Updated dependencies [8c13679]
- Updated dependencies [61cebf8]
- Updated dependencies [6d89bfe]
- Updated dependencies [377bc4a]
- Updated dependencies [41aabb3]
- Updated dependencies [f4248ab]
- Updated dependencies [3990b23]
- Updated dependencies [df119df]
- Updated dependencies [b921047]
- Updated dependencies [c3e2126]
- Updated dependencies [d418520]
- Updated dependencies [e711cc1]
- Updated dependencies [a72bfbb]
- Updated dependencies [2dd0327]
- Updated dependencies [da87128]
- Updated dependencies [397cd93]
- Updated dependencies [aaba9dc]
- Updated dependencies [abc8133]
- Updated dependencies [0a27acd]
- Updated dependencies [6e9bc90]
- Updated dependencies [1a22c3c]
- Updated dependencies [16c656e]
- Updated dependencies [5287d31]
- Updated dependencies [7536862]
- Updated dependencies [7495506]
- Updated dependencies [72469f9]
- Updated dependencies [3188580]
- Updated dependencies [4d18319]
- Updated dependencies [a0f001b]
- Updated dependencies [71dad17]
- Updated dependencies [073a8bd]
- Updated dependencies [712e7d2]
- Updated dependencies [d1611cc]
- Updated dependencies [0a27acd]
- Updated dependencies [727c99d]
- Updated dependencies [58937c0]
- Updated dependencies [2fe1f5a]
- Updated dependencies [c9d76e2]
- Updated dependencies [45ca156]
- Updated dependencies [19e74c3]
- Updated dependencies [25ecc35]
- Updated dependencies [fb1ce26]
- Updated dependencies [66f1b1c]
- Updated dependencies [07507aa]
- Updated dependencies [1c85b08]
- Updated dependencies [17a9754]
- Updated dependencies [dd76e41]
- Updated dependencies [9fd9aba]
- Updated dependencies [b1fb04c]
- Updated dependencies [7072d6a]
- Updated dependencies [2a2437f]
- Updated dependencies [6016e87]
- Updated dependencies [14c4ed6]
- Updated dependencies [fba98d4]
- Updated dependencies [db7055c]
- Updated dependencies [aa0133e]
- Updated dependencies [2087222]
- Updated dependencies [155b5de]
- Updated dependencies [6e23003]
- Updated dependencies [5368526]
- Updated dependencies [afb26f3]
- Updated dependencies [b1ddfd8]
- Updated dependencies [590e070]
- Updated dependencies [615f0c9]
- Updated dependencies [05e39e7]
- Updated dependencies [0424ae9]
- Updated dependencies [fefe825]
- Updated dependencies [d31aedb]
- Updated dependencies [ca2160c]
- Updated dependencies [b1ba89f]
- Updated dependencies [cb29df6]
- Updated dependencies [d0de4b8]
- Updated dependencies [7139c1d]
- Updated dependencies [59c520f]
- Updated dependencies [9bd59f4]
- Updated dependencies [cd48cda]
- Updated dependencies [e0810e9]
- Updated dependencies [1f0c823]
- Updated dependencies [77b361c]
- Updated dependencies [0a27acd]
- Updated dependencies [a25945b]
- Updated dependencies [19c402d]
- Updated dependencies [0c59e32]
- Updated dependencies [6224e55]
- Updated dependencies [0a27acd]
- Updated dependencies [b9c5fbe]
- Updated dependencies [348b6be]
- Updated dependencies [e088124]
- Updated dependencies [d43dd75]
- Updated dependencies [2442137]
- Updated dependencies [754642a]
- Updated dependencies [3589b98]
- Updated dependencies [552dad2]
- Updated dependencies [d6814f1]
- Updated dependencies [37db622]
- Updated dependencies [2d1369b]
- Updated dependencies [afb4e69]
- Updated dependencies [26e14d1]
- Updated dependencies [07c7d78]
- Updated dependencies [f669310]
- Updated dependencies [11e9c59]
- Updated dependencies [f421db8]
- Updated dependencies [bd70c47]
- Updated dependencies [669cd45]
- Updated dependencies [0f0e1eb]
- Updated dependencies [1e0fe14]
- Updated dependencies [b787a0c]
- Updated dependencies [5029351]
  - @tanrei/web@0.1.0-next.1
  - @tanrei/studio@0.1.0-next.1

## 0.1.0-next.0

### Patch Changes

- Updated dependencies [f181fc2]
  - @tanrei/web@0.1.0-next.0
  - @tanrei/studio@0.1.0-next.0
