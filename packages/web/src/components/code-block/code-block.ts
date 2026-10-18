import { LitElement, type PropertyDeclarations, type PropertyValues, html, nothing } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import { AvailabilityController, OpenAxesController, report, syncFocusStyle, WordsController } from '../../primitives/index.js';
import type { TanreiCodeBlockSizeRegistry, TanreiCodeBlockVariantRegistry } from '../../registry.js';
import { firstLine, furnish } from './code-block.lines.js';
import { ownDirection } from '../../styles/product-text.js';
import '../copy-button/copy-button.js';
import type { TanreiCopyButtonCopiedDetail, TanreiCopyButtonCopyFailedDetail } from '../copy-button/copy-button.js';
import { CODE_BLOCK_CSS, CODE_BLOCK_DRAWN, SYNTAX_ROLES, roleRule } from './code-block.light.js';
import { adoptUnlessDrawn } from '../../primitives/sheets.js';
import { AXES, styles } from './code-block.styles.js';

/** The core variants (filled, outlined), plus any a design system's generated `.d.ts` registers. */
export type TanreiCodeBlockVariant = keyof TanreiCodeBlockVariantRegistry;
/** The core sizes (small, medium), plus any a design system's generated `.d.ts` registers. */
export type TanreiCodeBlockSize = keyof TanreiCodeBlockSizeRegistry;
/**
 * What a run is (COD-18): `plain`, or one of the syntax roles — the values of the token axis `comp.code-block.syntax` —
 * as `data-syntax` on a `<span>` in the code. A design system may add a role; a run names it as it names
 * these.
 */
export type TanreiCodeBlockSyntax = 'plain' | (typeof SYNTAX_ROLES)[number];

/** A run (COD-18): a piece of the code and what it is. The runs' texts, joined in order, are the code. */
export interface TanreiCodeBlockRun {
  text: string;
  syntax?: TanreiCodeBlockSyntax | (string & {});
}

/**
 * A highlighter (COD-19, COD-27): given the code's text and the block's `language` — trimmed, in lower case — the
 * runs, at once or later, or null for "I do not know this language: leave it plain". `signal` is aborted when the code
 * or the language changes, or the block leaves the document, before the answer. It is the type of `highlight` of
 * `@tanrei/web/highlight`, and of what `setHighlighter` takes.
 */
export type TanreiCodeBlockHighlighter = (code: string, language: string, signal: AbortSignal) => readonly TanreiCodeBlockRun[] | null | Promise<readonly TanreiCodeBlockRun[] | null>;

/** What `copied` carries: the text that was copied. */
export interface TanreiCodeBlockCopiedDetail {
  text: string;
}
/** What `copyfailed` carries: the platform's reason, where it gave one. */
export interface TanreiCodeBlockCopyFailedDetail {
  reason: unknown;
}

const SYNTAXES: readonly string[] = ['plain', ...SYNTAX_ROLES];
/** COD-27: code that has no syntax. Drawn plain, and nothing is said. */
const NO_SYNTAX: readonly string[] = ['', 'text', 'plain', 'plaintext'];
/** A role a design system may have added: a name a custom property can carry. */
const ROLE = /^[a-z][a-z0-9-]*$/;
/** What marks code highlighted where the page was made (COD-29), on the `<code>`. */
const GIVEN = 'data-syntax-of';

/** What the element writes into the code's lines: attribute names, so the stylesheet and the element share them. */
const LINE = 'data-line';
const LINE_CODE = 'data-line-code';
const GUTTER = 'data-line-gutter';
const PROMPT = 'data-line-prompt';
const LABEL = 'data-line-label';

/** The light-DOM rules (code-block.light.ts), one constructed sheet per document, adopted by every root that holds a block. */
let lightSheet: CSSStyleSheet | null | undefined;
/** Unless the root draws the block's lines already — the page loaded `@tanrei/web/code.css`, which sets `CODE_BLOCK_DRAWN` on the block. */
function adoptLightRules(block: Element) {
  if (lightSheet === undefined) {
    try {
      lightSheet = new CSSStyleSheet();
      lightSheet.replaceSync(CODE_BLOCK_CSS);
    } catch {
      // No constructed stylesheets: the block is then drawn by `@tanrei/web/code.css` alone.
      lightSheet = null;
    }
  }
  adoptUnlessDrawn(block, lightSheet, CODE_BLOCK_DRAWN);
}

/**
 * The highlighter the block brings (COD-19, COD-28): `@tanrei/web/highlight`, a module of its own that this one does
 * not import — a block that needs it imports it the first time, and a page whose code was highlighted where it was
 * made, or that shows no code to highlight, loads none of it.
 */
type Highlight = typeof import('../../highlight/index.js');
let highlightModule: Highlight | undefined;
let highlightLoading: Promise<Highlight> | undefined;
const loadHighlight = () =>
  (highlightLoading ??= import('../../highlight/index.js').then(
    (module) => (highlightModule = module),
    (error: unknown) => {
      // Asked again, it is tried again.
      highlightLoading = undefined;
      throw error;
    },
  ));

/** COD-27: an unknown language is reported once for each name. */
const unknownLanguages = new Set<string>();
/** The roles a design system added that have their rule in the adopted sheet. */
const addedRoles = new Set<string>();

/**
 * COD-28: the first colors of a block are never drawn in the task that draws its code, and the blocks of a page are
 * not all colored in one task: what is owed waits here and is done a few milliseconds at a time, each block whole (its
 * colors arrive in one frame), in tasks of their own — never in a frame callback, so a page at rest asks for none.
 */
const owed: (() => void)[] = [];
let paying = false;
/** How long one such task may run before it lets the page answer: half of a frame at 60 a second. Not a design value. */
const SLICE_MS = 8;
function pay() {
  const until = performance.now() + SLICE_MS;
  while (owed.length && performance.now() < until) owed.shift()!();
  if (owed.length) setTimeout(pay);
  else paying = false;
}
function later(job: () => void) {
  owed.push(job);
  if (paying) return;
  paying = true;
  setTimeout(pay);
}

/**
 * COD-7: whether a body can scroll is a matter of sizes — the body's and the code's. One observer for every block of
 * the page: it is told of them all after a layout, reads them all, and only then tells the blocks, so the blocks of a
 * page are measured in one pass and none of them asks for a layout of its own.
 */
interface Measured {
  /** Whether the block's body can scroll: a reading of the layout. */
  read(): boolean;
  /** What was read, for the block to draw. */
  tell(can: boolean): void;
}
const watched = new WeakMap<Element, Measured>();
const sizes =
  typeof ResizeObserver === 'undefined'
    ? null
    : new ResizeObserver((entries) => {
        const blocks = new Set<Measured>();
        for (const entry of entries) {
          const block = watched.get(entry.target);
          if (block) blocks.add(block);
        }
        const read = [...blocks].map((block) => [block, block.read()] as const);
        for (const [block, can] of read) block.tell(can);
      });

/** One line of a reading (COD-33): the box that holds the line's code, and the runs that are its text. */
type Piece = { text: string; syntax?: string };
const signature = (pieces: readonly Piece[]) => pieces.map((piece) => `${piece.syntax ?? ''}\u0001${piece.text}`).join('\u0002');

const endsLine = (node: Node) => node.textContent?.endsWith('\n') ?? false;
const setAttribute = (element: Element, name: string, value: string | null) => {
  if (value === null) {
    if (element.hasAttribute(name)) element.removeAttribute(name);
  } else if (element.getAttribute(name) !== value) element.setAttribute(name, value);
};

/**
 * A node as pieces that each hold at most one line break, at their end — a text node split after every break, an
 * element (a run that spans lines) as one shallow copy per line — without adding or removing a character.
 */
function pieces(node: Node): Node[] {
  const text = node.textContent ?? '';
  const first = text.indexOf('\n');
  if (first < 0 || first === text.length - 1) return [node];
  if (node.nodeType === Node.TEXT_NODE) {
    const out: Node[] = [];
    let rest = node as Text;
    for (let at = rest.data.indexOf('\n'); at >= 0 && at < rest.data.length - 1; at = rest.data.indexOf('\n')) {
      const next = rest.splitText(at + 1);
      out.push(rest);
      rest = next;
    }
    out.push(rest);
    return out;
  }
  if (!(node instanceof Element)) return [node];
  const out: Node[] = [];
  let current = node.cloneNode(false) as Element;
  for (const child of [...node.childNodes]) {
    for (const piece of pieces(child)) {
      current.append(piece);
      if (endsLine(piece)) {
        out.push(current);
        current = node.cloneNode(false) as Element;
      }
    }
  }
  if (current.hasChildNodes()) out.push(current);
  node.remove();
  return out;
}

/**
 * Shows lines of code to read, compare and copy: in the code face, on a quiet fill or inside one hairline, scrolling
 * inside itself or wrapping, with an optional header, line numbers, marked lines, a prompt and a copy button; given
 * the code and its language it highlights the code by itself, in the system's syntax colors.
 *
 * Contract: specs/code-block.spec.json. The code stays in the document, as an ordinary `<pre><code>`:
 *
 *     <tanrei-code-block headline="sizes.js" language="js" copy copy-label="Copy" copied-label="Copied" copy-failed-label="Could not copy">
 *       <pre><code>const sizes = ['small', 'medium', 'large'];</code></pre>
 *     </tanrei-code-block>
 *
 * so it is there without script — for a reader whose script failed, for crawlers, for find-in-page — and the element
 * draws the frame around it. `@tanrei/web/code.css` draws a block that is not upgraded yet where the element will: its
 * fill, corners, paddings and face, the header's row with the title and the language label, the room of the copy
 * button, and — for lines written where the page was made — what stands beside them; nothing moves when the element
 * is defined. A block built by script sets `code` instead, and the element writes the `<pre><code>`.
 *
 * **It highlights by itself** (COD-19). Three sources of color, in this order: runs the document gives —
 * `<span data-syntax="keyword">` in the `<code>`, or a `<code data-syntax-of="…">` written by `highlightToHtml` where
 * the page was made — are drawn as they are and never read again (COD-29); otherwise, while `highlight` is true and
 * `language` names a language the highlighter knows, the block imports `@tanrei/web/highlight` and colors the code
 * (COD-27); otherwise the code is plain. The code is drawn at once, plain; its colors arrive in one frame and move
 * nothing (COD-28). A role is one of `comment`, `keyword`, `string`, `constant`, `function`, `type`, `tag`, `property`,
 * `punctuation` — or one a design system added — colored from `--tanrei-comp-code-block-syntax-color-*` and weighted
 * from `…-syntax-emphasis-*`. `language` is not drawn: the header's words are `language-label`.
 *
 * **Lines.** The element gives each line a box of its own — `<span data-line>` holding `<span data-line-code>` — by
 * moving the code's nodes and splitting text and runs at line breaks, without adding or removing a character of the
 * code; `[data-line]` children a highlighter already wrote are used as they are, and lines that `highlightToHtml`
 * wrote with the block's props are left untouched. Numbers, signs and the prompt are
 * drawn, not text: never selected, copied or read. A marked line's label (`highlighted-label`, `added-label`,
 * `removed-label`) is the one thing it adds for assistive technology, before the line.
 *
 * The body is one focus stop, with the block's name, only while it can scroll; it is left to right in every layout,
 * and the frame mirrors. The outlined look is read on whatever it is placed on: where that is not the surface color,
 * name it in `--tanrei-code-block-ground`, which the gutter and the copy button's patch stand on while code scrolls
 * under them.
 *
 * @tag tanrei-code-block
 * @slot - The code: one `<pre><code>`. Runs are `<span data-syntax="…">` inside the `<code>`.
 * @csspart container - The block: its fill, its corners, and the edge of the outlined look.
 * @csspart header - The row that holds the title, the language and the copy button.
 * @csspart title - The title.
 * @csspart language - The language label (`language-label`).
 * @csspart copy-button - The copy button (a `<tanrei-copy-button>`).
 * @csspart body - The part that holds the lines and scrolls.
 * @cssprop --tanrei-code-block-ground - The color the outlined look is placed on, where it is not `sys.color.surface`: what the gutter and the copy button's patch are filled with.
 * @fires {CustomEvent<TanreiCodeBlockCopiedDetail>} copied - The code was copied by the block's copy button; `detail.text` is the text that was copied.
 * @fires {CustomEvent<TanreiCodeBlockCopyFailedDetail>} copyfailed - The platform refused the copy asked for by the block's copy button; `detail.reason` is its reason, where it gave one.
 */
export class TanreiCodeBlock extends LitElement {
  private readonly availability = new AvailabilityController(this, 'code-block');
  /** The product's words, read where the instance gives none (src/primitives/words.ts). */
  private readonly words = new WordsController(this);
  static override styles = styles;

  static override properties: PropertyDeclarations = {
    code: { type: String },
    variant: { type: String, reflect: true },
    size: { type: String, reflect: true },
    headline: { type: String },
    language: { type: String },
    languageLabel: { type: String, attribute: 'language-label' },
    // True by default, so its attribute is written to turn it off: highlight="false".
    highlight: { converter: { fromAttribute: (value: string | null) => value === null || value.trim().toLowerCase() !== 'false' } },
    label: { type: String },
    wrap: { type: Boolean, reflect: true },
    lineNumbers: { type: Boolean, reflect: true, attribute: 'line-numbers' },
    startLine: { type: Number, attribute: 'start-line' },
    highlightedLines: { type: String, attribute: 'highlighted-lines' },
    addedLines: { type: String, attribute: 'added-lines' },
    removedLines: { type: String, attribute: 'removed-lines' },
    highlightedLabel: { type: String, attribute: 'highlighted-label' },
    addedLabel: { type: String, attribute: 'added-label' },
    removedLabel: { type: String, attribute: 'removed-label' },
    prompt: { type: String },
    maxLines: { type: Number, attribute: 'max-lines' },
    copy: { type: Boolean, reflect: true },
    copyLabel: { type: String, attribute: 'copy-label' },
    copiedLabel: { type: String, attribute: 'copied-label' },
    copyFailedLabel: { type: String, attribute: 'copy-failed-label' },
    empty: { state: true },
    scrollable: { state: true },
    copyText: { state: true },
    lineCount: { state: true },
    gutter: { state: true },
  };

  /**
   * The code as plain text, lines separated by line breaks, for a block built by script: the element writes the
   * `<pre><code>` itself. Leave it empty when the `<pre><code>` is in the document. Ignored where the code holds runs.
   */
  code = '';

  /** filled: a quiet fill, for code on a page. outlined: no fill inside one hairline, for code inside a container that is already filled. */
  variant: TanreiCodeBlockVariant = 'filled';

  /** medium sets the code in the code role, for a page and a panel; small in the small code role with less padding, for dense interfaces. */
  size: TanreiCodeBlockSize = 'medium';

  /** A file name or a few words that say what the code is (the spec's `title`). Drawn in the header and used as the block's accessible name. */
  headline = '';

  /**
   * The language the code is written in, as an identifier ("tsx", "css", "swift", "sh"), read without regard to case.
   * It is what the block highlights by (COD-19, COD-27); it is not drawn. Empty, "text", "plain" and "plaintext" mean
   * code that has no syntax; a language the highlighter does not know is drawn plain. The block never guesses one.
   */
  language = '';

  /** The language in your words ("TypeScript", "Shell"), drawn in the header. A label only: the block does not highlight by it. */
  languageLabel = '';

  /**
   * True: the block highlights the code by itself where it can (COD-19). False — the attribute `highlight="false"` —
   * it never does, whatever `language` says; runs the document gives are still drawn in their colors.
   */
  highlight = true;

  /** The block's accessible name where it has no title. Not drawn. A block that can scroll needs a title or a label. */
  label = '';

  /** False: a line is never broken, and lines that do not fit scroll sideways inside the block. True: a line that does not fit continues on the next row. */
  wrap = false;

  /** Draws each line's number in a gutter at the left of the code. */
  lineNumbers = false;

  /** The number of the first line: an excerpt of a file keeps the file's numbers. A whole number of 1 or more. */
  startLine = 1;

  /** The lines the text around the block talks about, by number, as numbers and ranges separated by commas ("3, 7-9"), counted from `startLine`. */
  highlightedLines = '';

  /** The lines a change adds, written as `highlightedLines` is. */
  addedLines = '';

  /** The lines a change takes away, written as `highlightedLines` is. They are drawn, and left out of what the copy button copies. */
  removedLines = '';

  /** What assistive technology reads before a highlighted line ("Highlighted"). Required while `highlightedLines` names a line. */
  highlightedLabel = '';

  /** What assistive technology reads before an added line ("Added"). Required while `addedLines` names a line. */
  addedLabel = '';

  /** What assistive technology reads before a removed line ("Removed"). Required while `removedLines` names a line. */
  removedLabel = '';

  /** A prompt ("$", ">") drawn before every line that is not empty. It is not part of the code: not selected, not copied, not read. */
  prompt = '';

  /** The most lines shown at once; more than that scroll up and down inside the block. Null shows every line. */
  maxLines: number | null = null;

  /** Draws a copy button that copies the code. */
  copy = false;

  /** The copy button's accessible name ("Copy"). Required while `copy` is true. */
  copyLabel = '';

  /** What the copy button announces when the code has been copied ("Copied"). Required while `copy` is true. */
  copiedLabel = '';

  /** What the copy button announces when the platform refuses the copy ("Could not copy"). Required while `copy` is true. */
  copyFailedLabel = '';

  /** COD-25: there is no code. */
  protected empty = true;

  /** COD-7: the body can scroll, sideways or up and down. */
  protected scrollable = false;

  /** COD-11: what the copy button copies — the lines without the removed ones, joined by line breaks. */
  protected copyText = '';

  /** How many lines the code has (COD-6). */
  protected lineCount = 0;

  /** Whether the lines have a gutter (COD-13): it stays in view at the left, over the room of a corner button there (COD-20). */
  protected gutter = false;

  /** COD-25: sizes and variants a design system adds, and a value the active system does not have (src/primitives/axes.ts). */
  private readonly axes = new OpenAxesController(this, { component: 'code-block', behavior: 'COD-25', axes: AXES });

  /** COD-25: the custom state the styles read to take a block with no code out of the layout. */
  private readonly internals: ElementInternals | null = typeof this.attachInternals === 'function' ? this.attachInternals() : null;

  /**
   * The highlighter of every code block, where it is not Tanrei's own (COD-27: "replace the highlighter whole").
   * Undefined — the default: `@tanrei/web/highlight`, imported the first time a block needs it; `setHighlighter` and
   * `registerLanguage` of that module change what it answers. A function: it is asked instead, and that module is never
   * loaded — for a product that has a highlighter it trusts and wants none of Tanrei's. Null: no block highlights by
   * itself. Runs the document gives are drawn whatever this is (COD-29).
   */
  static highlighter: TanreiCodeBlockHighlighter | null | undefined = undefined;

  /** The runs this element wrote from the highlighter's answer (as against runs the document gave: COD-29). */
  private readonly colored = new WeakSet<Element>();

  /** What this element last wrote into a line's code, by that line's box: its runs, as one string. */
  private readonly drawn = new WeakMap<Element, string>();

  /** What the highlighter was last asked — the language and the texts — and the way to cancel that question. */
  private asked: string | null = null;
  private asking: AbortController | null = null;

  /** Whether the highlighter was asked since the block was last put in the document: its first colors wait for a later task (COD-28), later ones do not (COD-30). */
  private questioned = false;

  /** The lines this element made (as against `[data-line]` children a highlighter wrote). */
  private readonly made = new WeakSet<Element>();

  /** The text `code` last wrote into the document. */
  private written: string | null = null;

  /** COD-22: the code, its runs or its lines changed in the document. */
  private readonly mutations = typeof MutationObserver === 'undefined' ? null : new MutationObserver(() => this.sync());

  /** COD-7: what the page's size observer watches for this block. */
  private observedPre: Element | null = null;
  private observedBody: Element | null = null;

  private get body() {
    return this.renderRoot?.querySelector<HTMLElement>('.body') ?? null;
  }

  private get pre() {
    return [...this.children].find((child): child is HTMLPreElement => child.localName === 'pre') ?? null;
  }

  /** The `<code>` that holds the code: the `pre`'s own, made around the `pre`'s content where the product wrote none. */
  private codeElement(create = false): HTMLElement | null {
    let pre = this.pre;
    if (!pre) {
      if (!create) return null;
      pre = document.createElement('pre');
      this.append(pre);
    }
    const existing = [...pre.children].find((child) => child.localName === 'code') as HTMLElement | undefined;
    if (existing) return existing;
    if (!create && !pre.textContent) return null;
    const code = document.createElement('code');
    code.append(...pre.childNodes);
    pre.append(code);
    return code;
  }

  override connectedCallback() {
    super.connectedCallback();
    adoptLightRules(this);
    this.addEventListener('copy', this.onSelectionCopy);
    this.mutations?.observe(this, { childList: true, subtree: true, characterData: true });
    this.sync();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('copy', this.onSelectionCopy);
    this.mutations?.disconnect();
    this.cancelRuns();
    this.questioned = false;
    for (const element of [this.observedPre, this.observedBody]) {
      if (!element) continue;
      sizes?.unobserve(element);
      watched.delete(element);
    }
    this.observedPre = this.observedBody = null;
  }

  private cancelRuns() {
    this.asking?.abort();
    this.asking = null;
    this.asked = null;
  }

  /** COD-29: the document gives the runs — the `<code>` says it was highlighted, or holds a run this element did not write. */
  private given(code: Element): boolean {
    if (code.hasAttribute(GIVEN)) return true;
    for (const run of code.querySelectorAll('[data-syntax]')) if (!this.colored.has(run)) return true;
    return false;
  }

  /**
   * COD-19: a role the active design system does not have is drawn plain (no rule matches it) and reported. A role a
   * design system added to the axis has its two tokens in the cascade: it gets its rule, once.
   */
  private checkRoles(roles: Iterable<string>) {
    let style: CSSStyleDeclaration | undefined;
    for (const role of new Set(roles)) {
      if (SYNTAXES.includes(role) || addedRoles.has(role)) continue;
      if (ROLE.test(role) && (style ??= getComputedStyle(this)).getPropertyValue(`--tanrei-comp-code-block-syntax-color-${role}`).trim() !== '') {
        try {
          lightSheet?.insertRule(`@layer tanrei.components { ${roleRule(role)} }`, lightSheet.cssRules.length);
          addedRoles.add(role);
        } catch {
          // Without the sheet the role is drawn by the stylesheet of the system that added it, or plain.
        }
        continue;
      }
      report(this, 'COD-19', `the syntax role "${role}" is not one of ${SYNTAXES.join(', ')}, nor one the active design system added; the run is drawn plain`);
    }
  }

  /** COD-31: `comp.code-block.syntax.max-length`, as the cascade gives it to this block; no limit where it is not a number. */
  private get maxLength(): number {
    const value = Number.parseFloat(getComputedStyle(this).getPropertyValue('--tanrei-comp-code-block-syntax-max-length'));
    return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
  }

  /** The code of every line this element colored, plain again (the text is the same: COD-19). */
  private uncolor(boxes: readonly HTMLElement[]) {
    this.write(boxes.filter((box) => this.drawn.has(box)).map((box) => ({ box, pieces: [{ text: box.textContent ?? '' }] })));
  }

  /**
   * COD-28, COD-30: draws runs — in one pass, replacing the children of each line whose runs are not the ones drawn and
   * touching no other line. Only colors and weights change (COD-18), so nothing moves; a selection in a line that is
   * written again is put back where it was, by its characters.
   */
  private write(lines: readonly { box: HTMLElement; pieces: readonly Piece[] }[]) {
    const changed = lines
      .map((line) => ({ ...line, to: signature(line.pieces) }))
      // A line that was never colored and has no colored run is left as the document has it.
      .filter(({ box, pieces, to }) => (this.drawn.has(box) ? this.drawn.get(box) !== to : pieces.some((piece) => piece.syntax && piece.syntax !== 'plain')));
    if (!changed.length) return;
    const selection = document.getSelection();
    const boxes = new Set(changed.map((line) => line.box));
    // Where the selection's two ends are, as characters of a line that is about to be written again.
    const point = (node: Node | null, offset: number) => {
      const box = node && [...boxes].find((each) => each.contains(node));
      if (!node || !box) return null;
      const before = document.createRange();
      before.selectNodeContents(box);
      before.setEnd(node, offset);
      return { box, at: before.toString().length };
    };
    const ends = selection && selection.rangeCount > 0 ? ([point(selection.anchorNode, selection.anchorOffset), point(selection.focusNode, selection.focusOffset)] as const) : null;
    const kept = ends && (ends[0] || ends[1]) ? { anchor: [selection!.anchorNode, selection!.anchorOffset] as const, focus: [selection!.focusNode, selection!.focusOffset] as const } : null;
    for (const { box, pieces, to } of changed) {
      box.replaceChildren(
        ...pieces.map((piece) => {
          if (!piece.syntax || piece.syntax === 'plain') return document.createTextNode(piece.text);
          const span = document.createElement('span');
          span.setAttribute('data-syntax', piece.syntax);
          span.textContent = piece.text;
          this.colored.add(span);
          return span;
        }),
      );
      this.drawn.set(box, to);
    }
    if (kept && ends) {
      const place = (mark: { box: HTMLElement; at: number } | null, was: readonly [Node | null, number]): readonly [Node | null, number] => {
        if (!mark) return was;
        let left = mark.at;
        const walker = document.createTreeWalker(mark.box, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
          if (left <= node.data.length) return [node, left];
          left -= node.data.length;
        }
        return [mark.box, mark.box.childNodes.length];
      };
      const [anchor, focus] = [place(ends[0], kept.anchor), place(ends[1], kept.focus)];
      if (anchor[0] && focus[0]) selection!.setBaseAndExtent(anchor[0], anchor[1], focus[0], focus[1]);
    }
    // What was written here is not a change of the code.
    this.mutations?.takeRecords();
  }

  /** COD-32: the code stays plain, everything else the block does is untouched, and what failed is said once. */
  private failed(boxes: readonly HTMLElement[], what: string) {
    this.uncolor(boxes);
    report(this, 'COD-32', `${what}; the code is drawn plain`);
  }

  /**
   * COD-19, COD-27 to COD-33: colors the code by itself where it may. `readings` are the texts the code holds — one,
   * or two where a line is added or removed (COD-33) — each with the boxes of its lines' code. The first colors of a
   * block are owed to a later task (COD-28); a block that has its colors and whose code changes is read again in the
   * task of the change, where its highlighter answers at once, so the new code is drawn with its colors (COD-30).
   */
  private color(code: HTMLElement, boxes: readonly HTMLElement[], readings: readonly { text: string; boxes: readonly (HTMLElement | null)[] }[]) {
    const language = this.language.trim().toLowerCase();
    const own = TanreiCodeBlock.highlighter;
    // COD-29: the document's runs are drawn as they are. COD-27: code with no syntax is plain, and nothing is said.
    if (!this.highlight || own === null || NO_SYNTAX.includes(language) || !boxes.length || this.given(code)) {
      this.cancelRuns();
      if (!this.given(code)) this.uncolor(boxes);
      return;
    }
    const question = `${language}\u0000${readings.map((reading) => reading.text).join('\u0000')}`;
    if (question === this.asked) return;
    const first = !this.questioned;
    this.questioned = true;
    this.cancelRuns();
    this.asked = question;
    const asking = (this.asking = new AbortController());
    const done = () => {
      if (this.asking === asking) this.asking = null;
    };
    const answer = (answers: readonly (readonly TanreiCodeBlockRun[] | null)[]) => {
      if (asking.signal.aborted || !this.isConnected) return;
      done();
      if (answers.some((runs) => !runs)) {
        // COD-27: a language the highlighter does not know. Plain, and said once for each name.
        this.uncolor(boxes);
        if (highlightModule && !own && !highlightModule.languages().includes(language) && !unknownLanguages.has(language)) {
          unknownLanguages.add(language);
          report(this, 'COD-27', `the highlighter does not know the language "${language}"; the code is drawn plain (register it with registerLanguage of @tanrei/web/highlight, or write language="text")`);
        }
        return;
      }
      const lines: { box: HTMLElement | null | undefined; pieces: Piece[] }[] = [];
      const roles = new Set<string>();
      for (const [index, reading] of readings.entries()) {
        const runs = answers[index]!;
        // COD-32: the runs' texts, joined, are the code — the one check that highlighting cannot alter text.
        if (runs.map((run) => run.text).join('') !== reading.text) return this.failed(boxes, 'the highlighter’s runs do not join to the code');
        let at = 0;
        let pieces: Piece[] = [];
        for (const run of runs) {
          if (run.syntax && run.syntax !== 'plain') roles.add(run.syntax);
          for (let from = 0; from < run.text.length; ) {
            const to = run.text.indexOf('\n', from) + 1 || run.text.length;
            pieces.push({ text: run.text.slice(from, to), syntax: run.syntax });
            from = to;
            if (run.text[to - 1] === '\n') {
              lines.push({ box: reading.boxes[at++], pieces });
              pieces = [];
            }
          }
        }
        if (pieces.length) lines.push({ box: reading.boxes[at++], pieces });
      }
      if (lines.some((line) => line.box === undefined)) return this.failed(boxes, 'the highlighter’s runs do not join to the code');
      this.checkRoles(roles);
      // (A line without a box is one another reading colors: COD-33.)
      this.write(lines.filter((line): line is { box: HTMLElement; pieces: Piece[] } => !!line.box));
    };
    const fail = (error: unknown) => {
      if (asking.signal.aborted || !this.isConnected) return;
      done();
      this.failed(boxes, `the highlighter failed (${error instanceof Error ? error.message : String(error)})`);
    };
    const ask = (highlighter: TanreiCodeBlockHighlighter) => {
      if (asking.signal.aborted || !this.isConnected) return;
      // COD-31: code that is too long is plain, whole.
      const length = Math.max(...readings.map((reading) => reading.text.length));
      const limit = this.maxLength;
      if (length > limit) {
        done();
        this.uncolor(boxes);
        report(this, 'COD-31', `the code is ${length} characters long, more than comp.code-block.syntax.max-length (${limit}); it is too long to highlight and is drawn plain`);
        return;
      }
      let answers: (readonly TanreiCodeBlockRun[] | null | Promise<readonly TanreiCodeBlockRun[] | null>)[];
      try {
        answers = readings.map((reading) => highlighter(reading.text, language, asking.signal));
      } catch (error) {
        return fail(error);
      }
      if (!answers.some((each) => each instanceof Promise)) answer(answers as (readonly TanreiCodeBlockRun[] | null)[]);
      // Answers that come later are drawn in a task of the queue's, so that the blocks of a page do not all draw in the one their grammar arrives in.
      else Promise.all(answers).then((late) => later(() => answer(late)), fail);
    };
    const highlighter = own ?? highlightModule?.highlight;
    // COD-30: a block that is shown and whose code, language or highlight changes is read in the task of the change,
    // so that — where its highlighter answers at once — the new code is drawn with its colors.
    if (!first && highlighter) return ask(highlighter);
    // COD-28: the first colors of a block are owed to a later task. COD-30: until runs are ready the lines that did not
    // change keep their colors, and the new ones are plain.
    later(() => {
      if (asking.signal.aborted || !this.isConnected) return;
      // (Read again: a product that sets the seam does so after the element is defined, in the task that drew this.)
      const now = TanreiCodeBlock.highlighter;
      if (now === null) return void (done(), this.uncolor(boxes));
      if (now ?? highlightModule) return ask(now ?? highlightModule!.highlight);
      loadHighlight().then(
        (module) => later(() => ask(module.highlight)),
        (error: unknown) => fail(new Error(`@tanrei/web/highlight could not be loaded: ${error instanceof Error ? error.message : String(error)}`)),
      );
    });
  }

  /**
   * Writes `code` as the text of the `<code>`. Where the lines are this element's own, the lines at the start that
   * are the same are left as they are — code that grows at its end keeps the lines it had, and their colors (COD-30).
   */
  private writeCode(target: HTMLElement, text: string) {
    const lines = [...target.childNodes];
    if (!lines.length || !lines.every((line) => line instanceof HTMLElement && this.made.has(line))) {
      target.textContent = text;
      return;
    }
    const next = text.match(/[^\n]*\n|[^\n]+/g) ?? [];
    const own = (line: Node) => [...(line as HTMLElement).children].find((child) => child.hasAttribute(LINE_CODE));
    let same = 0;
    while (same < lines.length && same < next.length && (own(lines[same])?.textContent ?? '') === next[same]) same++;
    // The last line of code that grows gains its line break, and is otherwise the line it was.
    if (same === lines.length - 1 && same < next.length && `${own(lines[same])?.textContent ?? ''}\n` === next[same]) own(lines[same++])!.append('\n');
    for (const line of lines.slice(same)) line.remove();
    if (same < next.length) target.append(next.slice(same).join(''));
  }

  /** COD-25: a start line below 1 or not whole is 1. */
  private get firstLine(): number {
    return firstLine(this.startLine);
  }

  /** COD-25: a line cap below 1 is none. */
  private get cap(): number | null {
    return typeof this.maxLines === 'number' && this.maxLines >= 1 ? Math.floor(this.maxLines) : null;
  }

  /**
   * The lines of the code as boxes (the spec's web note): `[data-line]` children of the `<code>`, each holding its code
   * in a `[data-line-code]`. Lines a highlighter wrote are kept; everything else is moved into lines made here, text
   * nodes and runs split at line breaks. No character is added or removed.
   */
  private lineBoxes(code: HTMLElement): HTMLElement[] {
    const isLine = (node: Node): node is HTMLElement => node instanceof HTMLElement && node.hasAttribute(LINE);
    const codeOf = (line: HTMLElement) => {
      let own = [...line.children].find((child) => child.hasAttribute(LINE_CODE)) as HTMLElement | undefined;
      if (!own) {
        own = document.createElement('span');
        own.setAttribute(LINE_CODE, '');
        own.append(...[...line.childNodes].filter((node) => !(node instanceof Element && (node.hasAttribute(GUTTER) || node.hasAttribute(PROMPT) || node.hasAttribute(LABEL)))));
        line.append(own);
      }
      return own;
    };
    const children = [...code.childNodes];
    // A line that ends where its line does: one line break, at its end (the last line may have none).
    const whole = (node: Node, last: boolean) => {
      if (!isLine(node)) return false;
      const text = codeOf(node).textContent ?? '';
      const at = text.indexOf('\n');
      return last ? at < 0 || at === text.length - 1 : at >= 0 && at === text.length - 1;
    };
    // The lines at the start that are whole are kept as they are — all of them, in the common case after the first
    // pass; where code was added or changed after them, they keep their boxes and so their colors (COD-30).
    let kept = 0;
    while (kept < children.length && whole(children[kept], kept === children.length - 1)) kept++;
    if (kept === children.length) return children as HTMLElement[];
    const lines = children.slice(0, kept) as HTMLElement[];
    // The code changed under the lines made here: take them apart, and lay the lines out again.
    for (const node of children.slice(kept)) {
      if (isLine(node) && this.made.has(node)) node.replaceWith(...codeOf(node).childNodes);
    }
    let open: HTMLElement | null = null;
    for (const node of [...code.childNodes].slice(kept)) {
      if (isLine(node)) {
        lines.push(node);
        open = endsLine(codeOf(node)) ? null : node;
        continue;
      }
      // A comment is no part of the code.
      if (node.nodeType !== Node.TEXT_NODE && node.nodeType !== Node.ELEMENT_NODE) continue;
      for (const piece of pieces(node)) {
        if (!open) {
          open = document.createElement('span');
          open.setAttribute(LINE, '');
          const own = document.createElement('span');
          own.setAttribute(LINE_CODE, '');
          open.append(own);
          this.made.add(open);
          lines.push(open);
        }
        codeOf(open).append(piece);
        if (endsLine(piece)) open = null;
      }
    }
    // The lines, in the order of the code.
    for (const line of lines.slice(kept)) code.append(line);
    return lines;
  }

  /**
   * COD-22: reads the code from the document and draws what the props say on its lines — numbers, signs, the prompt,
   * the marks and their labels — at once, without a motion and without announcing anything.
   */
  private sync() {
    if (!this.isConnected) return;
    // The `code` prop, for a block built by script: written once per value, unless the document gives runs (COD-29).
    if (this.code !== (this.written ?? '')) {
      const target = this.codeElement(!!this.code);
      if (target && this.given(target)) {
        if (this.code) report(this, 'COD-29', 'code is ignored: the <code> in the block holds runs, and their texts are the code');
      } else if (target) {
        this.writeCode(target, this.code);
      }
      this.written = this.code;
    }
    const code = this.codeElement();
    const pre = code?.parentElement ?? null;
    if (pre) {
      // COD-2: code is not translated and not spell-checked.
      if (!pre.hasAttribute('translate')) pre.setAttribute('translate', 'no');
      if (!pre.hasAttribute('spellcheck')) pre.setAttribute('spellcheck', 'false');
    }
    const boxes = code?.textContent ? this.lineBoxes(code) : [];
    const codes = boxes.map((line) => [...line.children].find((child) => child.hasAttribute(LINE_CODE)) as HTMLElement);
    const whole = codes.map((own) => own?.textContent ?? '');
    const texts = whole.map((text) => text.replace(/\n$/, ''));
    // COD-33: the texts the code holds — one, or two where a line is added or removed.
    let readings: { text: string; boxes: (HTMLElement | null)[] }[] = [{ text: whole.join(''), boxes: codes }];
    if (code && boxes.length) {
      // What stands beside each line (COD-13 to COD-17), decided as `highlightToHtml` decides it where a page is made
      // (code-block.lines.ts): lines that were written there are found as they should be, and nothing is written.
      const { lines: beside, first, highlighted, added, removed, problems } = furnish(texts, {
        lineNumbers: this.lineNumbers,
        startLine: this.startLine,
        highlightedLines: this.highlightedLines,
        addedLines: this.addedLines,
        removedLines: this.removedLines,
        // The words of a marked line: the instance's, else the product's.
        highlightedLabel: this.words.get('highlightedLabel', this.highlightedLabel),
        addedLabel: this.words.get('addedLabel', this.addedLabel),
        removedLabel: this.words.get('removedLabel', this.removedLabel),
        prompt: this.prompt,
      });
      for (const problem of problems) report(this, 'COD-14', problem);
      // COD-19: an unknown syntax role is plain (no rule matches it), and reported. (The roles of runs this element
      // writes are checked as they are written.)
      if (this.given(code)) this.checkRoles([...code.querySelectorAll('[data-syntax]')].map((run) => run.getAttribute('data-syntax') ?? ''));
      // COD-33: the lines that are not removed are the code after the change — what is copied — and color those lines;
      // the lines that are not added are the code before it, and color the removed ones.
      if (added.size || removed.size) {
        const after = codes.filter((_, index) => !removed.has(first + index));
        const before = codes.filter((_, index) => !added.has(first + index));
        const text = (of: HTMLElement[]) => of.map((own) => own.textContent ?? '').join('');
        readings = [
          { text: text(after), boxes: after },
          // Read whole, so that a removed line has the state the lines before it leave; only its own runs are drawn.
          { text: text(before), boxes: before.map((own) => (removed.has(first + codes.indexOf(own)) ? own : null)) },
        ];
      }
      const copied: string[] = [];
      boxes.forEach((line, index) => {
        const { gutter, number, sign, prompt, label, ...marks } = beside[index];
        for (const [mark, on] of Object.entries(marks)) setAttribute(line, `data-${mark}`, on ? '' : null);
        if (!marks.removed) copied.push(texts[index]);
        // What stands beside the code, in this order: the gutter, the prompt, the label, the code.
        let gutterBox: Element | undefined;
        let promptBox: Element | undefined;
        let labelBox: Element | undefined;
        for (const child of line.children) {
          if (child.hasAttribute(GUTTER)) gutterBox = child;
          else if (child.hasAttribute(PROMPT)) promptBox = child;
          else if (child.hasAttribute(LABEL)) labelBox = child;
        }
        const lineCode = codes[index];
        const part = (found: Element | undefined, name: string, wanted: boolean, before: Element) => {
          if (!wanted) {
            found?.remove();
            return undefined;
          }
          if (found) return found;
          const element = document.createElement('span');
          element.setAttribute(name, '');
          line.insertBefore(element, before);
          return element;
        };
        // COD-15, COD-16: the mark in words, before the line's text.
        labelBox = part(labelBox, LABEL, label !== null, lineCode);
        if (labelBox && labelBox.textContent !== label) labelBox.textContent = label;
        // COD-17: before every line that is not empty.
        promptBox = part(promptBox, PROMPT, prompt !== null, labelBox ?? lineCode);
        if (promptBox) {
          setAttribute(promptBox, 'aria-hidden', 'true');
          setAttribute(promptBox, 'data-prompt', prompt);
        }
        // COD-13, COD-16: drawn, not text — an empty element whose generated content is the number and the sign.
        gutterBox = part(gutterBox, GUTTER, gutter, promptBox ?? labelBox ?? lineCode);
        if (gutterBox) {
          setAttribute(gutterBox, 'aria-hidden', 'true');
          setAttribute(gutterBox, 'data-number', number);
          setAttribute(gutterBox, 'data-sign', sign);
        }
      });
      // COD-25: a marked line whose label is missing still draws.
      if (highlighted.size && this.words.lacks('highlightedLabel', this.highlightedLabel)) report(this, 'COD-25', 'highlightedLines names a line and highlightedLabel is empty; assistive technology is not told which lines are highlighted');
      if (added.size && this.words.lacks('addedLabel', this.addedLabel)) report(this, 'COD-25', 'addedLines names a line and addedLabel is empty; assistive technology is not told which lines are added');
      if (removed.size && this.words.lacks('removedLabel', this.removedLabel)) report(this, 'COD-25', 'removedLines names a line and removedLabel is empty; assistive technology is not told which lines are removed');
      this.copyText = copied.join('\n');
    } else {
      this.copyText = '';
    }
    if (code) this.color(code, codes, readings);
    this.lineCount = boxes.length;
    this.gutter = boxes.some((line) => [...line.children].some((child) => child.hasAttribute(GUTTER)));
    this.empty = boxes.length === 0;
    // What was written here is not a change of the code.
    this.mutations?.takeRecords();
    this.watchSizes();
  }

  /** The body and the product's `pre` are watched for their sizes (COD-7): the observer answers at once for each. */
  private watchSizes() {
    const [body, pre] = [this.body, this.pre];
    const watch = (now: Element | null, was: Element | null) => {
      if (now === was) return now;
      if (was) {
        sizes?.unobserve(was);
        watched.delete(was);
      }
      if (now) {
        watched.set(now, this.measured);
        sizes?.observe(now);
      }
      return now;
    };
    this.observedBody = watch(body, this.observedBody);
    this.observedPre = watch(pre, this.observedPre);
  }

  /** COD-7: the body can scroll while its content is larger than it, either way. Read by the page's size observer. */
  private readonly measured: Measured = {
    read: () => {
      const body = this.body;
      return !!body && (body.scrollWidth > body.clientWidth || body.scrollHeight > body.clientHeight);
    },
    tell: (can) => {
      this.scrollable = can;
    },
  };

  /**
   * COD-12: a copied selection holds the selected characters of the code alone, with the code's own line breaks —
   * never a label, and never a break the layout of the lines added. Only for a selection inside this block's code.
   */
  private readonly onSelectionCopy = (event: ClipboardEvent) => {
    const code = this.codeElement();
    const selection = document.getSelection();
    if (!code || !selection || selection.rangeCount === 0 || selection.isCollapsed || !event.clipboardData) return;
    const range = selection.getRangeAt(0);
    if (!code.contains(range.startContainer) || !code.contains(range.endContainer)) return;
    let text = '';
    const walker = document.createTreeWalker(code, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
      if (!range.intersectsNode(node) || node.parentElement?.closest(`[${LABEL}]`)) continue;
      const from = node === range.startContainer ? range.startOffset : 0;
      const to = node === range.endContainer ? range.endOffset : node.data.length;
      text += node.data.slice(from, to);
    }
    if (!text) return;
    event.clipboardData.setData('text/plain', text);
    event.preventDefault();
  };

  /** COD-11: the block's own events, for its copy button's. */
  private onCopied(event: CustomEvent<TanreiCopyButtonCopiedDetail>) {
    event.stopPropagation();
    this.dispatchEvent(new CustomEvent<TanreiCodeBlockCopiedDetail>('copied', { bubbles: true, detail: { text: event.detail.text } }));
  }

  private onCopyFailed(event: CustomEvent<TanreiCopyButtonCopyFailedDetail>) {
    event.stopPropagation();
    this.dispatchEvent(new CustomEvent<TanreiCodeBlockCopyFailedDetail>('copyfailed', { bubbles: true, detail: { reason: event.detail.reason } }));
  }

  /** COD-7: where style queries are missing, the focus style is read when focus arrives. */
  private onBodyFocus() {
    syncFocusStyle(this, this.body);
  }

  protected override willUpdate(changed: PropertyValues) {
    const drawn = ['code', 'language', 'highlight', 'lineNumbers', 'startLine', 'highlightedLines', 'addedLines', 'removedLines', 'highlightedLabel', 'addedLabel', 'removedLabel', 'prompt'];
    if (this.hasUpdated && drawn.some((name) => changed.has(name))) this.sync();
    // COD-25: no code, no block.
    try {
      if (this.empty) this.internals?.states.add('empty');
      else this.internals?.states.delete('empty');
    } catch {
      // A browser without custom states: the empty block is an empty box.
    }
  }

  protected override updated(changed: PropertyValues) {
    this.watchSizes();
    // COD-25: what is missing is reported; the block still draws.
    if (this.empty) {
      report(this, 'COD-25', 'the code block has no code, so it draws nothing; give it a <pre><code>, or set code');
      return;
    }
    if (this.copy && (changed.has('copy') || changed.has('copyLabel') || changed.has('copiedLabel') || changed.has('copyFailedLabel'))) {
      const missing = [this.words.lacks('copyLabel', this.copyLabel) && 'copyLabel', this.words.lacks('copiedLabel', this.copiedLabel) && 'copiedLabel', this.words.lacks('copyFailedLabel', this.copyFailedLabel) && 'copyFailedLabel'].filter(Boolean);
      if (missing.length) report(this, 'COD-25', `copy is set and ${missing.join(', ')} ${missing.length > 1 ? 'are' : 'is'} empty; the copy button needs its name and its two announcements`);
    }
    if (this.scrollable && !this.headline && !this.label) report(this, 'COD-25', 'the body can scroll and is a focus stop, and both title and label are empty, so it has no accessible name; give the block one');
    if (changed.has('startLine') && this.firstLine !== this.startLine) report(this, 'COD-25', `startLine ${this.startLine} is not a whole number of 1 or more; it is taken as 1`);
    if (changed.has('maxLines') && this.maxLines !== null && this.cap === null) report(this, 'COD-25', `maxLines ${this.maxLines} is below 1; every line is shown`);
  }

  protected override render() {
    // COD-25: nothing is drawn and nothing is exposed.
    if (this.empty) return nothing;
    // COD-8: the header's words are the title and the language label; `language` itself is not drawn.
    const header = !!this.headline || !!this.languageLabel;
    // COD-22: a group named by the title, and by the label where there is none.
    const name = this.headline || this.label;
    const cap = this.cap;
    const capped = cap !== null && this.lineCount > cap;
    // COD-9: a Copy button — icon-only, the text variant, the small size — that copies the code (COD-11).
    const button = this.copy
      ? html`<tanrei-copy-button
          part="copy-button"
          variant="text"
          size="small"
          .text=${this.copyText}
          label=${this.words.get('copyLabel', this.copyLabel)}
          copied-label=${this.words.get('copiedLabel', this.copiedLabel)}
          failed-label=${this.words.get('copyFailedLabel', this.copyFailedLabel)}
          @copied=${this.onCopied}
          @copyfailed=${this.onCopyFailed}
        ></tanrei-copy-button>`
      : nothing;
    return html`
      <div part="container" class="container ${classMap({ copy: this.copy, 'has-header': header, gutter: this.gutter })}" data-tanrei-shape>
        ${header
          ? html`<div part="header" class="header">
              ${this.headline ? html`<span part="title" class="title" dir=${ownDirection(this.headline)}>${this.headline}</span>` : nothing}
              <span class="space"></span>
              ${this.languageLabel ? html`<span part="language" class="language">${this.languageLabel}</span>` : nothing}
              ${button}
            </div>`
          : this.copy
            ? html`<div class="corner">${button}</div>`
            : nothing}
        <div
          part="body"
          class="body ${classMap({ capped })}"
          dir="ltr"
          data-tanrei-shape
          role=${name ? 'group' : nothing}
          aria-label=${name || nothing}
          tabindex=${this.scrollable ? '0' : nothing}
          style=${capped ? `--_max-lines: ${cap}` : nothing}
          @focus=${this.onBodyFocus}
        >
          <slot></slot>
        </div>
        <span class="focus" data-tanrei-shape></span>
      </div>
    `;
  }
}

if (!customElements.get('tanrei-code-block')) customElements.define('tanrei-code-block', TanreiCodeBlock);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-code-block': TanreiCodeBlock;
  }
}
