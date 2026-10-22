// The script side of a state matrix (components/visuals/StateMatrix.astro), run in the browser: an element of the
// figure held in a pointer or focus state it is not in.
//
// A component draws its hovered, focused and pressed states from the browser's own conditions — `:hover`,
// `:focus-visible` and `:focus-within`, and the `data-pressed` its press controller writes on the element it presses —
// which nothing of its public surface can set, and no attribute is added to the component for the docs' sake. So the
// docs restyle them on their side, as a state-forcing addon of a component workshop does: each style rule of the
// element's shadow root that names one of those conditions is copied, with the condition taken out of the selector
// and `[data-docs-state~="<state>"]` on the host put in its place, and the copy stands right after the rule it copies.
// The host carries that attribute only in a figure, so nothing else on the page changes, and the copy weighs exactly
// what its rule weighs: the order in which states win over each other (pressed over focused over hovered, disabled
// over all) is the component's own. A rule that hovers only where the primary pointer hovers (`@media (hover: hover)`)
// is copied outside that condition, so a figure read on a touch screen shows the hovered state too.
//
// A press is drawn the way the system the figure is drawn under answers one (`sys.behavior.pressed-feedback`): the
// pressed tokens on the whole container (`overlay`) or the content's pressed tokens with the control dimmed (`dim`);
// a ripple, which grows from the point of contact and has no still frame, is drawn as the overlay it covers the
// container with; and where a system answers a press with nothing, the pressed cell is the control at rest.
//
// Copies are made once per stylesheet, shared by every element that adopts it, and the original sheets are left as
// they are.

/** The conditions a figure holds, by the state each makes. `weight` is what the condition adds to a selector's specificity, in attribute selectors. */
const CONDITIONS: { state: string; pattern: RegExp; weight: number }[] = [
  { state: 'hovered', pattern: /^:hover(?![\w-])/, weight: 1 },
  { state: 'focused', pattern: /^:focus-visible(?![\w-])/, weight: 1 },
  { state: 'focused', pattern: /^:focus-within(?![\w-])/, weight: 1 },
  // "Pressed, with any feedback but none" (what holds the transitions still as the press begins), then each feedback.
  { state: 'pressed', pattern: /^\[data-pressed\]:not\(\[data-pressed=(['"])none\1\]\)/, weight: 2 },
  { state: 'pressed-overlay', pattern: /^\[data-pressed=(['"])overlay\1\]/, weight: 1 },
  { state: 'pressed-ripple', pattern: /^\[data-pressed=(['"])ripple\1\]/, weight: 1 },
  { state: 'pressed-dim', pattern: /^\[data-pressed=(['"])dim\1\]/, weight: 1 },
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
  weight: number;
  /** Inside the host's own `:host(…)`. */
  inHost: boolean;
}

/**
 * The conditions of one complex selector a figure can hold: those at its top level and those in the host's own
 * `:host(…)`. One inside `:not()`, `:is()`, `:where()` or `:has()` is left alone: taken out, it would change what the
 * rest of the selector means. Null where the selector holds none.
 */
function conditionsOf(selector: string): Found[] {
  const found: Found[] = [];
  let at = 0;
  while (at < selector.length) {
    const rest = selector.slice(at);
    const hostArgument = /^:host\(/.test(rest);
    if (hostArgument) {
      const close = closing(selector, at + ':host'.length);
      if (close < 0) return [];
      for (let inner = at + ':host('.length; inner < close; ) {
        const condition = CONDITIONS.find(({ pattern }) => pattern.test(selector.slice(inner, close)));
        if (condition) {
          const length = condition.pattern.exec(selector.slice(inner, close))![0].length;
          found.push({ start: inner, end: inner + length, state: condition.state, weight: condition.weight, inHost: true });
          inner += length;
        } else if (selector[inner] === '(' || selector[inner] === '[') inner = closing(selector, inner) + 1 || close;
        else inner++;
      }
      at = close + 1;
      continue;
    }
    const condition = CONDITIONS.find(({ pattern }) => pattern.test(rest));
    if (condition) {
      const length = condition.pattern.exec(rest)![0].length;
      found.push({ start: at, end: at + length, state: condition.state, weight: condition.weight, inHost: false });
      at += length;
    } else if (selector[at] === '(' || selector[at] === '[') {
      const close = closing(selector, at);
      if (close < 0) return [];
      at = close + 1;
    } else if (selector[at] === '"' || selector[at] === "'") {
      const close = selector.indexOf(selector[at], at + 1);
      at = close < 0 ? selector.length : close + 1;
    } else at++;
  }
  return found;
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
    // A condition that was a compound of its own (`.list :hover`) leaves the universal selector in its place.
    const alone = !inHost && (before === '' || EDGE.test(before.at(-1)!)) && (after === '' || EDGE.test(after[0]) || after[0] === ')' || after.startsWith('::'));
    text = `${before}${alone ? '*' : ''}${after}`;
  }
  const words = [...new Set(found.map(({ state }) => state))];
  const weight = found.reduce((sum, { weight }) => sum + weight, 0);
  const required = words.map(attribute).join('');
  if (text.startsWith(':host(')) {
    const close = closing(text, ':host'.length);
    return `${text.slice(0, close)}${required}${PAD.repeat(weight - words.length)}${text.slice(close)}`;
  }
  if (/^:host(?![\w-])/.test(text)) return `:host(${required}${PAD.repeat(weight - words.length)})${text.slice(':host'.length)}`;
  // `:host` itself weighs one attribute: what it requires is said in `:where()`, which weighs nothing.
  return `:host(:where(${required})${PAD.repeat(weight - 1)}) ${text}`;
}

/** A selector list, held: the held form of each selector that names a condition; null where none does. */
export function holdSelectorList(list: string): string | null {
  const held = splitTop(list, ',')
    .map(holdSelector)
    .filter((selector): selector is string => selector !== null);
  return held.length ? held.join(', ') : null;
}

/** A style rule's copy for a figure, or nothing. */
function copyOf(rule: CSSStyleRule): string {
  const selector = holdSelectorList(rule.selectorText);
  if (!selector) return '';
  // The declarations as the rule writes them, nested rules included: everything after its own selector.
  return `${selector} ${rule.cssText.slice(rule.cssText.indexOf('{', rule.selectorText.length))}\n`;
}

const isStyle = (rule: CSSRule): rule is CSSStyleRule => 'selectorText' in rule && 'style' in rule;
const isGroup = (rule: CSSRule): rule is CSSGroupingRule => 'cssRules' in rule && !isStyle(rule);
/** A rule that holds only where the primary pointer hovers: its copies stand outside it. */
const hoverOnly = (rule: CSSRule) => 'media' in rule && /^\(\s*hover\s*:\s*hover\s*\)$/.test((rule as CSSMediaRule).media.mediaText.trim());

/** A list of rules as text, each style rule followed by its copy. */
function written(rules: CSSRuleList): string {
  let text = '';
  for (const rule of rules) {
    if (isStyle(rule)) text += `${rule.cssText}\n${copyOf(rule)}`;
    else if (isGroup(rule) && hoverOnly(rule)) text += `${rule.cssText}\n${[...rule.cssRules].map((inner) => (isStyle(inner) ? copyOf(inner) : '')).join('')}`;
    else if (isGroup(rule)) text += `${rule.cssText.slice(0, rule.cssText.indexOf('{'))}{\n${written(rule.cssRules)}}\n`;
    else text += `${rule.cssText}\n`;
  }
  return text;
}

/**
 * A figure is still: an element it holds in a state is drawn in that state at once, without the transition a state
 * change takes in a product.
 */
const STILL = `:host([${STATE_ATTRIBUTE}]), :host([${STATE_ATTRIBUTE}]) *, :host([${STATE_ATTRIBUTE}]) ::before, :host([${STATE_ATTRIBUTE}]) ::after { transition: none !important; }\n`;

const copies = new WeakMap<CSSStyleSheet, CSSStyleSheet>();
const made = new WeakSet<CSSStyleSheet>();

/** A stylesheet with every rule a figure can hold copied after it; made once per sheet. */
export function heldSheet(sheet: CSSStyleSheet): CSSStyleSheet {
  if (made.has(sheet)) return sheet;
  let copy = copies.get(sheet);
  if (!copy) {
    copy = new CSSStyleSheet();
    copy.replaceSync(written(sheet.cssRules) + STILL);
    copies.set(sheet, copy);
    made.add(copy);
  }
  return copy;
}

/**
 * Holds an element in the states given (`hovered`, `focused`, `pressed` and the feedback's word; none for one at
 * rest): its shadow root's sheets are replaced by their copies (once; a sheet the element adopts later is copied when
 * it is held again) and the host carries the words.
 */
export function hold(element: HTMLElement, words: string[]): void {
  const root = element.shadowRoot;
  if (root) root.adoptedStyleSheets = root.adoptedStyleSheets.map(heldSheet);
  element.setAttribute(STATE_ATTRIBUTE, words.join(' '));
}
