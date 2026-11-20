import { type CSSResult, unsafeCSS } from 'lit';

/**
 * Text is set from a type role's LONGHAND custom properties — `<role>-font-weight`, `-font-size`, `-line-height` and
 * `-font-family`, read where the text is drawn. A role has no composite custom property.
 *
 * A custom property's `var()` is resolved where the property is declared. The tokens are declared on the root, so a
 * composite would be resolved there, from the root's longhands: a product that set one longhand on an element
 * (`--tanrei-comp-button-label-typescale-medium-font-size` on one button, or on a section of its page) would leave it,
 * and a `font` that read it, as they were. Read one by one where the text is drawn, each longhand takes the value that
 * element sees, so overriding one changes that property and nothing else.
 *
 * They are composed into the `font` shorthand, not set as four properties: the shorthand also resets what a role does not
 * name (`font-style`, `font-variant`, `font-feature-settings`, `font-variation-settings`, `font-stretch` …), so that a
 * label does not take an icon glyph's variation axes or a table cell's tabular figures from what holds it — as it always
 * did. The letter spacing is the fifth longhand of a role, read beside it (`font` never sets it).
 *
 * `-line-height` is the role's ratio (DTCG's lineHeight), the one entry a product overrides. It is a rounded fraction
 * (16 / 12 is 1.3333: a 12 px line 15.9996 px tall, which the browser lays out between pixels), so it is never drawn
 * bare: the text's line is `lineBox(<-line-height>)`, the size times the ratio rounded to a whole pixel where the text is
 * drawn, and a box that holds lines of the role away from the text is `lineOf(<-line-height>, <-font-size>)`, the same
 * rounding. Both read the ratio where they are, so one override on the root or on an element moves the text and the
 * boxes alike (src/line-height-override.test.ts).
 */
export const TYPE_LONGHANDS = ['font-family', 'font-size', 'font-weight', 'line-height'] as const;
export type TypeLonghand = (typeof TYPE_LONGHANDS)[number];

/** The line of text drawn with line height `ratio`, on a whole pixel: a `line-height` value (`1em` is the text's size). */
export const lineBox = (ratio: string): string => `round(nearest, ${ratio} * 1em, 1px)`;

/** One line of a role as a length, where its text is not drawn: its ratio times its size, rounded as `lineBox()` is. */
export const lineOf = (ratio: string, size: string): string => `round(nearest, ${ratio} * ${size}, 1px)`;

/**
 * The declaration that sets text from a role: `read(longhand)` gives each longhand's value
 * (`typeface((longhand) => \`var(--tanrei-comp-chip-label-typescale-${longhand})\`)`).
 */
export const typeface = (read: (longhand: TypeLonghand) => string): string => `font: ${read('font-weight')} ${read('font-size')}/${lineBox(read('line-height'))} ${read('font-family')};`;

/**
 * `typeface()` for a `css` template, through the component's own reader of its tokens: `typefaceOf(t, 'label-typescale')`
 * reads `t('label-typescale-font-weight')` and the other three (a reader that returns a `CSSResult` is read as its text).
 */
export const typefaceOf = (read: (name: string) => unknown, role: string): CSSResult => unsafeCSS(typeface((longhand) => String(read(`${role}-${longhand}`))));

/** `typeface()` for a `css` template, from the custom properties named `<base>-<longhand>` (`typefaceFrom('--_label')`). */
export const typefaceFrom = (base: string): CSSResult => unsafeCSS(typeface((longhand) => `var(${base}-${longhand})`));
