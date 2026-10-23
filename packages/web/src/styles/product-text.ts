import { type CSSResult, nothing, unsafeCSS } from 'lit';

/**
 * Text the product gives a component — a label, a value — laid out as text of its own direction (BTN-20
 * and its like): `on` is the box in the component's shadow root that holds the text (a slot's parent, or the element the
 * component writes the string into).
 *
 * - **Isolated, by its first strong character**: `unicode-bidi: plaintext`. On a block it gives each paragraph
 *   the base direction of its first strong character; on an inline box it is an isolate of that direction. So
 *   `Call +1 555 0100` keeps its order in a right-to-left layout and reorders nothing beside it. The box's own
 *   `direction` — what its paddings, its `:dir()` and its children's order follow — is untouched.
 * - **A text without a letter is left to right** in every layout: a paragraph with no strong character is, under
 *   `plaintext`, in every engine (UAX #9, P3), whatever the box's `direction`. That is the drawing meant: `−5`, `40 %`
 *   and `+1 555 0100` keep their order in a right-to-left layout, where a right-to-left paragraph would draw `5−`,
 *   `% 40` and `0100 555 1+` (`product-text-direction.test.ts` holds it). A range given as one
 *   string (`10 – 20`) is then read from the left too.
 * - **Cut at its own end**: a line that does not fit must overflow, and take its `text-overflow` ellipsis, at the
 *   end of the text's own direction, so a left-to-right label in a right-to-left layout loses its right end. `plaintext`
 *   alone gives that in Chromium only, which places the ellipsis by the paragraph's direction. WebKit and Firefox place
 *   it by the BOX's `direction`, which is still the layout's: WebKit then cuts a label of the other direction at its
 *   beginning, and Firefox clips it mid-letter with no ellipsis (its overflow lies on the side the box cannot scroll
 *   to). So a box that can be cut also takes the text's direction as its own: `dir=${'${ownDirection(text)}'}` on the
 *   element in the template (below). A box that is never cut — it wraps, or is as wide as its line — needs nothing.
 * - **Placed and aligned by the layout**: where the component places the box — the flex order, the paddings — is
 *   the layout's already. The LINES inside it would follow the paragraph (`text-align: start` is resolved against the
 *   paragraph's direction under `plaintext`), so `align: 'start'` aligns them physically by the direction the box
 *   inherits: left, and right under `:dir(rtl)` — its own where it has no `dir`, and its parent's where it took the
 *   text's direction with `ownDirection()` (so `on` is then a selector whose first compound is the box itself or an
 *   ancestor of the layout's direction). A line too long for such a box still overflows at the text's own end, whatever
 *   the alignment. (`text-align: match-parent` says the same in one word and is not used: Chrome knows it only as
 *   `-webkit-match-parent`, and an unknown value would drop the declaration.) Leave `align` out for a box whose lines
 *   are centred, or that is exactly as wide as its one line.
 * - **Its two inline paddings are equal** (or it has none): room on one side of the text — a gap to an icon, an
 *   inset — is a margin of the box or a padding of its parent. WebKit lays a paragraph whose direction is not the
 *   layout's over the padding where the two differ (the main action button's label stood against its icon, MAB-19;
 *   a description in prose at its term's edge). `product-text.test.ts` looks at every fixture for it.
 * - **Broken by the strict rules of Japanese and Chinese** (`line-break: strict`, inherited by what is slotted into the
 *   box): a line neither begins with closing punctuation, a small kana, the prolonged sound mark (ー) or an iteration
 *   mark nor ends with opening punctuation. The browsers' default (`auto`) lets a line begin with ー or a small kana
 *   in Chromium, and in WebKit where the text is marked Japanese (Firefox's is strict already): a menu item's
 *   `Claude Code のコマンドをコピー` broke before its last ー. It is written whatever the text's language is, so a
 *   product that does not mark its Japanese text with `lang` still gets it: the strict rules differ from the others only
 *   for the characters of Chinese and Japanese (CSS Text 3, the line-break property).
 */
export function productText(on: string, { align }: { align?: 'start' } = {}): CSSResult {
  // Each selector of the right-to-left rule weighs what `on:dir(rtl)` weighs, so a component's own rule after this one
  // overrides it as it always did.
  return unsafeCSS(`
  ${on} {
    unicode-bidi: plaintext;
    line-break: strict;${align === 'start' ? '\n    text-align: left;' : ''}
  }${
    align === 'start'
      ? `
  ${on}:dir(rtl):where(:not([dir])),
  :dir(rtl) > ${on}:where([dir]),
  :host(:where(:dir(rtl))) > ${on}:where([dir]) {
    text-align: right;
  }`
      : ''
  }
`);
}

/** A character with a direction of its own: a letter of any script (digits, signs and spaces have none). */
const STRONG = /\p{L}/u;

/**
 * A run the product isolated already (U+2066, U+2067 or U+2068 … U+2069): it has a direction of its own and gives the
 * text around it none (UAX #9, P2 — the first strong character is looked for outside the isolates).
 */
const ISOLATED = /[\u2066-\u2068][^\u2066-\u2069]*\u2069/g;

/** Whether `text` has a first strong character: a letter outside every run the product isolated. */
function hasLetter(text: string): boolean {
  let outside = text;
  // An isolate inside an isolate: the innermost go first.
  for (let before = ''; before !== outside; ) {
    before = outside;
    outside = outside.replace(ISOLATED, '');
  }
  return STRONG.test(outside);
}

/**
 * The `dir` attribute of a box that holds a product's text on one line and cuts it (`overflow: hidden` with
 * `text-overflow: ellipsis`): `auto` — the direction of the text's first strong character becomes the box's own, so
 * every engine cuts the text, and draws the ellipsis, at the text's own end (see `productText()`) —
 * and no attribute at all for a text without a letter (a count, a date): its box keeps the layout's direction, which
 * places it, and its text is left to right there as everywhere (see `productText()`).
 *
 * Use it only on a box whose own `direction` places nothing: no inline-start or inline-end inset, padding or margin of
 * its own, no `text-align: start` and no `:dir()` rule of the component's (`productText()`'s `align: 'start'` is
 * written for it: it aligns such a box by its parent's direction). A box that needs those keeps them and holds the
 * text in a child that takes this attribute.
 */
export function ownDirection(text: string): 'auto' | typeof nothing {
  return hasLetter(text) ? 'auto' : nothing;
}

/** The scripts written from right to left (the bidirectional classes R and AL, as far as a product writes a unit in them). */
const RIGHT_TO_LEFT = /[\p{Script=Hebrew}\p{Script=Arabic}\p{Script=Syriac}\p{Script=Thaana}\p{Script=Nko}\p{Script=Adlam}\p{Script=Samaritan}\p{Script=Mandaic}\p{Script=Hanifi_Rohingya}]/u;
/** The direction marks a product may write to say which way a text without a letter of that direction runs. */
const MARKS: Record<string, 'ltr' | 'rtl'> = { '‎': 'ltr', '‏': 'rtl', '؜': 'rtl' };

/** The direction of a text's first strong character — a letter, or a direction mark — or null where it has none. */
export function firstStrong(text: string | null | undefined): 'ltr' | 'rtl' | null {
  for (const character of text ?? '') {
    const mark = MARKS[character];
    if (mark) return mark;
    if (STRONG.test(character)) return RIGHT_TO_LEFT.test(character) ? 'rtl' : 'ltr';
  }
  return null;
}

/**
 * The direction of the one run of writing a value makes with its prefix and its suffix (NMI-39, TXI-67): that of the
 * first strong character of the prefix, then of the suffix, and left-to-right where neither has one — no affix, or
 * signs alone — because a number is written left to right. It is the `dir` of the box that holds the three, in every
 * layout direction; nothing but the two affixes is read (not the text being typed, the value or the locale), so
 * nothing changes sides while a person types.
 *
 * The box's own `direction` then differs from the layout's wherever the run runs against it. So the box places nothing
 * of its own by a logical side that is meant as the layout's (a margin toward an icon is written from the layout's
 * side for that case), and the native element inside it is aligned physically.
 */
export function runDirection(prefixText: string | null | undefined, suffixText: string | null | undefined): 'ltr' | 'rtl' {
  return firstStrong(prefixText) ?? firstStrong(suffixText) ?? 'ltr';
}
