// Which stages of the fixtures' gallery stand for an area of a window, read from the component's staging when the site
// is built (lib/fixture-gallery.ts). Nothing here runs in a browser.
//
// A stage that the staging gives both of its lengths in pixels (a popover's 480 × 480 around its anchor, a docked
// picker's 480 × 720, a side sheet's page 720 × 480) is drawn as a window is: laid out at that width and scaled down to
// its row (lib/fixture-stages.ts, `fitStage`). Read here, before anything is drawn, its canvas holds the scaled room
// from the page's first layout (components/fixtures/FixtureGallery.astro): as wide as the stage and never wider than
// the column, as tall as that width keeps its proportions. Read in the browser once the stage is drawn, the canvas
// held the stage's unscaled height until then, and shrank to the scaled one in the reader's view.
//
// The staging is read as the browser reads it, for what this needs: the rule in effect for the stage's width is the
// last of the staging's rules that matches it and gives a width in pixels (as `laidOutBy` in lib/fixture-stages.ts
// takes it), and its box — `box-sizing`, padding, border — is cascaded by specificity, then order. A selector is read in
// the forms the stagings write (compound selectors of a type, classes, attributes, `:is()`, `:where()`, `:not()`,
// `:has()`, joined by a descendant or a child combinator); a rule of another form that bears on a stage stops the
// build, so that a new form is read and not guessed.
import { ELEMENT_NODE, parse, type Node } from 'ultrahtml';
import { LEAST } from './stage-least';

/** The lengths of a stage that stands for an area of a window, its padding and border included, in CSS pixels. */
export interface Area {
  /** The width it is laid out at: the staging's, and never less than a stage is laid out at (`LEAST`). */
  width: number;
  height: number;
}

interface Element {
  name: string;
  attributes: Record<string, string>;
  parent?: Element;
  children: Element[];
}

type Combinator = ' ' | '>';
/** A compound selector: every test holds for an element it matches. */
interface Compound {
  tests: ((element: Element) => boolean)[];
  specificity: Specificity;
}
/** A complex selector, read left to right: each compound with the combinator that joins it to the one before (to the anchor of `:has()`, for the first). */
type Complex = { combinator: Combinator; compound: Compound }[];
type Specificity = [number, number, number];

const add = (a: Specificity, b: Specificity): Specificity => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const compare = (a: Specificity, b: Specificity) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
const most = (list: Complex[]): Specificity => list.map(specificityOf).reduce((a, b) => (compare(a, b) >= 0 ? a : b), [0, 0, 0]);
const specificityOf = (complex: Complex): Specificity => complex.reduce<Specificity>((sum, { compound }) => add(sum, compound.specificity), [0, 0, 0]);

/** Splits at the commas that are not inside parentheses, brackets or quotes. */
function topLevel(text: string, by: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote = '';
  let from = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quote) {
      if (char === quote) quote = '';
    } else if (char === '"' || char === "'") quote = char;
    else if (char === '(' || char === '[') depth++;
    else if (char === ')' || char === ']') depth--;
    else if (char === by && depth === 0) {
      parts.push(text.slice(from, i));
      from = i + 1;
    }
  }
  parts.push(text.slice(from));
  return parts.map((part) => part.trim()).filter(Boolean);
}

/** The text inside the parentheses that open at `from`, and the index after the one that closes them. */
function inParentheses(text: string, from: number): [string, number] {
  let depth = 0;
  let quote = '';
  for (let i = from; i < text.length; i++) {
    const char = text[i];
    if (quote) {
      if (char === quote) quote = '';
    } else if (char === '"' || char === "'") quote = char;
    else if (char === '(') depth++;
    else if (char === ')' && --depth === 0) return [text.slice(from + 1, i), i + 1];
  }
  throw new Error(`unbalanced parentheses in ${text}`);
}

const IDENT = /^-?[_a-zA-Z][\w-]*/;
const ATTRIBUTE = /^\[\s*([\w-]+)\s*(?:([~^$*|]?=)\s*(?:'([^']*)'|"([^"]*)"|([^\]\s]+))\s*(i)?\s*)?\]/;

function attributeTest(name: string, operator: string | undefined, wanted: string, folded: boolean): (element: Element) => boolean {
  return (element) => {
    if (!(name in element.attributes)) return false;
    if (!operator) return true;
    const value = folded ? element.attributes[name].toLowerCase() : element.attributes[name];
    const sought = folded ? wanted.toLowerCase() : wanted;
    switch (operator) {
      case '=':
        return value === sought;
      case '^=':
        return sought !== '' && value.startsWith(sought);
      case '$=':
        return sought !== '' && value.endsWith(sought);
      case '*=':
        return sought !== '' && value.includes(sought);
      case '~=':
        return value.split(/\s+/).includes(sought);
      default:
        return value === sought || value.startsWith(`${sought}-`);
    }
  };
}

function compoundAt(text: string, from: number): [Compound, number] {
  const tests: Compound['tests'] = [];
  let specificity: Specificity = [0, 0, 0];
  let i = from;
  const rest = () => text.slice(i);
  if (text[i] === '*') i++;
  else {
    const type = IDENT.exec(rest());
    if (type) {
      const name = type[0].toLowerCase();
      tests.push((element) => element.name === name);
      specificity = add(specificity, [0, 0, 1]);
      i += type[0].length;
    }
  }
  for (;;) {
    const char = text[i];
    if (char === '.' || char === '#') {
      const name = IDENT.exec(text.slice(i + 1));
      if (!name) throw new Error(`a selector this script does not read: ${text}`);
      const value = name[0];
      tests.push(char === '.' ? (element) => (element.attributes.class ?? '').split(/\s+/).includes(value) : (element) => element.attributes.id === value);
      specificity = add(specificity, char === '.' ? [0, 1, 0] : [1, 0, 0]);
      i += 1 + value.length;
    } else if (char === '[') {
      const found = ATTRIBUTE.exec(rest());
      if (!found) throw new Error(`a selector this script does not read: ${text}`);
      tests.push(attributeTest(found[1].toLowerCase(), found[2], found[3] ?? found[4] ?? found[5] ?? '', found[6] === 'i'));
      specificity = add(specificity, [0, 1, 0]);
      i += found[0].length;
    } else if (char === ':' && text[i + 1] === ':') {
      // A pseudo-element is no element of the stage: the browser's `matches()` matches none.
      tests.push(() => false);
      i = text.length;
    } else if (char === ':') {
      const name = IDENT.exec(text.slice(i + 1))?.[0].toLowerCase();
      if (!name || text[i + 1 + name.length] !== '(' || !['is', 'where', 'not', 'has'].includes(name)) throw new Error(`a selector this script does not read: ${text}`);
      const [inside, after] = inParentheses(text, i + 1 + name.length);
      const list = topLevel(inside, ',').map((each) => complexOf(each, name === 'has'));
      if (name === 'has') tests.push((element) => descendants(element).some((each) => list.some((complex) => matchesComplex(each, complex, complex.length - 1, element))));
      else if (name === 'not') tests.push((element) => !list.some((complex) => matchesComplex(element, complex, complex.length - 1)));
      else tests.push((element) => list.some((complex) => matchesComplex(element, complex, complex.length - 1)));
      if (name !== 'where') specificity = add(specificity, most(list));
      i = after;
    } else break;
  }
  if (i === from) throw new Error(`a selector this script does not read: ${text}`);
  return [{ tests, specificity }, i];
}

/** A complex selector; `relative` for the argument of `:has()`, whose first compound may follow a combinator. */
function complexOf(text: string, relative = false): Complex {
  const parts: Complex = [];
  let i = 0;
  for (;;) {
    let spaced = false;
    while (/\s/.test(text[i] ?? '')) {
      i++;
      spaced = true;
    }
    if (i >= text.length) break;
    let combinator: Combinator = ' ';
    if (text[i] === '>') {
      combinator = '>';
      i++;
      while (/\s/.test(text[i] ?? '')) i++;
    } else if (text[i] === '+' || text[i] === '~') throw new Error(`a selector this script does not read: ${text}`);
    else if (parts.length && !spaced) throw new Error(`a selector this script does not read: ${text}`);
    if (!parts.length && combinator === '>' && !relative) throw new Error(`a selector this script does not read: ${text}`);
    const [compound, after] = compoundAt(text, i);
    parts.push({ combinator, compound });
    i = after;
  }
  if (!parts.length) throw new Error(`an empty selector in the staging: ${text}`);
  return parts;
}

const descendants = (element: Element): Element[] => element.children.flatMap((child) => [child, ...descendants(child)]);

/**
 * Whether `element` matches the complex selector up to its compound `index`, read right to left. Under `:has()`, the
 * first compound stands below `anchor` as its combinator says, and nothing above the anchor is looked at.
 */
function matchesComplex(element: Element, complex: Complex, index: number, anchor?: Element): boolean {
  const { combinator, compound } = complex[index];
  if (!compound.tests.every((test) => test(element))) return false;
  if (index === 0) {
    if (!anchor) return true;
    if (combinator === '>') return element.parent === anchor;
    for (let above = element.parent; above; above = above.parent) if (above === anchor) return true;
    return false;
  }
  if (combinator === '>') return !!element.parent && element.parent !== anchor && matchesComplex(element.parent, complex, index - 1, anchor);
  for (let above = element.parent; above && above !== anchor; above = above.parent) if (matchesComplex(above, complex, index - 1, anchor)) return true;
  return false;
}

interface Rule {
  selectors: string[];
  declarations: Map<string, string>;
  order: number;
}

/** The staging's style rules in order, those inside a group rule (`@media`, `@container`) included, as `laidOutBy` walks them. */
function rulesOf(staging: string): Rule[] {
  const rules: Rule[] = [];
  for (const [, prelude, body] of staging.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = prelude.trim();
    if (!selector || selector.startsWith('@')) continue;
    const declarations = new Map<string, string>();
    for (const declaration of topLevel(body, ';')) {
      const colon = declaration.indexOf(':');
      if (colon < 0) continue;
      declarations.set(declaration.slice(0, colon).trim().toLowerCase(), declaration.slice(colon + 1).replace(/!important\s*$/, '').trim());
    }
    rules.push({ selectors: topLevel(selector, ','), declarations, order: rules.length });
  }
  return rules;
}

const parsed = new Map<string, Complex>();
const complexIn = (selector: string): Complex => {
  let complex = parsed.get(selector);
  if (!complex) parsed.set(selector, (complex = complexOf(selector)));
  return complex;
};

/** The specificity of the most specific of a rule's selectors that matches the element; nothing where none does. */
function matched(rule: Rule, element: Element): Specificity | undefined {
  let found: Specificity | undefined;
  for (const selector of rule.selectors) {
    const complex = complexIn(selector);
    if (!matchesComplex(element, complex, complex.length - 1)) continue;
    const specificity = specificityOf(complex);
    if (!found || compare(specificity, found) > 0) found = specificity;
  }
  return found;
}

const PIXELS = /^[\d.]+px$/;
const widthOf = (rule: Rule) => rule.declarations.get('inline-size') || rule.declarations.get('width') || '';
const heightOf = (rule: Rule) => rule.declarations.get('block-size') || rule.declarations.get('height') || '';

/** A length of the stage's box in pixels: `0`, or pixels; anything else stops the build, so that it is read and not guessed. */
function pixels(value: string, what: string): number {
  if (value === '0') return 0;
  if (PIXELS.test(value)) return parseFloat(value);
  throw new Error(`the staging gives a stage that stands for an area ${what}: ${value}, which this script does not read`);
}

type Side = 'top' | 'right' | 'bottom' | 'left';
/** The sides each property of the box sets, in a horizontal writing mode (the start of a line is its left or right: their sum is what is read). */
const SIDES: Record<string, Side[]> = {
  '': ['top', 'right', 'bottom', 'left'],
  '-inline': ['left', 'right'],
  '-block': ['top', 'bottom'],
  '-top': ['top'],
  '-right': ['right'],
  '-bottom': ['bottom'],
  '-left': ['left'],
  '-inline-start': ['left'],
  '-inline-end': ['right'],
  '-block-start': ['top'],
  '-block-end': ['bottom'],
};

/** The values a shorthand of one to four lengths gives each side it sets. */
function spread(sides: Side[], values: string[]): [Side, string][] {
  if (sides.length === 4) {
    const [top, right = top, bottom = top, left = right] = values;
    return [
      ['top', top],
      ['right', right],
      ['bottom', bottom],
      ['left', left],
    ];
  }
  if (sides.length === 2) return [
    [sides[0], values[0]],
    [sides[1], values[1] ?? values[0]],
  ];
  return [[sides[0], values[0]]];
}

/** The width a border declaration gives: its length, or none where its style is none or it is zero. */
function borderWidth(value: string): string {
  const length = value.split(/\s+/).find((token) => token === '0' || /^[\d.]+[a-z]+$/.test(token));
  if (length) return length;
  if (/\b(none|hidden)\b/.test(value)) return '0';
  return value;
}

/**
 * The stage's box as the browser computes it from the rules that match it, each in its order of specificity, then of
 * the staging: whether its width holds its padding and border, and their lengths on each side.
 */
function boxOf(matching: { rule: Rule; specificity: Specificity }[]) {
  const cascaded = [...matching].sort((a, b) => compare(a.specificity, b.specificity) || a.rule.order - b.rule.order);
  let borderBox = false;
  const padding: Record<Side, string> = { top: '0', right: '0', bottom: '0', left: '0' };
  const border: Record<Side, string> = { top: '0', right: '0', bottom: '0', left: '0' };
  for (const { rule } of cascaded) {
    for (const [property, value] of rule.declarations) {
      if (property === 'box-sizing') borderBox = value === 'border-box';
      const paddingOf = /^padding(.*)$/.exec(property);
      if (paddingOf && SIDES[paddingOf[1]]) for (const [side, length] of spread(SIDES[paddingOf[1]], value.split(/\s+/))) padding[side] = length;
      const borderOf = /^border(-top|-right|-bottom|-left|-inline-start|-inline-end|-block-start|-block-end|-inline|-block)?(-width)?$/.exec(property);
      if (borderOf) {
        const sides = SIDES[borderOf[1] ?? ''];
        const values = borderOf[2] ? value.split(/\s+/) : [borderWidth(value)];
        for (const [side, length] of spread(sides, sides.length === 4 && !borderOf[2] ? [values[0]] : values)) border[side] = length;
      }
    }
  }
  const sum = (sides: Side[]) => sides.reduce((total, side) => total + pixels(padding[side], `a padding`) + pixels(border[side], `a border`), 0);
  return { borderBox, inline: sum(['left', 'right']), block: sum(['top', 'bottom']) };
}

const elementOf = (node: Node, parent?: Element): Element => {
  const element: Element = { name: String(node.name).toLowerCase(), attributes: node.attributes ?? {}, parent, children: [] };
  element.children = (node.children ?? []).filter((child: Node) => child.type === ELEMENT_NODE).map((child: Node) => elementOf(child, element));
  return element;
};

const cache = new Map<string, Rule[]>();

/**
 * Whether a stage of the document stands for an area of a window, and its lengths: where the rule of the staging in
 * effect for its width (the last that matches it and gives a width in pixels) gives a height in pixels too, and the
 * fixture's own element is not given a width in pixels at least as wide (as `laidOutBy` in lib/fixture-stages.ts
 * chooses). `page`: the document's stages are a whole page's frames (they stand in a `div`, not in its `main`).
 */
export function areaOf(staging: string, html: string, page = false): Area | undefined {
  const rules = cache.get(staging) ?? rulesOf(staging);
  cache.set(staging, rules);
  const root = parse(html).children.find((node: Node) => node.type === ELEMENT_NODE);
  if (!root) return undefined;
  // The stage stands where the document puts it: in its `main`, or in the page's `div` of stages.
  const top: Element = { name: 'html', attributes: {}, children: [] };
  const body: Element = { name: 'body', attributes: {}, parent: top, children: [] };
  const holder: Element = page ? { name: 'div', attributes: { class: 'stages' }, parent: body, children: [] } : { name: 'main', attributes: {}, parent: body, children: [] };
  const stage = elementOf(root, holder);
  const own = stage.children[0];
  const sized = (element: Element | undefined) => (element ? rules.filter((rule) => PIXELS.test(widthOf(rule)) && matched(rule, element)).at(-1) : undefined);
  const ofStage = sized(stage);
  if (!ofStage || !PIXELS.test(heightOf(ofStage))) return undefined;
  const ofOwn = sized(own);
  if (ofOwn && parseFloat(widthOf(ofOwn)) >= parseFloat(widthOf(ofStage))) return undefined;
  const matching = rules.flatMap((rule) => {
    const specificity = matched(rule, stage);
    return specificity ? [{ rule, specificity }] : [];
  });
  if (stage.attributes.style) matching.push({ rule: { selectors: [], declarations: rulesOf(`x{${stage.attributes.style}}`)[0].declarations, order: Infinity }, specificity: [Infinity, 0, 0] });
  const box = boxOf(matching);
  // Its height is the one the cascade gives it, which its width's rule gives in pixels: where another rule overrides it, it is read from that one.
  const height = [...matching].sort((a, b) => compare(a.specificity, b.specificity) || a.rule.order - b.rule.order).map(({ rule }) => heightOf(rule)).filter(Boolean).at(-1) ?? '';
  const edges = (length: number) => (box.borderBox ? 0 : length);
  return {
    width: Math.max(LEAST, parseFloat(widthOf(ofStage)) + edges(box.inline)),
    height: pixels(height, 'a height') + edges(box.block),
  };
}
