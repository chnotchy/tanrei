// The shipped presets, on the web: the same components, the same markup, other values.
// Nothing in a component knows these systems exist — every assertion reads the system's own tokens.
// Every component is drawn under every preset (axe's functional rules in light and dark, standard and high contrast, and
// a baseline per fixture at snapshots/systems/<system>/<component>/<fixture>.png): add it to SUBJECTS.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { type Page, expect, test } from '@playwright/test';
import { type Fixture, type Spec, fixtureHost, mountFixtures, resolveColor, resolveToken, subject } from '../test/harness.js';

/** One line per component: its spec, and the fixtures baselined under each preset: one representative each. */
const SUBJECTS = [
  subject('button', (fixture) => fixture.id.endsWith('-medium')),
  // The inset line shows the line's color, thickness and inset together.
  subject('divider', (fixture) => fixture.id === 'horizontal-inset-start'),
  // A single-digit pill: each preset's color pair, height, outline and placement.
  subject('badge', (fixture) => fixture.id === 'count-single', { icons: true }),
  // Modal, one height: the scrim, the sheet's color, top corners (eased in cupertino), elevation and padding, the handle's
  // row and grip (cupertino's 36 × 5 grabber in a 16 row) and the body text. Its baseline is the 400 × 720 window.
  subject('bottom-sheet', (fixture) => fixture.id === 'modal', { window: { width: 400, height: 720 }, wholeWindow: true }),
  // An arc at its corner, drawn at rest: each preset's line color and thickness, the arc's radius and inset from the
  // corner (the stage's corner is concentric with it).
  subject('handle', (fixture) => fixture.id === 'both-bottom-end'),
  // Outlined with its size indicator drawn: each preset's corners and edge for the box, and the indicator's height,
  // padding, corners, inverse colors and monospaced digits.
  subject('resizable-frame', (fixture) => fixture.id === 'indicator-always'),
  // A determinate bar: track and indicator colors, thickness, and the gap and stop indicator m3-like adds.
  subject('progress-indicator', (fixture) => fixture.id === 'linear-determinate'),
  // A bar with a value text: the progress indicator's track, thickness and separation under each preset, in the meter's own default color.
  subject('meter', (fixture) => fixture.id === 'linear'),
  // A dashboard's figure: each preset's text style around it (the ticker has none of its own) and its tabular digits.
  subject('number-ticker', (fixture) => fixture.id === 'default', { reducedMotion: true }),
  // Scrolled to the middle, both edges marked: each preset's scroll edge (shadow in the default system, a line in the m3
  // presets, a blur in cupertino), its depth and its color over the same content.
  // Each fixture is its own axe unit: a scroll box that is a focus stop is a region, and a page of every fixture would
  // hold the spec's regions (named alike, or not at all) side by side, which no product page does.
  subject('scroll-area', (fixture) => fixture.id === 'default', { reducedMotion: true, axeEach: true }),
  // At rest, cut with its ellipsis: the line drawn in the text style around it under each preset (it has no style of its own).
  subject('marquee-text', (fixture) => fixture.id === 'default', { reducedMotion: true }),
  // Contained: the indicator's size and color, and the container's size, color and elevation (m3-expressive-like differs in all).
  subject('loading-indicator', (fixture) => fixture.id === 'contained-medium', { reducedMotion: true }),
  // Checked: the box's size, corner and fill, the check glyph (the icon set's family, weight and mark size), the outline width and the label's text role together.
  subject('checkbox', (fixture) => fixture.id === 'selected', { icons: true }),
  // Selected: the ring's size and stroke, the dot, and the round container's size at once.
  subject('radio-button', (fixture) => fixture.id === 'selected'),
  // On: the track's size and fill, the handle's size, color and elevation at the far end (m3-like's grows, cupertino's is raised).
  subject('switch', (fixture) => fixture.id === 'selected', { icons: true }),
  // Elevated: the container's color, corner (and its smoothing) and each preset's own elevation at rest, around body text.
  subject('card', (fixture) => fixture.id === 'elevated'),
  // The defaults at rest (`centered`): the hero in the centre and the small item beside it, their widths,
  // the gap and padding, the item's resting fill and corners (extra-large in m3-like, eased in cupertino) around the
  // preset's own glyphs.
  subject('carousel', (fixture) => fixture.id === 'centered', { icons: true }),
  // Filled with a value: the container's fill, height and top corners, the indicator, and the floated label over the value.
  subject('text-field', (fixture) => fixture.id === 'filled-filled', { icons: true }),
  // The same box bare: the text input alone, with its own label floated over the value.
  subject('text-input', (fixture) => fixture.id === 'filled-filled', { icons: true }),
  // Filled, medium, in both forms: each preset's height, corner (a pill and a circle by default, Material's rounded
  // squares in the m3 presets), label role, paddings, color pair and resting elevation at once.
  subject('main-action-button', (fixture) => fixture.id === 'filled-extended' || fixture.id === 'filled-collapsed', { icons: true }),
  // Filled, open, its items in place: the open toggle's other look and round corners with the close glyph, the items'
  // fill, height, corners (capsules in cupertino), label role and elevation, and the gaps between them.
  subject('fab-menu', (fixture) => fixture.id === 'filled-open', { icons: true }),
  // A filter chip that is on: the selected fill, the check, the label's role, height, corner (a capsule in cupertino) at once.
  subject('chip', (fixture) => fixture.id === 'filter-selected', { icons: true }),
  // Two of three selected, with icons and supporting text: the row heights, paddings, text roles, the selected fill and the check.
  subject('list', (fixture) => fixture.id === 'multiple-selected', { icons: true }),
  // Every part at once: each preset's row height, paddings, gap, the headline's role (body-large in m3-like and
  // cupertino), the overline's, the supporting and trailing texts' roles and colors, and both glyphs.
  subject('list-row', (fixture) => fixture.id === 'all-parts', { icons: true }),
  // Titled groups of checkbox and radio items: the surface's color, corners, elevation, padding, the rows, the titles and the divider.
  subject('menu', (fixture) => fixture.id === 'group-titles', { icons: true }),
  // Keys joined by +: each preset's cap fill, edge and deeper bottom edge, height, padding and corners (eased in
  // cupertino), and the legends' and separators' role and color.
  subject('keyboard-shortcut', (fixture) => fixture.id === 'keycap-standard'),
  // A tonal success tag with a glyph: each preset's quiet status fill, the label's and the mark's colors, its height
  // (cupertino pins 26), paddings, pill and text style, and its icon set.
  subject('tag', (fixture) => fixture.id === 'icon-success', { icons: true }),
  // A closable error with a title and an action: each preset's quiet status fill, corners and paddings, the status
  // glyph of its icon set, the title's and the body's text styles, and the close button.
  subject('callout', (fixture) => fixture.id === 'closable-title-actions', { icons: true }),
  // Primary with icons: the stacked icon and label, the selected text and filled glyph, the indicator's weight and corners, the divider.
  // And the column: the indicator inset all round, the track's concentric corners, and the underline and the divider
  // on its end edge where a preset draws them (m3-like).
  subject('tabs', (fixture) => fixture.id === 'primary-icons' || fixture.id === 'vertical', { icons: true }),
  // At rest under the primary tabs: the panel's clip and corners (square in every preset); the page turn the m3 presets
  // and cupertino draw shows only in the Tab view's own test frames.
  subject('tab-view', (fixture) => fixture.id === 'default'),
  // Rich, titled: the raised surface's color, corner and elevation, and the title's and text's roles and colors.
  // An action and a close button: the bar's color, corners and elevation, the message's role and both controls' colors.
  subject('snackbar', (fixture) => fixture.id === 'action-closable', { icons: true }),
  // A range across weeks with today's ring: the weekday row, the view toggle and the preset's arrows (sideways in m3-like
  // and cupertino), the selected circles, the band (secondary-container in m3-like) and the day label role.
  subject('calendar', (fixture) => fixture.id === 'range', { icons: true }),
  // The icon fixture: the container's color, corners and elevation over the scrim, the icon and the headline as the
  // preset places them, and the actions in the preset's arrangement and variant. Its baseline is the 640 × 640 window.
  subject('dialog', (fixture) => fixture.id === 'icon', { icons: true, window: { width: 640, height: 640 }, wholeWindow: true }),
  // The layer alone, open, over the page: the preset's scrim (its color and alpha, and its blur where it sets one) around
  // one line of the page's own text. Its baseline is the 640 × 640 window.
  subject('modal-layer', (fixture) => fixture.id === 'open', { window: { width: 640, height: 640 }, wholeWindow: true }),
  // Modal, a date and time side by side: the surface's color, corners and elevation over the scrim, the title row and the
  // value line, the divider, the calendar, the time as the preset sets it (wheels with the entry-mode tabs in the default,
  // the dial in m3-like, the wheels alone in cupertino), the period beside the time and the actions in the preset's arrangement and
  // variant. Its baseline is the 800 × 640 window; axe checks each fixture alone (only one modal is a window's).
  subject('date-time-picker', (fixture) => fixture.id === 'modal-date-time', { icons: true, window: { width: 800, height: 640 }, wholeWindow: true, axeEach: true }),
  // Floating formatting toggles: the pill's color, corners and elevation (cupertino's own level 2), its height, padding
  // and gap, around the preset's own icon buttons, one of them on.
  subject('toolbar', (fixture) => fixture.id === 'floating', { icons: true }),
  subject('tooltip', (fixture) => fixture.id === 'rich', { icons: true, window: { width: 320, height: 200 } }),
  // Scrolled: the scrolled condition's container tone and edge (m3-like sets it apart by tone, the default and cupertino by
  // an edge), the top row's height, insets and title role, around the preset's own icon buttons.
  subject('app-bar', (fixture) => fixture.id === 'small-scrolled', { icons: true }),
  // Badges: the bar's color, edge and height, the indicator's size, corners and color, the labels' role, the filled
  // selected glyph and a count and a dot from the badge component.
  subject('navigation-bar', (fixture) => fixture.id === 'badges', { icons: true }),
  // Standard, in sections: the panel's width, color and edge, the rows' height, corners, text roles and selected fill, the
  // headings and the divider. Collapsed, with its labels (`collapsed-labels-always`: a preset whose original column is
  // labelled is recorded with them — a system cannot default the prop, mimicry gap
  // `navigation-drawer-collapsed-labels-default`): the icon column (Material's rail in m3-like: the icon indicator behind
  // the glyph, the label outside it), the header's menu button, the short labels.
  // Drawn alone: the modal fixture would cover it (the top layer, over a scrim). Axe checks its fixtures in parts: 41
  // drawers of rows on one page are about 8 000 elements.
  subject('navigation-drawer', (fixture) => fixture.id === 'standard' || fixture.id === 'collapsed-labels-always', { icons: true, alone: true, axeParts: true }),
  // Docked and open: the bar's fill, height, corners (medium in cupertino, eased) and paddings around the glyph, the value
  // and the clear button, and the view's color, corners, elevation and rows with their icons, text roles and padding.
  subject('search', (fixture) => fixture.id === 'docked', { icons: true }),
  // Icons, Grid selected: the set's fill, outline, corners and padding, the dividers, the selected fill and elevation, the
  // check in place of the icon (none in cupertino, whose selection is raised), the heights and the label's role.
  subject('segmented-button', (fixture) => fixture.id === 'icons', { icons: true }),
  // An error on a step before the current one: every condition at once — the complete marker's fill and check, the
  // current marker's fill and number, the error ring and glyph, the incomplete ring — the connectors, the text roles.
  subject('stepper', (fixture) => fixture.id === 'horizontal-error', { icons: true }),
  // Modal, with its close button and actions: the scrim, the panel's color, elevation (m3-like's own level1) and start
  // corners (eased in cupertino), the headline's role and color (heading-4 in m3-like), the body text, the divider and the
  // text Buttons. Its baseline is the 720 × 480 window; axe checks each fixture alone (two standard sheets are two
  // complementary landmarks named "Filters").
  subject('side-sheet', (fixture) => fixture.id === 'modal', { icons: true, window: { width: 720, height: 480 }, wholeWindow: true, axeEach: true }),
  // Connected Cut, Copy, Paste: the buttons' outline, colors and height, the preset's inner corner against the buttons' own
  // outer corners (pills in m3-like and m3-expressive-like, 10 in cupertino) and the joined gap.
  subject('button-group', (fixture) => fixture.id === 'connected'),
  // Stepped with stops: the track's thickness and color, the active track, the handle's size, color and elevation (cupertino's
  // white thumb on its shadow), and the stop dots on both tracks (none in cupertino).
  subject('slider', (fixture) => fixture.id === 'discrete-stops'),
  // Filled with an icon: both halves' fill, height, paddings and label role, the icon and the chevron, the preset's outer
  // corners (pills in m3-like and m3-expressive-like) against its inner corners, and the gap between the halves.
  subject('button-with-menu', (fixture) => fixture.id === 'filled-icon', { icons: true }),
  // Totals: the header's label style and color, the row headers' and the footer's emphasized weight, the end-aligned
  // figures, the cell paddings and text role, and how the preset tells rows apart (a hairline, or m3-like's gap).
  subject('table', (fixture) => fixture.id === 'totals'),
  // Every part, outlined: the header's height, paddings and label role, the supporting and trailing text, the icon and the
  // chevron, the preset's hairline and corners, and how it tells items apart (a line in one edge, or m3-like's gap).
  subject('accordion', (fixture) => fixture.id === 'all-parts', { icons: true }),
  // The compact form, open: the block's fill and corners, the row's title and current section in the preset's text roles
  // with its icon set's chevron, and under it the list — the rail, the indent, the row height, and the current item's
  // marker in the preset's primary with its heavier label.
  subject('table-of-contents', (fixture) => fixture.id === 'compact-open', { icons: true }),
  // A paragraph with runs of code: each preset's code face at its body text's size, the faint fill, its corners (eased
  // in cupertino) and the room at each end.
  subject('inline-code', (fixture) => fixture.id === 'in-paragraph'),
  // Runs, numbers, a highlighted and an added line under a title and a copy button: the preset's code role and
  // surfaces, its corners, the header's text roles, the roles' colors and the keyword's weight, the bars and the band,
  // and its own small text Button with its own icon set.
  subject('code-block', (fixture) => fixture.id === 'syntax-marked', { icons: true }),
  // Labelled, tonal: the preset's own tonal Button — the copy button has no look of its own — with its icon set's
  // content_copy.
  subject('copy-button', (fixture) => fixture.id === 'labelled-tonal', { icons: true }),
  // Titled steps: the preset's body and title text styles, the ring in its hairline with the number in its label style,
  // the connector, and the gaps.
  subject('steps', (fixture) => fixture.id === 'titles'),
  // A plan: the preset's time, title and body text styles, the ring in its hairline holding its icon set's check, the
  // event under way in its primary fill, the empty ring, the connector, and the gaps.
  subject('timeline', (fixture) => fixture.id === 'plan', { icons: true }),
  // Both items: the preset's corners (eased in cupertino), hairline, paddings and text roles, and the arrows of its icon set.
  subject('previous-next-links', (fixture) => fixture.id === 'both', { icons: true }),
  // The facts of an order, ruled: the term's label style and quiet color beside the value's running text, the term
  // column, and how the preset tells facts apart (a hairline, or m3-like's gap). And four figures: the preset's
  // heading style as the figure, its label under it, in columns.
  subject('description-list', (fixture) => fixture.id === 'inline' || fixture.id === 'stat'),
  // A title, a control, a specimen, a joined block and a caption: the frame's fill, edge and corners (eased in
  // cupertino), the header's text role, the stage's padding, the caption's role, and how the preset parts the header
  // and the joined block from the stage (a line, or m3-like's space).
  subject('figure', (fixture) => fixture.id === 'docs-demo-code' || fixture.id === 'filled-title-caption', { icons: true }),
  // Open below its anchor with an arrow, a headline, a close button and two actions: the preset's sheet (its color,
  // corners and elevation, drawn round the arrow as one shape), the headline's text style, its own small Button for the
  // close glyph of its icon set, and its Buttons at the foot.
  subject('popover', (fixture) => fixture.id === 'arrow-actions', { icons: true }),
  // A required slider in error: the label's text style and color, the required mark the preset chooses (its filled tag,
  // or its asterisk), the preset's own slider untouched between the rows, and the error text in its error role. Axe
  // checks its fixtures in parts: its 368 fields on one page are about 15 000 elements.
  subject('field', (fixture) => fixture.id === 'slider-required-error', { icons: true, axeParts: true }),
  // A required set of checkboxes in error: the legend and the preset's required mark, the description that stays, the
  // preset's checkboxes in their own error form, the distance it keeps between two controls, and the error text below.
  subject('field-group', (fixture) => fixture.id === 'checkboxes-error', { icons: true }),
  // The drop area over one row of each status: the preset's edge and corners for the area (dashed, or solid where its
  // corners are eased), its own Button as the trigger, the glyphs of its icon set, the status roles on the done and the
  // failed row, the bar in its progress colors, and the two icon-only actions.
  subject('file-upload', (fixture) => fixture.id === 'drop-area-statuses', { icons: true, reducedMotion: true }),
  // The file upload's two members, each alone. The file picker in error: the area's edge in the preset's
  // error role, on its corners, around its glyph, its prompt, its own Button and its line of limits. And the form of a
  // file item that the file upload's rows above do not show — a failed tile: the box on the preset's corners with the
  // picture in it, the retry and the remove action at its corner, and the error mark before its sentence.
  subject('file-picker', (fixture) => fixture.id === 'drop-area-error', { icons: true, reducedMotion: true }),
  subject('file-item', (fixture) => fixture.id === 'tile-error-retryable', { icons: true, reducedMotion: true }),
  // While a drag of files is over it: the scrim in the preset's role, the edge in its primary and stroke, the panel on
  // its raised surface with its corners (eased in cupertino) and elevation, its upload glyph and its message's text role.
  subject('drop-zone', (fixture) => fixture.id === 'dragged', { icons: true, reducedMotion: true }),
  // A refused answer: the field group's frame around the preset's own radio buttons — the label and the preset's
  // required mark, the description that stays, the rings as they are (the selected one unchanged), the distance the
  // preset keeps between two options, and the error text below.
  subject('radio-group', (fixture) => fixture.id === 'error-selected', { icons: true }),
  // Open, with groups: the trigger as the preset's text field (its fill, corners, height and focused edge) with the
  // chevron of its icon set, and the list as its menu — the sheet's color, corners and elevation, the rows, the titles,
  // what parts the groups (a line, or the preset's gap) and the chosen row's fill and check.
  subject('select', (fixture) => fixture.id === 'open-groups', { icons: true }),
  // Required, with a label glyph and help, in a right-to-left stage: the Field's rows around the select — the label,
  // its glyph and the preset's required mark, the help started where the value starts — and the trigger as the preset's
  // text input with the chosen option's glyph.
  subject('select-field', (fixture) => fixture.id === 'stacked-required-rtl', { icons: true }),
  // Open, with groups: the field as the preset's text field with its input, the list as its menu, as a select's — the
  // two lists side by side must be one list.
  subject('combobox', (fixture) => fixture.id === 'open-groups', { icons: true }),
  // The same list under the Field's label row: the combobox field, which is the pair a form uses.
  subject('combobox-field', (fixture) => fixture.id === 'open-groups', { icons: true }),
  // Required, with a unit and a label glyph: the field as the preset's text field — its fill, corners, height and
  // label — with the preset's required mark, the unit in its affix color, and two steppers that are the preset's own
  // text Buttons with the glyphs of its icon set.
  subject('number-field', (fixture) => fixture.id === 'stacked-required-label-icon', { icons: true }),
  // The box alone under each preset, with a unit: the preset's text input — its fill, corners, height and text — and
  // two steppers that are the preset's own text Buttons; no row around it.
  subject('number-input', (fixture) => fixture.id === 'stacked-unit', { icons: true }),
  // Required, in Japanese, with the picker button: the field as the preset's text field — its fill, corners, height and
  // label — with the preset's required mark; the swatch the value's own color in every preset, at the preset's icon
  // size and edged by its hairline; the picker button the preset's own text Button with the palette glyph of its icon set.
  subject('color-field', (fixture) => fixture.id === 'stacked-required-ja', { icons: true }),
  // The box alone under each preset, with its picker button, right-to-left: the preset's text input — its fill, corners
  // and height — the swatch at the right and the preset's own text Button at the left.
  subject('color-input', (fixture) => fixture.id === 'stacked-picker-rtl', { icons: true }),
  // Four of six cells filled, in two groups: the preset's field height, corners and fill on each cell, its text style
  // for the characters, the gap between cells and the mark between the groups in its quiet content color.
  subject('one-time-code-input', (fixture) => fixture.id === 'grouped-partial'),
  // The composed field under each preset: the preset's frame — its label, its required mark and its help — around the
  // preset's cells, right-to-left; nothing in it is the composed element's own.
  subject('one-time-code-field', (fixture) => fixture.id === 'required-rtl'),
  // The chip field under each preset: the preset's frame around the preset's box, with the preset's small input chips
  // in it, a refused text and its error, right-to-left; nothing in it is the composed element's own.
  subject('chip-field', (fixture) => fixture.id === 'email-rtl', { icons: true }),
  // The slider field under each preset: the preset's frame — its label, its help and the value text at the end of
  // the label row — around the preset's own range slider; nothing in it is the composed element's own.
  subject('slider-field', (fixture) => fixture.id === 'range-words'),
  // The typing alone, held by the sample holder: the preset's text style, text color and caret in a box that is the
  // harness's own — nothing of the preset's fields is drawn, since the embedded text input has no box.
  subject('embedded-text-input', (fixture) => fixture.id === 'held-capsule-grown'),
  // The capsule under each preset, right-to-left, with a row and a tile, both slots and the counter: the preset's
  // field surface and corner on a box of the chat composer's own, its Buttons — the send button in the variant the
  // system names — its File items and its text style in the typing area.
  subject('chat-composer', (fixture) => fixture.id === 'inline-rtl', { icons: true, reducedMotion: true }),
  // The preview over the whole window under each preset: the preset's surface, its bar and count, its Buttons in the two variants the preview names, and its caption. Its baseline is the 640 × 640 window.
  subject('image-preview', (fixture) => fixture.id === 'several-rtl', { icons: true, reducedMotion: true, window: { width: 640, height: 640 }, wholeWindow: true }),
  // The composed set under each preset: the preset's field group — its label, its required mark, its description and its error text — around the preset's own checkboxes in their error form, one of them checked; nothing in it is the group's own.
  subject('checkbox-group', (fixture) => fixture.id === 'error-selected', { icons: true }),
  // The whole frame in a wide window: the preset's surface and text color, its gutters, the hairline above the footer
  // and at the aside's start edge where the preset parts things with a line (none in m3-like, whose choice is the gap),
  // around regions that are labelled boxes. Its baseline is the 1280 × 800 window; axe checks each fixture alone (a page
  // has one banner, one main region and one content information).
  subject('app-shell', (fixture) => fixture.id === 'expanded', { icons: true, window: { width: 1280, height: 800 }, wholeWindow: true, axeEach: true }),
  // Every part at once: the preset's text styles for the eyebrow, the title, the description and the meta line, their
  // colors, the spaces between them, the dots, the line under the head and the preset's own Buttons beside the title.
  // Axe checks each fixture alone: a page has its headings in order, and a page of every fixture has a head of each
  // level one after the other.
  subject('page-header', (fixture) => fixture.id === 'everything', { axeEach: true }),
  // Every part in each look: the preset's fills and its edge, its corner and smoothing on the card and on the picture
  // where the two meet, its text styles and colors for the title, the description and the site line, and the mark of
  // its icon set after the host.
  subject('link-card', (fixture) => fixture.id === 'external' || fixture.id === 'full-filled', { icons: true }),
  // A group of squares: the preset's small corner and its smoothing on each box, its quiet fill, the initials in its
  // label style, the fallback glyph of its icon set, the overlap and the gap in its surface's color.
  subject('avatar', (fixture) => fixture.id === 'group-square', { icons: true }),
  // Translucent: the sample's side and corners, the checkerboard's two surfaces under a color at half opacity, the edge,
  // the gap and the two text roles together.
  subject('swatch', (fixture) => fixture.id === 'translucent'),
  // Every part at once, centred: the preset's glyph of its icon set in its secondary color, the title's and the
  // description's text styles and colors, the paddings and the gaps, and two of the preset's own text Buttons.
  subject('empty-state', (fixture) => fixture.id === 'actions', { icons: true }),
  // A folded trail: a link in the preset's link color with its underline, the overflow button, the separators of its
  // icon set, and the current page heavier in its text color.
  subject('breadcrumbs', (fixture) => fixture.id === 'long-trail', { icons: true }),
  // First and last, page 12 of 40: the current page's fill and number in the preset's colors, its corners (round in
  // every preset, eased where a preset's are not), the pages' text role in figures of one width, the ellipses, and the
  // arrows of its icon set.
  subject('pagination', (fixture) => fixture.id === 'first-last', { icons: true }),
  subject('tree-view', (fixture) => fixture.id === 'all-parts', { icons: true }),
  // A row of the preset's filter chips that wraps: the chips as the preset draws them (some on, with its check), the
  // distance the preset keeps between two of them and between two lines — the group itself draws nothing.
  subject('tag-group', (fixture) => fixture.id === 'chips-filters-wrap', { icons: true }),
  // The three shapes at once, still: the preset's low-emphasis fill, its corners for a block (a picture, an action) and
  // for a line of text (eased in cupertino), its gap, and three lines of its body style with the short last one.
  subject('skeleton', (fixture) => fixture.id === 'card', { reducedMotion: true }),
  // A row that folds: the preset's titles — their text style, corners, paddings and gap — on its own bar, and the
  // overflow item's glyph from its icon set at the end.
  subject('menubar', (fixture) => fixture.id === 'many', { icons: true }),
];
const button = SUBJECTS[0].spec;
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
// The presets: every layer in tokens/systems/ but the default system (named like the namespace) and the root (the one
// layer without `extends`, which has no stylesheet of its own) — the rule the CLI and the MCP server offer systems by.
// A layer's folder (tokens/systems/m3-like/, the documents of the components that live in it) is no layer.
const namespace: string = JSON.parse(fs.readFileSync(path.join(repo, 'tanrei.config.json'), 'utf8')).namespace;
const presets = fs
  .readdirSync(path.join(repo, 'tokens/systems'))
  .filter((f) => f.endsWith('.system.json'))
  .map((f) => ({ id: f.replace('.system.json', ''), layer: JSON.parse(fs.readFileSync(path.join(repo, 'tokens/systems', f), 'utf8')) }))
  .filter(({ id, layer }) => id !== namespace && layer.extends)
  .map(({ id }) => id);
/**
 * Tanrei's accessibility criteria in axe: the contrast thresholds (AA, and AAA's enhanced one), a link's contrast with
 * the text around it (`link-in-text-block`) and the target size. An
 * imitation preset is held to none of them, in any contrast scheme: its one criterion is fidelity to the
 * system it imitates. axe leaves `color-contrast-enhanced` and `target-size` off by default; they are named so that
 * neither a change of axe's defaults nor a rule set widened here turns them on for a preset. Every other rule runs — names, roles, states, `aria-*` validity,
 * focus (`aria-hidden-focus`, `scrollable-region-focusable`), `nested-interactive`, landmarks: a functional failure is a
 * bug in any system. The default `tanrei` system keeps the whole rule set, in each component's suite.
 */
const CRITERIA = ['color-contrast', 'color-contrast-enhanced', 'link-in-text-block', 'target-size'];
const sheet = (id: string) => fs.readFileSync(path.join(repo, `packages/web/dist/systems/${id}.css`), 'utf8');
/** The components a system does not have: they live in a layer it does not extend (`--tanrei-unavailable-layer`). */
const outside = (id: string) => new Set((/--tanrei-unavailable-layer: "([^"]*)";/.exec(sheet(id))?.[1] ?? '').split(/\s+/).filter(Boolean).map((pair) => pair.split('=')[0]));
const inner = (page: Page, fixture: string) => fixtureHost(page, button, fixture).locator('button');
const style = (page: Page, fixture: string, property: string) => inner(page, fixture).evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), property);

/**
 * What a component's fixtures need around them before axe reads the page, by the spec's name — the staging the
 * component's own axe test gives them.
 */
const AXE_STAGING: Record<string, (page: Page) => Promise<void>> = {
  // A disabled shortcut is the shortcut of an unavailable command, and exposes no disabled state of its own (KBS-9): the
  // command does. Alone on a page its legends are text nothing says is unavailable, which axe holds to 4.5:1; it is
  // staged in the disabled control it belongs to, whose text WCAG 1.4.3 exempts. The enabled legends are held to 4.5:1.
  'keyboard-shortcut': (page) =>
    page.evaluate(() => {
      for (const shortcut of document.querySelectorAll('tanrei-keyboard-shortcut[disabled]')) {
        const command = document.createElement('button');
        command.type = 'button';
        command.disabled = true;
        shortcut.replaceWith(command);
        command.append(shortcut);
      }
    }),
  // A disabled tag is a tag drawn inside something disabled (TAG-21), and exposes no disabled state of its own: the
  // element it stands in does, and WCAG 1.4.3 exempts its text. Alone on a page it is text nothing says is disabled; its
  // stage says it, as that element would. The enabled tags are held to 4.5:1.
  tag: (page) =>
    page.evaluate(() => {
      for (const tag of document.querySelectorAll('[data-fixture] tanrei-tag[disabled]')) tag.closest('[data-fixture]')!.setAttribute('aria-disabled', 'true');
    }),
  // A page has one landmark of a kind per name, and every fixture is a navigation landmark named "On this page": each
  // is named after its fixture as well, as two tables of contents on one page of a product are told apart (the spec's
  // labeling).
  'table-of-contents': (page) =>
    page.evaluate(async () => {
      const named = [...document.querySelectorAll('[data-fixture] > tanrei-table-of-contents')] as (HTMLElement & { label: string; updateComplete: Promise<unknown> })[];
      for (const toc of named) toc.label = `${toc.label} (${toc.parentElement!.dataset.fixture})`;
      await Promise.all(named.map((toc) => toc.updateComplete));
    }),
  // The fixture `without-words` shows what is drawn when nobody named the row actions (FUP-27): two buttons without a
  // name, which is the failure the fixture is there to show and no page of a product may ship. For the functional
  // rules it is given the two words, as a product gives them; the file upload's own test holds that it fails without.
  // The chat composer's fixture `without-words` shows what is drawn when nobody named it or its buttons (CCM-31): a
  // group, a text box and buttons without a name, which is the failure the fixture is there to show. For the
  // functional rules it is given its words, as a product gives them; the chat composer's own test holds that it
  // reports without.
  'chat-composer': (page) =>
    page.evaluate(async () => {
      const unnamed = [...document.querySelectorAll('[data-fixture] > tanrei-chat-composer:not([label])')] as (HTMLElement & { updateComplete: Promise<unknown> })[];
      for (const composer of unnamed) {
        Object.assign(composer, { label: 'Message', sendLabel: 'Send', attachLabel: 'Attach files', removeLabel: 'Remove', retryLabel: 'Try again' });
        for (const item of composer.querySelectorAll('tanrei-file-item[status="error"]')) item.setAttribute('error-text', 'The connection was lost');
      }
      await Promise.all(unnamed.map((composer) => composer.updateComplete));
      const items = [...document.querySelectorAll('tanrei-file-item')];
      await Promise.all(items.map((item) => (item as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete));
    }),
  'file-upload': (page) =>
    page.evaluate(async () => {
      const unnamed = [...document.querySelectorAll('[data-fixture] > tanrei-file-upload:not([remove-label])')] as (HTMLElement & { removeLabel: string; retryLabel: string; updateComplete: Promise<unknown> })[];
      for (const upload of unnamed) Object.assign(upload, { removeLabel: 'Remove', retryLabel: 'Try again' });
      await Promise.all(unnamed.map((upload) => upload.updateComplete));
      // The rows are File items: the product's own children, and the ones a file upload made in its shadow root.
      const rows = [...document.querySelectorAll('tanrei-file-item'), ...[...document.querySelectorAll('tanrei-file-upload')].flatMap((upload) => [...(upload.shadowRoot?.querySelectorAll('tanrei-file-item') ?? [])])];
      await Promise.all(rows.map((row) => (row as HTMLElement & { updateComplete: Promise<unknown> }).updateComplete));
    }),
  // The fixture `row-without-words` is the same failure one level down (FIT-20): for the functional rules it is given
  // the two words, as a product gives them; the file item's own test holds that it fails without.
  'file-item': (page) =>
    page.evaluate(async () => {
      const unnamed = [...document.querySelectorAll('[data-fixture] > tanrei-file-item:not([remove-label])')] as (HTMLElement & { removeLabel: string; retryLabel: string; updateComplete: Promise<unknown> })[];
      for (const item of unnamed) Object.assign(item, { removeLabel: 'Remove', retryLabel: 'Try again' });
      await Promise.all(unnamed.map((item) => item.updateComplete));
    }),
};

/**
 * Waits until nothing on the page is moving: every finite animation and transition — the document's and each shadow
 * root's, pseudo-elements (a dialog's ::backdrop) included — has finished. axe reads colors and opacity as they are
 * drawn, so a modal still fading in (motion.open-duration) or a color still transitioning to the high-contrast scheme
 * would be judged on its in-between value. A fixed sleep only covers that while the machine keeps up; this is the
 * transitions' own end, however late they start. Endless ones (an indeterminate indicator) never settle, and are left
 * running as they would be for a reader. A new frame is awaited before each look, so a change made just before (an
 * attribute, a dialog opening on its first update) has created its transitions. It looks again at least every 250 ms,
 * because an animation that is paused instead of finishing never settles its `finished` promise.
 */
async function settled(page: Page) {
  await page.evaluate(async () => {
    const frame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    // Each tree's own list (with its pseudo-elements) where the engine has one, and every element's, in every tree.
    const animations = (root: Document | ShadowRoot): Animation[] => [
      ...('getAnimations' in root ? root.getAnimations() : []),
      ...[...root.querySelectorAll('*')].flatMap((el) => [...el.getAnimations(), ...(el.shadowRoot ? animations(el.shadowRoot) : [])]),
    ];
    // An animation of an element inside skipped content (`content-visibility: hidden` — a tree view's closed list,
    // kept for the browser's find-in-page) is never begun: nothing of it is drawn, axe does not read it, and Firefox
    // lists it as running and pending for as long as the content is skipped. Only one that has not begun is passed over.
    const skipped = (a: Animation) => {
      for (let box = (a.effect as KeyframeEffect | null)?.target?.parentElement; box; box = box.parentElement)
        if (getComputedStyle(box).contentVisibility === 'hidden') return true;
      return false;
    };
    // Motion ends in a few hundred milliseconds; what still moves after this is itself the finding, named below.
    const deadline = performance.now() + 10_000;
    for (;;) {
      await frame();
      const running = [...new Set(animations(document))].filter(
        (a) => a.playState === 'running' && Number.isFinite(Number(a.effect?.getComputedTiming().endTime)) && !(a.pending && skipped(a)),
      );
      if (running.length === 0) return;
      if (performance.now() > deadline) {
        const name = (a: Animation) => {
          const target = (a.effect as KeyframeEffect | null)?.target;
          const host = (target?.getRootNode() as ShadowRoot | undefined)?.host;
          const what = (a as CSSTransition).transitionProperty ?? (a as CSSAnimation).animationName ?? a.id;
          return `${host?.tagName.toLowerCase() ?? ''} ${target?.tagName.toLowerCase()}.${target?.className} ${what} ${Math.round(Number(a.currentTime))}/${a.effect?.getComputedTiming().endTime}ms`;
        };
        throw new Error(`still moving after 10 s: ${running.slice(0, 8).map(name).join('; ')}`);
      }
      const tick = new Promise((resolve) => setTimeout(resolve, 250));
      await Promise.race([Promise.all(running.map((a) => a.finished.catch(() => undefined))), tick]);
    }
  });
}

/** The most fixtures one axe test of a subject with `axeParts` mounts and scans. */
const AXE_PART = 40;

/**
 * What one axe test looks at: every fixture on one page; or (`axeEach`) each fixture alone, as a window of its own —
 * a test per fixture, so each is one mount's work within the test's time (eight modal pickers mounted in turn in one
 * test outran it on a 2-vCPU CI runner) and a failure names its fixture; or (`axeParts`) the fixtures in equal parts
 * of at most AXE_PART, in the spec's order, each part a page and a test of its own. A scan's time grows with the nodes
 * on the page: the Field's 368 fixtures on one page (about 15 000 elements) took 36 s in WebKit and 26 s in Firefox
 * on a CI runner, where every other subject took 14 s or less save the navigation drawer's 41 (8 000 elements, 22 s).
 * `every fixture is in one axe unit of its subject` holds that the parts keep every fixture.
 */
const axeUnits = ({ spec, axeEach, axeParts }: { spec: Spec; axeEach?: boolean; axeParts?: boolean }): { name: string; fixtures?: Fixture[] }[] => {
  if (axeEach) return spec.fixtures.map((fixture) => ({ name: `${spec.name}/${fixture.id}`, fixtures: [fixture] }));
  if (!axeParts) return [{ name: spec.name }];
  const count = Math.ceil(spec.fixtures.length / AXE_PART);
  const size = Math.ceil(spec.fixtures.length / count);
  return Array.from({ length: count }, (_, i) => ({ name: `${spec.name}, part ${i + 1} of ${count}`, fixtures: spec.fixtures.slice(i * size, (i + 1) * size) }));
};

/** axe's functional rules over a preset — every rule but its CRITERIA — in light and dark, in one contrast scheme. */
async function axe(page: Page, spec: Spec, unit: string, system: string, contrast: 'high' | undefined, icons: boolean, fixtures?: Fixture[]) {
  // A glyph drawn in its icon face is a ligature, which axe tells from text; without the face it is judged as text.
  // Mounted once: the theme, like the contrast, is the document's attribute and nothing but CSS reads it, so dark is
  // the same page switched, as a product switches it (a mount inlines the fonts and the bundle, and is most of the time).
  await mountFixtures(page, spec, { system, theme: 'light', icons, ...(fixtures ? { fixtures } : {}) });
  await AXE_STAGING[spec.name]?.(page);
  if (contrast) await page.evaluate((c) => document.documentElement.setAttribute('data-tanrei-contrast', c), contrast);
  for (const theme of ['light', 'dark'] as const) {
    await page.evaluate((t) => document.documentElement.setAttribute('data-tanrei-theme', t), theme);
    await settled(page); // a modal's open fade, the colors' transition to the theme and the contrast scheme
    // axe.run in the page itself: the same rules over the same nodes. The default mode opens a blank page per run
    // for axe.finishRun, which only matters for cross-origin frames (no fixture has a frame) and costs a page each time.
    const results = await new AxeBuilder({ page }).setLegacyMode().include('.stage').disableRules(CRITERIA).analyze();
    const ran = [...results.passes, ...results.violations, ...results.incomplete, ...results.inapplicable].map((r) => r.id);
    expect(ran.filter((id) => CRITERIA.includes(id)), `${unit} ${system}: a criterion rule ran`).toEqual([]);
    expect(results.violations, `${unit} ${system} ${theme} ${contrast ?? 'standard'}: ${results.violations.map((v) => v.id).join(', ')}`).toEqual([]);
  }
}

test('presets are discovered from tokens/systems/', () => {
  expect([...presets].sort()).toEqual(['cupertino', 'm3-expressive-like', 'm3-like']);
});

test('every fixture is in one axe unit of its subject', () => {
  for (const s of SUBJECTS) {
    const units = axeUnits(s);
    const ids = units.flatMap((unit) => (unit.fixtures ?? s.spec.fixtures).map((f) => f.id));
    expect(ids, s.spec.name).toEqual(s.spec.fixtures.map((f) => f.id));
    if (s.axeParts) for (const unit of units) expect(unit.fixtures!.length, unit.name).toBeLessThanOrEqual(AXE_PART);
    expect(new Set(units.map((unit) => unit.name)).size, s.spec.name).toBe(units.length);
  }
});

for (const system of presets) {
  test.describe(system, () => {
    test('every button variant renders from this system’s tokens', async ({ page }) => {
      await mountFixtures(page, button, { system });
      for (const variant of ['filled', 'tonal', 'outlined', 'text', 'elevated']) {
        expect(await style(page, `${variant}-medium`, 'background-color'), variant).toBe(await resolveColor(page, `--tanrei-comp-button-${variant}-container-color`));
        expect(await style(page, `${variant}-medium`, 'color'), variant).toBe(await resolveColor(page, `--tanrei-comp-button-${variant}-label-color`));
      }
      expect(await style(page, 'filled-medium', 'background-color')).toBe(await resolveColor(page, '--tanrei-sys-color-primary'));
      const box = await inner(page, 'filled-medium').boundingBox();
      expect(box!.height).toBe(await resolveToken(page, '--tanrei-comp-button-container-height-medium'));
    });

    // A component that lives in a layer this system does not extend is not drawn under it: the system has none of its tokens.
    for (const { spec, fixtures, icons, reducedMotion, window, wholeWindow, alone, ...scope } of SUBJECTS.filter((s) => !outside(system).has(s.spec.name))) {
      for (const unit of axeUnits({ spec, ...scope })) {
        test(`${unit.name}: ${system} passes axe's functional rules at standard contrast (not its contrast or target-size criteria)`, async ({ page }) => {
          await axe(page, spec, unit.name, system, undefined, icons, unit.fixtures);
        });

        test(`${unit.name}: ${system} passes axe's functional rules at high contrast (not its contrast or target-size criteria)`, async ({ page }) => {
          await axe(page, spec, unit.name, system, 'high', icons, unit.fixtures);
        });
      }

      for (const fixture of fixtures) {
        test(`snapshot: ${spec.name}/${fixture.id}`, async ({ page }) => {
          if (window) await page.setViewportSize(window);
          await mountFixtures(page, spec, { system, icons, ...(reducedMotion ? { reducedMotion } : {}), ...(window || alone ? { fixtures: [fixture] } : {}) });
          const shot = ['systems', system, spec.name, `${fixture.id}.png`];
          if (wholeWindow) await expect(page).toHaveScreenshot(shot);
          else await expect(page.locator(`[data-fixture="${fixture.id}"]`)).toHaveScreenshot(shot);
        });
      }
    }
  });
}

test('m3-like: a pill, with a shadow and no ring when elevated', async ({ page }) => {
  await mountFixtures(page, button, { system: 'm3-like' });
  const box = await inner(page, 'filled-medium').boundingBox();
  expect(Number.parseFloat(await style(page, 'filled-medium', 'border-top-left-radius'))).toBeGreaterThanOrEqual(box!.height / 2);
  expect(await resolveColor(page, '--tanrei-sys-color-elevation-ring')).toBe('rgba(0, 0, 0, 0)');
  expect(await style(page, 'elevated-medium', 'box-shadow')).not.toBe('none');
});

test('cupertino: no hover, a dimmed press, a tinted label on a gray fill', async ({ page }) => {
  await mountFixtures(page, button, { system: 'cupertino' });
  const resting = await style(page, 'filled-medium', 'background-color');
  await fixtureHost(page, button, 'filled-medium').hover();
  await settled(page); // whatever the hover started has ended, so an unchanged fill is the fill it rests at
  expect(await style(page, 'filled-medium', 'background-color')).toBe(resting);
  await page.mouse.down();
  await expect.poll(() => style(page, 'filled-medium', 'opacity')).toBe('0.7');
  await page.mouse.up();
  expect(await style(page, 'tonal-medium', 'color')).toBe(await resolveColor(page, '--tanrei-sys-color-primary'));
});

test('two systems on one page do not leak into each other', async ({ page }) => {
  await mountFixtures(page, button, { system: 'm3-like' });
  await page.addStyleTag({ content: sheet('cupertino') });
  const m3 = await style(page, 'filled-medium', 'background-color');
  const [m3Tonal, m3Smoothing] = [await style(page, 'tonal-medium', 'background-color'), await style(page, 'tonal-medium', '--tanrei-sys-shape-corner-smoothing')];
  await page.locator('[data-fixture="tonal-medium"]').evaluate((el) => el.setAttribute('data-tanrei-system', 'cupertino'));
  // The switch transitions the button's fill and corner (motion.state-duration): read them where they end, not on the way
  // from m3-like's 9999px pill — WebKit starts a transition when it next resolves style, which on a busy machine can be
  // the read itself, after any fixed sleep.
  await settled(page);
  expect(await style(page, 'filled-medium', 'background-color')).toBe(m3);
  // Both presets draw a capsule since cupertino's review, so the corner no longer tells them apart; the tonal fill and
  // the smoothing amount do: the cupertino stage has cupertino's, and the stage beside it keeps m3-like's.
  expect(await style(page, 'tonal-medium', 'background-color')).not.toBe(m3Tonal);
  expect((await style(page, 'tonal-medium', '--tanrei-sys-shape-corner-smoothing')).trim()).toBe('0.6');
  expect((await style(page, 'filled-medium', '--tanrei-sys-shape-corner-smoothing')).trim()).toBe(m3Smoothing.trim());
  expect(m3Smoothing.trim()).toBe('0');
});
