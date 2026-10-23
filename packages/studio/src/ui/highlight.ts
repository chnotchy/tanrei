// Which parts of the preview a value reaches: the rail's rows say which tokens a setting writes (`highlight(ids)`),
// and the parts that read one of them — or a token that follows one of them — are outlined for a moment.
//
// Nothing here is a list kept by hand. What follows a token is the engine's (`view.followers`) and the sheet's (a
// custom property of the sheet that is written with `var()` of another follows it); what a part reads is what is
// drawn: the custom properties its component's shadow stylesheets read (and the components inside it), the ones its
// own `style` reads, and the ones the page's rules for its classes and its element read.
import type { Json } from './dom';

const VAR = /var\(\s*(--[\w-]+)/g;
const varsIn = (text: string, into: Set<string>) => {
  for (const match of text.matchAll(VAR)) into.add(match[1]);
  return into;
};

export interface Highlighter {
  /** Outline the parts that read any of these tokens (ids), or a token that follows one; returns how many. */
  highlight(ids: string[]): number;
  clear(): void;
  warm(): void;
}

export function createHighlighter({ scope, view, sheet, cssVar }: { scope: HTMLElement; view: () => Json | null; sheet: HTMLStyleElement; cssVar: (id: string) => string }): Highlighter {
  /** For the sheet's text: each custom property → the custom properties written with it. */
  let graph: { text: string; dependents: Map<string, string[]> } | undefined;
  const dependentsOf = () => {
    const text = sheet.textContent ?? '';
    if (graph?.text === text) return graph.dependents;
    const dependents = new Map<string, string[]>();
    for (const match of text.matchAll(/(--[\w-]+)\s*:([^;}]*)/g)) {
      for (const used of varsIn(match[2], new Set())) {
        const list = dependents.get(used);
        if (list) list.push(match[1]);
        else dependents.set(used, [match[1]]);
      }
    }
    graph = { text, dependents };
    return dependents;
  };

  /**
   * The page's own rules (everything but the preview's sheet) that read a custom property, keyed by what their last
   * compound names — a class, an element — so that an element is matched only against the rules that could select it.
   */
  let rules: Map<string, { selector: string; names: Set<string> }[]> | undefined;
  const ruleIndex = () => {
    if (rules) return rules;
    const index = new Map<string, { selector: string; names: Set<string> }[]>();
    const add = (key: string, entry: { selector: string; names: Set<string> }) => (index.get(key) ?? index.set(key, []).get(key)!).push(entry);
    const walk = (list: CSSRuleList) => {
      for (const rule of list) {
        if (rule instanceof CSSStyleRule && rule.style.cssText.includes('var(')) {
          const names = varsIn(rule.style.cssText, new Set());
          for (const part of rule.selectorText.split(',')) {
            // What an element can match: the selector without its pseudo-elements.
            const selector = part.replace(/::[\w-]+(\([^)]*\))?/g, '').trim();
            const last = selector.split(/[\s>+~]+/).pop() ?? '';
            const classes = [...last.matchAll(/\.([\w-]+)/g)].map((match) => `.${match[1]}`);
            const element = /^[a-z][\w-]*/.exec(last)?.[0];
            for (const key of classes.length ? classes : element ? [element] : ['*']) add(key, { selector: selector || '*', names });
          }
        }
        if ('cssRules' in rule && (rule as CSSGroupingRule).cssRules) walk((rule as CSSGroupingRule).cssRules);
      }
    };
    for (const each of document.styleSheets) {
      if (each.ownerNode === sheet) continue;
      try {
        walk(each.cssRules);
      } catch {}
    }
    return (rules = index);
  };
  const matches = (el: Element, selector: string) => {
    try {
      return el.matches(selector);
    } catch {
      return false;
    }
  };

  const sheets = new WeakMap<CSSStyleSheet, Set<string>>();
  const sheetVars = (each: CSSStyleSheet) => {
    let found = sheets.get(each);
    if (!found) {
      found = new Set();
      try {
        for (const rule of each.cssRules) varsIn(rule.cssText, found);
      } catch {}
      sheets.set(each, found);
    }
    return found;
  };
  const meet = (a: Set<string>, b: Set<string>) => {
    const [small, large] = a.size < b.size ? [a, b] : [b, a];
    for (const name of small) if (large.has(name)) return true;
    return false;
  };

  /**
   * Whether an element draws with one of `names`: its `style`; the page's rules for its classes and its element (in
   * the document's tree, where they apply); its shadow root — the component's sheets, and the styles and components
   * inside it. Asked afresh at each call: a component draws its shadow root once it is connected.
   */
  function reader(names: Set<string>) {
    const known = new Map<Element, boolean>();
    const bySheet = new Map<CSSStyleSheet, boolean>();
    const sheetMeets = (each: CSSStyleSheet) => {
      let hit = bySheet.get(each);
      if (hit === undefined) bySheet.set(each, (hit = meet(sheetVars(each), names)));
      return hit;
    };
    const reads = (el: Element, inShadow: boolean): boolean => {
      let hit = known.get(el);
      if (hit !== undefined) return hit;
      const style = el.getAttribute('style');
      hit = Boolean(style?.includes('var(')) && meet(varsIn(style!, new Set()), names);
      if (!hit && !inShadow) {
        const index = ruleIndex();
        hit = [el.localName, '*', ...[...el.classList].map((name) => `.${name}`)].some((key) => (index.get(key) ?? []).some((rule) => meet(rule.names, names) && matches(el, rule.selector)));
      }
      const shadow = (el as HTMLElement).shadowRoot;
      if (!hit && shadow) {
        hit = shadow.adoptedStyleSheets.some(sheetMeets) || [...shadow.querySelectorAll('style')].some((styleEl) => Boolean(styleEl.sheet) && sheetMeets(styleEl.sheet!));
        if (!hit) hit = [...shadow.querySelectorAll('*')].some((inner) => (inner.hasAttribute('style') || Boolean((inner as HTMLElement).shadowRoot)) && reads(inner, true));
      }
      known.set(el, hit);
      return hit;
    };
    return (el: Element) => reads(el, false);
  }

  /** The custom properties a value reaches: its tokens', their followers', and every one of the sheet's written with them. */
  function reached(ids: string[]) {
    const now = view();
    const names = new Set<string>();
    for (const id of ids) {
      names.add(cssVar(id));
      for (const follower of now?.followers?.(id) ?? []) names.add(cssVar(follower));
    }
    const dependents = dependentsOf();
    const queue = [...names];
    while (queue.length) for (const next of dependents.get(queue.pop()!) ?? []) if (!names.has(next)) names.add(next), queue.push(next);
    return names;
  }

  const LIT = 'data-ts-lit';
  function clear() {
    for (const el of scope.querySelectorAll(`[${LIT}]`)) el.removeAttribute(LIT);
  }
  function highlight(ids: string[]) {
    clear();
    if (!ids.length) return 0;
    const reads = reader(reached(ids));
    let count = 0;
    // A component is one part: what its own children draw is its own (an icon in a button) and is not outlined again.
    const walk = (parent: Element) => {
      for (const el of parent.children) {
        if (reads(el)) {
          el.setAttribute(LIT, '');
          count += 1;
          if (el.localName.includes('-')) continue;
        }
        walk(el);
      }
    };
    for (const screen of scope.querySelectorAll('[data-screen]')) walk(screen);
    return count;
  }
  return {
    highlight,
    clear,
    /** Read the page's rules and the sheet once now, so that the first setting pointed at is answered at once. */
    warm: () => (ruleIndex(), dependentsOf()),
  };
}
