// The code block's rules for what is in the DOCUMENT (specs/code-block.spec.json): the product's own
// `<pre><code>` stays in the light DOM (it is in the page before any script runs), so the lines, the gutter, the prompt,
// the marks and the runs are styled from outside a shadow root. One source, written three times:
//
//   - `@tanrei/web/code.css` (scripts/build.js): for a page that loads the stylesheet — and the only thing that draws a
//     block that is not upgraded yet, or never will be (`tanrei-code-block:not(:defined)`; those rules are `code.css`'s
//     alone, code-block.before.ts). It draws that block WHERE
//     THE ELEMENT WILL: every length the element's shadow root decides from an attribute is decided here from the same
//     attribute, so nothing moves when the element is defined (see "A block that is not upgraded" below);
//   - the element itself (code-block.ts) adopts the same sheet into its root, so a block is drawn right without the
//     stylesheet, and inside a product's own shadow root;
//   - `@tanrei/web/prose.css`: `BARE_BLOCK_CSS`, for a bare `pre` that is prose's own (rendered Markdown without the
//     element), which gets the filled medium look and scrolls in its own box (PRS-15).
//
// Every value is a `--tanrei-comp-code-block-*` token. The element's shadow styles hand the light DOM what depends on
// its props through private custom properties (`--_code-block-*`), which the slotted `pre` inherits; the same
// functions write them for the block that is not upgraded.

const PREFIX = '--tanrei-comp-code-block';
export const T = (name: string) => `var(${PREFIX}-${name})`;
// A value the core does not have may be missing from the active design system: fall back to the default's token.
const ref = (name: (key: string) => string, key: string, fallback: string | null) => (fallback ? `var(${name(key)}, var(${name(fallback)}))` : `var(${name(key)})`);

/** The values every design system has. A layer may add more; those get their styles on demand. */
export const CORE_VARIANTS = ['filled', 'outlined'] as const;
export const CORE_SIZES = ['small', 'medium'] as const;
export const DEFAULT_VARIANT = 'filled';
export const DEFAULT_SIZE = 'medium';

/**
 * The members of the size axis (COD-2, COD-3): the code's text style, taken whole, and the two paddings. The weight is
 * named apart, because a syntax role adds its emphasis to it (COD-18).
 */
export const sizeBlock = (size: string, selector: string, fallback: string | null = null) => `${selector} {
  --_code-block-font: ${ref((v) => `${PREFIX}-code-typescale-${v}-font`, size, fallback)};
  --_code-block-tracking: ${ref((v) => `${PREFIX}-code-typescale-${v}-letter-spacing`, size, fallback)};
  --_code-block-weight: ${ref((v) => `${PREFIX}-code-typescale-${v}-font-weight`, size, fallback)};
  --_code-block-pad-block: ${ref((v) => `${PREFIX}-container-padding-block-${v}`, size, fallback)};
  --_code-block-pad-inline: ${ref((v) => `${PREFIX}-container-padding-inline-${v}`, size, fallback)};
}`;

/**
 * A look (COD-1): the container's fill, and the ground — the opaque color the gutter and the copy button's patch stand
 * on while code scrolls under them (COD-10, COD-13). A filled look's ground is its fill. The outlined look has none of
 * its own (its fill is transparent): it is read on whatever it is placed on, which a stylesheet cannot know, so the
 * ground is `--tanrei-code-block-ground` where the product names it and the surface color otherwise.
 */
export const variantBlock = (variant: string, selector: string, fallback: string | null = null) => `${selector} {
  --_code-block-container: ${ref((v) => `${PREFIX}-${v}-container-color`, variant, fallback)};
  --_code-block-ground: ${variant === 'outlined' ? 'var(--tanrei-code-block-ground, var(--tanrei-sys-color-surface))' : 'var(--_code-block-container)'};
}`;

/**
 * What the element's shadow styles change by its props, at the values of a block with no header and no copy button:
 * the padding above the first line (COD-3; COD-8 puts the header's own there) and the padding before and after the
 * lines (COD-10 widens the one at the copy button's side).
 */
export const layoutBlock = (selector: string) => `${selector} {
  --_code-block-pad-top: var(--_code-block-pad-block);
  --_code-block-pad-start: var(--_code-block-pad-inline);
  --_code-block-pad-end: var(--_code-block-pad-inline);
}`;

/** The code's own text (COD-2): the face, the color, the tab stops, every character as given, left to right (COD-20). */
const CODE_TEXT = `
  font: var(--_code-block-font);
  letter-spacing: var(--_code-block-tracking);
  color: ${T('code-color')};
  tab-size: ${T('code-tab-size')};
  white-space: pre;
  hyphens: none;
  text-transform: none;
  text-align: left;
  direction: ltr;
  unicode-bidi: isolate;`;

/**
 * The syntax roles a run may name (COD-18), besides `plain`: the values of the token axis `comp.code-block.syntax`,
 * as every design system has them. Data, not selectors: each is drawn by ONE rule from the two tokens that carry its
 * name — `syntax.color.<role>` and `syntax.emphasis.<role>`, a step of weight added to the code's own. The list is
 * held to the generated tokens twice: the build refuses to write `code.css` while it differs from the roles
 * `src/generated/tokens.css` names (scripts/build.js), and a role a layer ADDS to the axis gets the same
 * rule from `roleRule` — in the build of a product's own stylesheet, and in the element when it first meets a run of
 * that role whose tokens the cascade has.
 */
export const SYNTAX_ROLES = ['comment', 'keyword', 'string', 'constant', 'function', 'type', 'tag', 'property', 'punctuation'] as const;
export const roleRule = (role: string) => `tanrei-code-block [data-syntax='${role}'] {
  color: ${T(`syntax-color-${role}`)};
  font-weight: calc(var(--_code-block-weight) + var(${PREFIX}-syntax-emphasis-${role}, 0));
}`;

const HOST = 'tanrei-code-block';
/**
 * A name these rules set on the block: a root whose cascade gives it draws the block's lines already, and the element
 * does not add the rules to it again (src/primitives/sheets.ts). No shadow style of the element sets it.
 */
export const CODE_BLOCK_DRAWN = '--_code-block-light';

/**
 * The rules of the code, the lines and the runs, without their layer: for what is in the document whether the element
 * is defined or not (the element's tag in a document; a product's shadow root adopts the same text).
 */
const RULES = `
/* The mark of these rules on the block itself: the element asks for it before it adds them to a root a second time. */
${HOST} {
  ${CODE_BLOCK_DRAWN}: yes;
}
/* ── The code (COD-2, COD-3, COD-20): the product's pre and code, whatever the page says of those two elements. ───── */
${HOST} > pre {
  box-sizing: border-box;
  margin: 0;
  border: 0;
  border-radius: 0;
  padding-block: var(--_code-block-pad-top) var(--_code-block-pad-block);
  background: none;${CODE_TEXT}
}
/* COD-4: as wide as its longest line and never narrower than the body, so a line's band and the padding after the
   longest line reach the end of what scrolls. COD-5: wrapped, it is as wide as the body. */
${HOST}:defined:not([wrap]) > pre {
  inline-size: max-content;
  min-inline-size: 100%;
}
${HOST} > pre > code {
  display: block;
  margin: 0;
  border: 0;
  border-radius: 0;
  padding: 0;
  background: none;
  box-shadow: none;
  font: inherit;
  letter-spacing: inherit;
  color: inherit;
  white-space: inherit;
  overflow-wrap: inherit;
}

/* ── Lines. Every line is a box (data-line) that holds what is drawn beside the code — the gutter, the prompt, a
   mark's label — and the code itself (data-line-code), without adding a character to the code. The element makes
   them; a page made with highlightToHtml or highlightToNodes has them already, and these rules draw them the same
   whether the element is defined or not. ─────────────────────────────────────────────────────────────────────────── */
${HOST} [data-line] {
  position: relative;
  display: flex;
  padding-inline: var(--_code-block-pad-start) var(--_code-block-pad-end);
}
/* COD-3: where there is a gutter the padding is before it, and the gutter holds it. */
${HOST} [data-line]:has(> [data-line-gutter]) {
  padding-inline-start: 0;
}
/* An empty line is one line high. COD-4: a line is never broken, and is as long as its code. */
${HOST} [data-line-code] {
  flex: 1 0 auto;
  min-block-size: 1lh;
}
/* COD-5: a line that does not fit continues on following rows, broken at its spaces first and anywhere where a part
   has none; the rows begin where the line's code begins, because the gutter and the prompt stand beside the code. */
${HOST}[wrap] [data-line-code] {
  flex: 1 1 0;
  min-inline-size: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

/* COD-13: the gutter — from the left: the bar's column, the numbers, the signs. It stays in view, on the block's
   ground, while the code scrolls sideways under it; it is as tall as its line, and its number and sign are on the
   line's first row. Drawn, not text: generated content with an empty alternative text, never selected. */
${HOST} [data-line-gutter] {
  position: sticky;
  left: 0;
  flex: none;
  box-sizing: border-box;
  min-inline-size: var(--_code-block-pad-start);
  padding-inline-start: var(--_code-block-pad-start);
  background: var(--_code-block-band, var(--_code-block-ground));
  color: ${T('line-number-color')};
  font-variant-numeric: tabular-nums;
  white-space: pre;
  user-select: none;
  -webkit-user-select: none;
}
${HOST} [data-line-gutter]:is([data-number], [data-sign]) {
  padding-inline-end: ${T('line-number-gap')};
}
${HOST} [data-line-gutter][data-number]::before {
  content: attr(data-number);
  content: attr(data-number) / '';
}
/* COD-16: the sign, after the numbers, in the mark's color — in a column one character wide, whatever the sign's own
   glyph is: a face that has no minus takes it from another face, whose minus is as wide as that face made it, and a
   removed line's code would begin beside the other lines' (and move when the element is defined: the room a block
   that is not upgraded keeps is this character). */
${HOST} [data-line-gutter][data-sign]::after {
  content: attr(data-sign);
  content: attr(data-sign) / '';
  display: inline-block;
  inline-size: 1ch;
  text-align: center;
  color: var(--_code-block-mark, inherit);
}
${HOST} [data-line-gutter][data-number][data-sign]::after {
  margin-inline-start: 1ch;
}

/* COD-15, COD-16: a marked line — a bar at the block's left edge as tall as the line, in the mark's color, and a band
   behind all of its rows: the highlighted line's, or the faint tint of an added or a removed line, so that a reader
   scanning the block tells the two apart whatever the colors of their code. The code keeps its colors. */
${HOST} [data-line][data-highlighted] {
  --_code-block-mark: ${T('line-highlighted-mark-color')};
  --_code-block-band: ${T('line-highlighted-container-color')};
  background: var(--_code-block-band);
}
${HOST} [data-line][data-added] {
  --_code-block-mark: ${T('line-added-mark-color')};
  --_code-block-band: ${T('line-added-container-color')};
  background: var(--_code-block-band);
}
${HOST} [data-line][data-removed] {
  --_code-block-mark: ${T('line-removed-mark-color')};
  --_code-block-band: ${T('line-removed-container-color')};
  background: var(--_code-block-band);
}
${HOST} [data-line]:is([data-highlighted], [data-added], [data-removed]) > [data-line-gutter] {
  background:
    linear-gradient(var(--_code-block-mark), var(--_code-block-mark)) left top / ${T('line-mark-width')} 100% no-repeat,
    var(--_code-block-band, var(--_code-block-ground));
}
/* The label of a mark, in words, read before the line's code and never drawn or selected. */
${HOST} [data-line-label] {
  position: absolute;
  overflow: hidden;
  inline-size: 1px;
  block-size: 1px;
  clip-path: inset(50%);
  white-space: nowrap;
  user-select: none;
  -webkit-user-select: none;
}

/* COD-17: the prompt and one space, before the first row of a line that is not empty; drawn, not text. */
${HOST} [data-line-prompt] {
  flex: none;
  color: ${T('prompt-color')};
  white-space: pre;
  user-select: none;
  -webkit-user-select: none;
}
${HOST} [data-line-prompt]::before {
  content: attr(data-prompt) ' ';
  content: attr(data-prompt) ' ' / '';
}

/* ── Runs (COD-18): a syntax role changes a run's color and its weight, and nothing else — so highlighted code and the
   same code drawn plain have the same lines and columns, and colors that arrive move nothing (COD-28). One rule per
   value of the syntax axis; an unknown role is plain (COD-19). ──────────────────────────────────────────────────── */
${SYNTAX_ROLES.map(roleRule).join('\n')}

/* ── Forced colors (COD-23): the code is the platform's text color whatever its role (the mode's own doing; every run
   keeps the weight of its role); no band; the bar, the numbers and the signs in the text color. The gutter's bar is a gradient,
   which the mode would remove, so the gutter is drawn in system colors by name. ───────────────────────────────────── */
@media (forced-colors: active) {
  ${HOST} [data-line]:is([data-highlighted], [data-added], [data-removed]) {
    background: none;
  }
  ${HOST} [data-line-gutter] {
    forced-color-adjust: none;
    background: Canvas;
    color: CanvasText;
  }
  ${HOST} [data-line-gutter][data-sign]::after {
    color: CanvasText;
  }
  ${HOST} [data-line]:is([data-highlighted], [data-added], [data-removed]) > [data-line-gutter] {
    background:
      linear-gradient(CanvasText, CanvasText) left top / ${T('line-mark-width')} 100% no-repeat,
      Canvas;
  }
}`;

/** Rules in the components' layer, as a stylesheet's text. */
export const layered = (rules: string) => `@layer tanrei.components {${rules.replace(/^/gm, '  ').replace(/^ +$/gm, '')}
}
`;
/** The stylesheet text: the rules in the components' layer, as `code.css` carries them and the element adopts them. */
export const CODE_BLOCK_CSS = layered(RULES);

/**
 * A bare `pre` — rendered Markdown that the product did not wrap in the element: the filled look at the medium size
 * with the code's text, scrolling in its own box (COD-1 to COD-4, PRS-15). Declarations only: the build writes them
 * under prose's own `pre` (scripts/build.js).
 */
export const BARE_BLOCK_CSS = `
box-sizing: border-box;
overflow-x: auto;
border-radius: ${T('container-shape')};
padding-block: ${T(`container-padding-block-${DEFAULT_SIZE}`)};
padding-inline: ${T(`container-padding-inline-${DEFAULT_SIZE}`)};
background: ${T(`${DEFAULT_VARIANT}-container-color`)};
--_code-block-font: ${T(`code-typescale-${DEFAULT_SIZE}-font`)};
--_code-block-tracking: ${T(`code-typescale-${DEFAULT_SIZE}-letter-spacing`)};${CODE_TEXT}`
  .trim()
  .replace(/^ +/gm, '');
