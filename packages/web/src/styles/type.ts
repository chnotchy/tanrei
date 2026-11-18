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
 */
export const TYPE_LONGHANDS = ['font-family', 'font-size', 'font-weight', 'line-height'] as const;
export type TypeLonghand = (typeof TYPE_LONGHANDS)[number];

/**
 * The declaration that sets text from a role: `read(longhand)` gives each longhand's value
 * (`typeface((longhand) => \`var(--tanrei-comp-chip-label-typescale-${longhand})\`)`).
 */
export const typeface = (read: (longhand: TypeLonghand) => string): string => `font: ${read('font-weight')} ${read('font-size')}/${read('line-height')} ${read('font-family')};`;

/**
 * `typeface()` for a `css` template, through the component's own reader of its tokens: `typefaceOf(t, 'label-typescale')`
 * reads `t('label-typescale-font-weight')` and the other three (a reader that returns a `CSSResult` is read as its text).
 */
export const typefaceOf = (read: (name: string) => unknown, role: string): CSSResult => unsafeCSS(typeface((longhand) => String(read(`${role}-${longhand}`))));

/** `typeface()` for a `css` template, from the custom properties named `<base>-<longhand>` (`typefaceFrom('--_label')`). */
export const typefaceFrom = (base: string): CSSResult => unsafeCSS(typeface((longhand) => `var(${base}-${longhand})`));
