// The script side of a state matrix (components/visuals/StateMatrix.astro), run in the browser: an element of the
// figure held in a pointer or focus state it is not in.
//
// A component draws its hovered, focused and pressed states from the browser's own conditions — `:hover`,
// `:focus-visible` and `:focus-within`, the `data-pressed` its press controller writes on the element it presses, and
// the `data-hovered` a hover controller writes on the part a press would move (the slider's handle) —
// which nothing of its public surface can set, and no attribute is added to the component for the docs' sake. So the
// docs restyle them on their side, as a state-forcing addon of a component workshop does: each style rule of the
// element's shadow root that names one of those conditions is copied, with the condition taken out of the selector
// and `[data-docs-state~="<state>"]` on the host put in its place, and the copy stands right after the rule it copies.
// A condition in an `:is()`, `:where()` or `:has()` is taken out of it too (`.knob:where(:has(> .handle:focus-visible))`
// is how the slider draws a focused handle); one in `:not()` is left alone, since taking it out would turn the rule's
// meaning around. The host carries that attribute only in a figure, so nothing else on the page changes, and the copy
// weighs exactly what its rule weighs: the order in which states win over each other (pressed over focused over
// hovered, disabled over all) is the component's own. A rule that hovers only where the primary pointer hovers (`@media (hover: hover)`)
// is copied outside that condition, so a figure read on a touch screen shows the hovered state too.
//
// A press is drawn the way the system the figure is drawn under answers one (`sys.behavior.pressed-feedback`): the
// pressed tokens on the whole container (`overlay`) or the content's pressed tokens with the control dimmed (`dim`);
// a ripple, which grows from the point of contact and has no still frame, is drawn as the overlay it covers the
// container with; and where a system answers a press with nothing, the pressed cell is the control at rest.
//
// Copies are made once per stylesheet, shared by every element that adopts it, and the original sheets are left as
// they are.

/** The conditions a figure holds, by the state each makes. */
const CONDITIONS: { state: string; pattern: RegExp }[] = [
  { state: 'hovered', pattern: /^:hover(?![\w-])/ },
  // What a hover controller writes where the hover is the part a press would move, not the box under the pointer (the
  // slider's handle, the rating's item).
  { state: 'hovered', pattern: /^\[data-hovered\]/ },
  { state: 'focused', pattern: /^:focus-visible(?![\w-])/ },
  { state: 'focused', pattern: /^:focus-within(?![\w-])/ },
  // "Pressed, with any feedback but none" (what holds the transitions still as the press begins), then each feedback.
  { state: 'pressed', pattern: /^\[data-pressed\]:not\(\[data-pressed=(['"])none\1\]\)/ },
  { state: 'pressed-overlay', pattern: /^\[data-pressed=(['"])overlay\1\]/ },
  { state: 'pressed-ripple', pattern: /^\[data-pressed=(['"])ripple\1\]/ },
  { state: 'pressed-dim', pattern: /^\[data-pressed=(['"])dim\1\]/ },
];

/** The attribute a figure sets on an element to hold it in states: a list of words, as `class` is. */
export const STATE_ATTRIBUTE = 'data-docs-state';

/** What a figure's cell sets for a state it shows: the words of `STATE_ATTRIBUTE`, given the press feedback the system names. */
export function wordsOf(state: string, feedback: string): string[] {
  if (state !== 'pressed') return state === 'hovered' || state === 'focused' ? [state] : [];
  // A ripple has no still frame: the overlay it ends as stands for it.
  const shown = feedback === 'ripple' ? 'overlay' : feedback;
  return shown === 'overlay' || shown === 'dim' ? ['pressed', `pressed-${shown}`] : [];
}

/** Splits a list at the top level by `separator`, minding parentheses, brackets and quotes. */
function splitTop(text: string, separator: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let start = 0;
  for (let at = 0; at < text.length; at++) {
    const char = text[at];
    if (quote) {
      if (char === '\\') at++;
      else if (char === quote) quote = null;
    } else if (char === '"' || char === "'") quote = char;
    else if (char === '(' || char === '[') depth++;
    else if (char === ')' || char === ']') depth--;
    else if (char === separator && depth === 0) {
      parts.push(text.slice(start, at));
      start = at + 1;
    }
  }
  parts.push(text.slice(start));
  return parts;
}

/** The index of the bracket that closes the one opened at `open`. */
function closing(text: string, open: number): number {
  let depth = 0;
  let quote: string | null = null;
  for (let at = open; at < text.length; at++) {
    const char = text[at];
    if (quote) {
      if (char === '\\') at++;
      else if (char === quote) quote = null;
    } else if (char === '"' || char === "'") quote = char;
    else if (char === '(' || char === '[') depth++;
    else if (char === ')' || char === ']') {
      depth--;
      if (depth === 0) return at;
    }
  }
  return -1;
}

interface Found {
  start: number;
  end: number;
  state: string;
  /** Inside the host's own `:host(…)`. */
  inHost: boolean;
}

/** The pseudo-classes whose argument a condition may be taken out of: each is true where one of its selectors is. */
const INTO = /^:(?:is|where|has)\(/;

/**
 * The conditions of `selector` from `from` to `to` a figure can hold, added to `found`: those at its top level, those
 * in the host's own `:host(…)`, and those in an `:is()`, `:where()` or `:has()` (`:has(> .handle:focus-visible)`: the
 * element has a focused handle, which a focused slider has). One inside `:not()` is left alone: taken out, it would
 * turn what the rest of the selector means around. False where a bracket is not closed.
 */
function scan(selector: string, from: number, to: number, found: Found[]): boolean {
  let at = from;
  while (at < to) {
    const rest = selector.slice(at, to);
    if (/^:host\(/.test(rest)) {
      const close = closing(selector, at + ':host'.length);
      if (close < 0) return false;
      for (let inner = at + ':host('.length; inner < close; ) {
        const condition = CONDITIONS.find(({ pattern }) => pattern.test(selector.slice(inner, close)));
        const into = INTO.exec(selector.slice(inner, close));
        if (into) {
          // `:host(:is(:focus-visible, [data-tanrei-focus]))`: what the argument's own argument holds.
          const end = closing(selector, inner + into[0].length - 1);
          if (end < 0 || !scan(selector, inner + into[0].length, end, found)) return false;
          inner = end + 1;
        } else if (condition) {
          const length = condition.pattern.exec(selector.slice(inner, close))![0].length;
          found.push({ start: inner, end: inner + length, state: condition.state, inHost: true });
          inner += length;
        } else if (selector[inner] === '(' || selector[inner] === '[') inner = closing(selector, inner) + 1 || close;
        else inner++;
      }
      at = close + 1;
      continue;
    }
    const into = INTO.exec(rest);
    if (into) {
      const close = closing(selector, at + into[0].length - 1);
      if (close < 0 || !scan(selector, at + into[0].length, close, found)) return false;
      at = close + 1;
      continue;
    }
    const condition = CONDITIONS.find(({ pattern }) => pattern.test(rest));
    if (condition) {
      const length = condition.pattern.exec(rest)![0].length;
      found.push({ start: at, end: at + length, state: condition.state, inHost: false });
      at += length;
    } else if (selector[at] === '(' || selector[at] === '[') {
      const close = closing(selector, at);
      if (close < 0) return false;
      at = close + 1;
    } else if (selector[at] === '"' || selector[at] === "'") {
      const close = selector.indexOf(selector[at], at + 1);
      at = close < 0 ? to : close + 1;
    } else at++;
  }
  return true;
}

/** The conditions of one complex selector a figure can hold, in the order they are written; none where it holds none. */
function conditionsOf(selector: string): Found[] {
  const found: Found[] = [];
  return scan(selector, 0, selector.length, found) ? found.sort((a, b) => a.start - b.start) : [];
}

/** A selector's specificity: its ids, its classes, attributes and pseudo-classes, its types and pseudo-elements. */
type Specificity = [number, number, number];
const heavier = (a: Specificity, b: Specificity) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
/** The specificity of the most specific selector of a list (what `:is()`, `:not()` and `:has()` weigh). */
const weightOfList = (list: string): Specificity =>
  splitTop(list, ',')
    .filter((each) => each.trim())
    .map((each) => weightOf(each))
    .reduce((best, each) => (heavier(each, best) > 0 ? each : best), [0, 0, 0] as Specificity);
const IDENT = /^-?(?:[\w-]|\\.)+/;
/** The pseudo-elements CSS 2 wrote with one colon. */
const LEGACY_ELEMENTS = /^:(?:before|after|first-line|first-letter)(?![\w-])/;

/** The specificity of one complex selector (Selectors 4, §17), as the browser counts it. */
function weightOf(selector: string): Specificity {
  const weight: Specificity = [0, 0, 0];
  const add = ([a, b, c]: Specificity) => {
    weight[0] += a;
    weight[1] += b;
    weight[2] += c;
  };
  for (let at = 0; at < selector.length; ) {
    const char = selector[at];
    const rest = selector.slice(at);
    if (char === '#') {
      add([1, 0, 0]);
      at += 1 + (IDENT.exec(rest.slice(1))?.[0].length ?? 0);
    } else if (char === '.') {
      add([0, 1, 0]);
      at += 1 + (IDENT.exec(rest.slice(1))?.[0].length ?? 0);
    } else if (char === '[') {
      add([0, 1, 0]);
      at = closing(selector, at) + 1 || selector.length;
    } else if (rest.startsWith('::')) {
      const name = IDENT.exec(rest.slice(2))?.[0] ?? '';
      add([0, 0, 1]);
      at += 2 + name.length;
      if (selector[at] === '(') {
        const close = closing(selector, at);
        // `::slotted(x)` weighs what its argument weighs besides; `::part()` and the others do not.
        if (name === 'slotted') add(weightOfList(selector.slice(at + 1, close)));
        at = close + 1 || selector.length;
      }
    } else if (LEGACY_ELEMENTS.test(rest)) {
      add([0, 0, 1]);
      at += LEGACY_ELEMENTS.exec(rest)![0].length;
    } else if (char === ':') {
      const name = IDENT.exec(rest.slice(1))?.[0] ?? '';
      at += 1 + name.length;
      const argument = selector[at] === '(' ? selector.slice(at + 1, closing(selector, at)) : null;
      if (argument !== null) at = closing(selector, at) + 1 || selector.length;
      if (name === 'where') continue;
      if (name === 'is' || name === 'not' || name === 'has' || name === 'matches') add(weightOfList(argument ?? ''));
      else {
        add([0, 1, 0]);
        // `:host(x)` and `:host-context(x)` weigh one pseudo-class and their argument.
        if ((name === 'host' || name === 'host-context') && argument !== null) add(weightOfList(argument));
      }
    } else if (char === '*' || char === '&' || char === '|' || /[\s>+~,]/.test(char)) at++;
    else if (char === '"' || char === "'") {
      const close = selector.indexOf(char, at + 1);
      at = close < 0 ? selector.length : close + 1;
    } else {
      const type = IDENT.exec(rest)?.[0];
      if (type) {
        add([0, 0, 1]);
        at += type.length;
      } else at++;
    }
  }
  return weight;
}

const attribute = (word: string) => `[${STATE_ATTRIBUTE}~="${word}"]`;
const PAD = `[${STATE_ATTRIBUTE}]`;
/** Where a compound selector begins or ends: a combinator, white space, a list's or an argument's edge. */
const EDGE = /[\s>+~(,]/;

/**
 * One complex selector, held: each condition a figure can hold taken out, and the host required to carry the state it
 * made, at the same specificity. Null where it names no such condition, or where its host cannot be written to (a
 * selector that starts with `:host-context()`).
 */
export function holdSelector(selector: string): string | null {
  const trimmed = selector.trim();
  const found = conditionsOf(trimmed);
  if (!found.length || trimmed.startsWith(':host-context')) return null;
  let text = trimmed;
  for (const { start, end, inHost } of [...found].reverse()) {
    const before = text.slice(0, start);
    const after = text.slice(end);
    // A condition that was a compound of its own (`.list :hover`, `:where(:hover, .x)`) leaves the universal selector in its place.
    const alone = !inHost && (before === '' || EDGE.test(before.at(-1)!)) && (after === '' || EDGE.test(after[0]) || after[0] === ')' || after.startsWith('::'));
    text = `${before}${alone ? '*' : ''}${after}`;
  }
  const words = [...new Set(found.map(({ state }) => state))];
  // What the conditions weighed, in attribute selectors: nothing for one in `:where()`, and for one in `:is()` or
  // `:has()` what the argument lost by it (nothing where another selector of the list weighs as much).
  const before = weightOf(trimmed);
  const held = weightOf(text);
  // Where taking a condition out of an argument changed which of its selectors weighs most, and so its ids or types, no
  // attribute makes up for it: such a rule is not held (no component writes one today).
  if (before[0] !== held[0] || before[2] !== held[2]) return null;
  const weight = before[1] - held[1];
  const required = words.map(attribute).join('');
  // Inside the host's argument: the words, and the attributes still owed; in `:where()` where they would weigh more.
  const inArgument = weight >= words.length ? `${required}${PAD.repeat(weight - words.length)}` : `:where(${required})${PAD.repeat(weight)}`;
  if (text.startsWith(':host(')) {
    const close = closing(text, ':host'.length);
    return `${text.slice(0, close)}${inArgument}${text.slice(close)}`;
  }
  if (/^:host(?![\w-])/.test(text)) return `:host(${inArgument})${text.slice(':host'.length)}`;
  // `:host` itself weighs one attribute: what it requires is said in `:where()`, which weighs nothing; where the
  // conditions weighed nothing, the host is required in `:where()` too.
  if (weight === 0) return `:where(:host(${required})) ${text}`;
  return `:host(:where(${required})${PAD.repeat(weight - 1)}) ${text}`;
}

/** A selector list, held: the held form of each selector that names a condition; null where none does. */
export function holdSelectorList(list: string): string | null {
  const held = splitTop(list, ',')
    .map(holdSelector)
    .filter((selector): selector is string => selector !== null);
  return held.length ? held.join(', ') : null;
}

// ── Writing the copies ────────────────────────────────────────────────────────────────────────────────────────────────
//
// The copies are written from the text a sheet was made from, never from the browser's serialization of its rules:
// `cssText` does not give back what was written. A shorthand whose value has `var()` in it, which a later longhand of
// the same rule overrides (the `font` every role's text is set with, then `font-variant-numeric`; the slider handle's
// `background: var(--_h)`, then `background-clip`), is serialized as its longhands with empty values, which a sheet
// made from that text drops: the copy drew a drawer item's trailing text in the page's 16px and the slider's handle
// without its fill. `all` comes back as every longhand it sets, and the custom properties beside it with other values.
// So a sheet is copied by its text: every rule as it was written, each one a figure can hold followed by its copy,
// whose block is the rule's own, character for character.

/** The index after the comment, string or escape that starts at `at`; `at` itself where none starts there. */
function skipped(text: string, at: number): number {
  const char = text[at];
  if (char === '\\') return at + 2;
  if (char === '/' && text[at + 1] === '*') {
    const end = text.indexOf('*/', at + 2);
    return end < 0 ? text.length : end + 2;
  }
  if (char === '"' || char === "'") {
    for (let next = at + 1; next < text.length; next++) {
      if (text[next] === '\\') next++;
      else if (text[next] === char) return next + 1;
      // A string that meets the end of its line ends there (a bad string, CSS Syntax 3).
      else if (text[next] === '\n') return next;
    }
    return text.length;
  }
  return at;
}

/** The index after the brace that closes the block opened at `open` (the text's end where nothing closes it). */
function blockEnd(text: string, open: number): number {
  let depth = 0;
  for (let at = open; at < text.length; ) {
    const past = skipped(text, at);
    if (past !== at) {
      at = past;
      continue;
    }
    if (text[at] === '{') depth++;
    else if (text[at] === '}' && --depth === 0) return at + 1;
    at++;
  }
  return text.length;
}

/** What a rule's block holds, without its braces. */
const insideOf = (block: string) => block.slice(1, block.endsWith('}') ? -1 : undefined);

/** A rule as written: its prelude, the white space and comments before it included, and its block, braces included (null for a statement, `@layer a, b;`, or what ends the list). */
interface Written {
  prelude: string;
  block: string | null;
}

/** A list of rules as written: joined, the parts give back the text exactly. */
function rulesOf(text: string): Written[] {
  const rules: Written[] = [];
  let start = 0;
  let depth = 0;
  for (let at = 0; at < text.length; ) {
    const past = skipped(text, at);
    if (past !== at) {
      at = past;
      continue;
    }
    const char = text[at];
    if (char === '(' || char === '[') depth++;
    else if (char === ')' || char === ']') depth = Math.max(0, depth - 1);
    else if (char === ';' && depth === 0) {
      rules.push({ prelude: text.slice(start, at + 1), block: null });
      start = at + 1;
    } else if (char === '{') {
      const end = blockEnd(text, at);
      rules.push({ prelude: text.slice(start, at), block: text.slice(at, end) });
      start = at = end;
      depth = 0;
      continue;
    }
    at++;
  }
  if (start < text.length) rules.push({ prelude: text.slice(start), block: null });
  return rules;
}

/** A prelude without its comments and the white space around it: a selector list, or an at-rule's name and condition. */
function bare(prelude: string): string {
  let text = '';
  for (let at = 0; at < prelude.length; ) {
    const past = skipped(prelude, at);
    if (prelude.startsWith('/*', at)) text += ' ';
    else text += prelude.slice(at, Math.max(past, at + 1));
    at = Math.max(past, at + 1);
  }
  return text.trim();
}

/** An at-rule whose block is a list of rules, each of which may be held. */
const GROUP = /^@(?:media|supports|container|layer|scope|starting-style|document)(?![\w-])/i;
/** A rule that holds only where the primary pointer hovers: its copies stand outside it. */
const HOVER_ONLY = /^@media\s*\(\s*hover\s*:\s*hover\s*\)$/i;

/** A style rule's copy for a figure (its block as written, after the held selector), or nothing. */
function copyOf(selector: string, block: string): string {
  const held = holdSelectorList(selector);
  return held ? `\n${held} ${block}` : '';
}

/**
 * A sheet's text with every rule a figure can hold copied right after it: the text itself, character for character,
 * with only the copies put in. A rule in a grouping rule (`@media`, `@supports`, `@container`, `@layer` …) is copied
 * inside it; one in `@media (hover: hover)`, after it.
 */
export function heldText(text: string): string {
  return rulesOf(text)
    .map(({ prelude, block }) => {
      if (block === null) return prelude;
      const name = bare(prelude);
      if (!name.startsWith('@')) return `${prelude}${block}${copyOf(name, block)}`;
      if (HOVER_ONLY.test(name)) {
        const copies = rulesOf(insideOf(block)).map((inner) => (inner.block !== null && !bare(inner.prelude).startsWith('@') ? copyOf(bare(inner.prelude), inner.block) : ''));
        return `${prelude}${block}${copies.join('')}`;
      }
      if (GROUP.test(name)) return `${prelude}{${heldText(insideOf(block))}${block.endsWith('}') ? '}' : ''}`;
      return `${prelude}${block}`;
    })
    .join('');
}

/** Whether a list of rules names a condition a figure can hold: read from the sheet, only to say what is not copied. */
const holdable = (rules: CSSRuleList): boolean =>
  [...rules].some((rule) => ('selectorText' in rule && holdSelectorList((rule as CSSStyleRule).selectorText) !== null) || ('cssRules' in rule && holdable((rule as CSSGroupingRule).cssRules)));

/**
 * A figure is still: an element it holds in a state is drawn in that state at once, without the transition a state
 * change takes in a product.
 */
const STILL = `\n:host([${STATE_ATTRIBUTE}]), :host([${STATE_ATTRIBUTE}]) *, :host([${STATE_ATTRIBUTE}]) ::before, :host([${STATE_ATTRIBUTE}]) ::after { transition: none !important; }\n`;

/** The text each sheet was made from: the style an element declares (Lit's `elementStyles`, each a `CSSResult` that keeps its text and makes its sheet). */
const texts = new WeakMap<CSSStyleSheet, string>();
const copies = new WeakMap<CSSStyleSheet, CSSStyleSheet>();
const made = new WeakSet<CSSStyleSheet>();

/** Learns the text of each sheet an element's class declares. */
function learn(element: HTMLElement): void {
  const styles = (element.constructor as { elementStyles?: unknown[] }).elementStyles ?? [];
  for (const style of styles) {
    if (typeof style !== 'object' || style === null || !('cssText' in style) || !('styleSheet' in style)) continue;
    const sheet = (style as { styleSheet?: CSSStyleSheet }).styleSheet;
    if (sheet) texts.set(sheet, String((style as { cssText: unknown }).cssText));
  }
}

/**
 * A stylesheet with every rule a figure can hold copied after it, made once per sheet from the text it was made from.
 * A sheet with no rule to hold is its own copy. One an element made at run time, whose text is not kept, is left as it
 * is, and said so: no element adopts one that names a condition today.
 */
export function heldSheet(sheet: CSSStyleSheet): CSSStyleSheet {
  if (made.has(sheet)) return sheet;
  let copy = copies.get(sheet);
  if (!copy) {
    const text = texts.get(sheet);
    if (text === undefined || !holdable(sheet.cssRules)) {
      if (text === undefined && holdable(sheet.cssRules)) console.error('A figure cannot hold the states of a stylesheet whose text it does not have: its rules are drawn at rest.', sheet);
      copy = sheet;
    } else {
      copy = new CSSStyleSheet();
      copy.replaceSync(heldText(text) + STILL);
    }
    copies.set(sheet, copy);
    made.add(copy);
  }
  return copy;
}

/**
 * Holds an element in the states given (`hovered`, `focused`, `pressed` and the feedback's word; none for one at
 * rest): its shadow root's sheets are replaced by their copies (once; a sheet the element adopts later is copied when
 * it is held again) and the host carries the words. A copy draws exactly what its sheet draws while the host carries
 * no word, so an element let go keeps its copies.
 */
export function hold(element: HTMLElement, words: string[]): void {
  const root = element.shadowRoot;
  if (root) {
    learn(element);
    root.adoptedStyleSheets = root.adoptedStyleSheets.map(heldSheet);
  }
  element.setAttribute(STATE_ATTRIBUTE, words.join(' '));
}
