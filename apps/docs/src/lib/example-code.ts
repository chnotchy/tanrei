// The code an example shows (components/visuals/Example.astro): what its stage holds, as a product writes it — in HTML,
// and in React with the wrappers of the React package. Nothing here touches a document, so the Node tests run it as the
// browser does (test/example-code.test.mjs).
//
// The source is the stage's markup as the page was built, before any element was defined: the build writes what an
// author wrote with its white space between tags taken out and a boolean attribute as `="true"` (`toggle="true"`), and a
// defined element writes attributes of its own. So the markup is read as tokens, and written again one element to a
// line where it does not fit on one, with what the site adds for itself (its search marks, the framework's scoping
// classes) left out.
//
// React: a Tanrei element is its wrapper (`<tanrei-button>` → `<Button>`, the names the React package takes from the
// web package's manifest, `virtual:tanrei-react-names`), each attribute the prop of its property (`icon-position` →
// `iconPosition`); an attribute with no property behind it (a mark another component reads) keeps its name, as the
// wrapper takes it. A native element keeps its tag, with the names React gives the platform's attributes.

/** The names the React package gives an element and its properties, by tag: the wrapper, and each attribute's property and type. */
export interface ReactNames {
  /** The package the wrappers are imported from (`@tanrei/react`). */
  module: string;
  /**
   * By tag: the wrapper's name, and the attributes whose prop is not their name in camelCase — the property's name, and
   * `1` where its value is a number (lib/element-modules.mjs `reactNames`).
   */
  elements: Record<string, [name: string, props: Record<string, [property: string, number?: 1]>]>;
}

type Node = { kind: 'text'; text: string } | { kind: 'comment'; text: string } | { kind: 'element'; tag: string; attrs: [string, string | null][]; children: Node[] };

/** Elements with no end tag. */
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
/** Elements whose text is not markup. */
const RAW = new Set(['script', 'style', 'textarea']);

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0' };
const decode = (text: string) =>
  text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, name: string) => {
    if (name[0] === '#') return String.fromCodePoint(name[1].toLowerCase() === 'x' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10));
    return ENTITIES[name.toLowerCase()] ?? whole;
  });

/** Markup as a tree of elements, text and comments. Forgiving: an end tag that closes nothing open is skipped. */
export function parse(html: string): Node[] {
  const root: Node[] = [];
  const open: { tag: string; children: Node[] }[] = [{ tag: '', children: root }];
  const top = () => open[open.length - 1].children;
  let at = 0;
  while (at < html.length) {
    if (html.startsWith('<!--', at)) {
      const end = html.indexOf('-->', at + 4);
      const stop = end < 0 ? html.length : end;
      top().push({ kind: 'comment', text: html.slice(at + 4, stop) });
      at = stop + 3;
      continue;
    }
    if (html[at] === '<' && html[at + 1] === '/') {
      const end = html.indexOf('>', at);
      const tag = html.slice(at + 2, end < 0 ? html.length : end).trim().toLowerCase();
      const index = open.map((each) => each.tag).lastIndexOf(tag);
      if (index > 0) open.length = index;
      at = end < 0 ? html.length : end + 1;
      continue;
    }
    if (html[at] === '<' && /[a-z]/i.test(html[at + 1] ?? '')) {
      const name = /^<([a-z][\w:-]*)/i.exec(html.slice(at))!;
      const tag = name[1].toLowerCase();
      let cursor = at + name[0].length;
      const attrs: [string, string | null][] = [];
      const ATTR = /\s*([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/y;
      for (;;) {
        ATTR.lastIndex = cursor;
        const found = ATTR.exec(html);
        if (!found) break;
        attrs.push([found[1].toLowerCase(), found[2] ?? found[3] ?? found[4] ?? null]);
        cursor = ATTR.lastIndex;
      }
      const end = html.indexOf('>', cursor);
      const closed = html[end - 1] === '/';
      at = end < 0 ? html.length : end + 1;
      const element: Node = { kind: 'element', tag, attrs: attrs.map(([key, value]) => [key, value === null ? null : decode(value)]), children: [] };
      top().push(element);
      if (RAW.has(tag)) {
        const stop = html.toLowerCase().indexOf(`</${tag}`, at);
        const text = html.slice(at, stop < 0 ? html.length : stop);
        if (text) element.children.push({ kind: 'text', text });
        at = stop < 0 ? html.length : html.indexOf('>', stop) + 1;
      } else if (!VOID.has(tag) && !closed) open.push({ tag, children: element.children });
      continue;
    }
    const next = html.indexOf('<', at + 1);
    const stop = next < 0 ? html.length : next;
    top().push({ kind: 'text', text: decode(html.slice(at, stop)) });
    at = stop;
  }
  return root;
}

/**
 * What the site adds to an element for itself, which a product does not write: the search's marks, the framework's
 * scoping class and attributes, and the docs' own marks (`data-docs-*`, `data-example-*`).
 */
const ADDED = /^(data-pagefind-|data-astro-|data-docs-|data-example-)/;
const ADDED_CLASS = /^astro-[\w-]+$/;

/** Attributes whose value `true` is a word of their own, not a boolean written by the build: kept as written. */
const WORD_TRUE = /^(aria-|data-)|^(draggable|contenteditable|spellcheck)$/;

function cleaned(attrs: [string, string | null][]): [string, string | null][] {
  return attrs.flatMap(([name, value]): [string, string | null][] => {
    if (ADDED.test(name)) return [];
    if (name === 'class') {
      const kept = (value ?? '').split(/\s+/).filter((each) => each && !ADDED_CLASS.test(each) && each !== 'tanrei-not-prose');
      return kept.length ? [[name, kept.join(' ')]] : [];
    }
    return [[name, value === 'true' && !WORD_TRUE.test(name) ? null : value]];
  });
}

/** A tree with what the site adds taken out, white space between elements dropped, and runs of white space made one. */
function tidy(nodes: Node[]): Node[] {
  return nodes.flatMap((node): Node[] => {
    if (node.kind === 'comment') return [];
    if (node.kind === 'text') return [{ kind: 'text', text: node.text.replace(/\s+/g, ' ') }];
    // The frame's own parts in its stage: the width handle (components/fixtures/ResizeHandle.astro), and a figure's
    // overlay; a figure's canvas holds what the page wrote.
    const marked = (attribute: string) => node.attrs.some(([name]) => name === attribute);
    if (marked('data-resize-handle') || marked('data-example-overlay')) return [];
    if (marked('data-example-canvas')) return tidy(node.children);
    return [{ ...node, attrs: cleaned(node.attrs), children: RAW.has(node.tag) ? node.children : tidy(node.children) }];
  });
}

/** The longest line an element is written on whole before its children are each given a line of their own. */
const LINE = 100;
const INDENT = '  ';

const escapeText = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\u00a0/g, '&nbsp;');
const escapeAttr = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

interface Writer {
  open(node: Extract<Node, { kind: 'element' }>): string;
  close(node: Extract<Node, { kind: 'element' }>): string;
  /** An element with no children, written whole (`<input …>`, `<Button … />`). */
  empty(node: Extract<Node, { kind: 'element' }>): string;
  text(text: string): string;
}

/** Writes a tree, an element on one line where it fits and holds no element that needs lines of its own. */
function write(nodes: Node[], writer: Writer, depth: number): string[] {
  const lines: string[] = [];
  const pad = INDENT.repeat(depth);
  const inline = (node: Node): string => {
    if (node.kind === 'text') return writer.text(node.text);
    if (node.kind === 'comment') return '';
    if (!node.children.length) return writer.empty(node);
    return writer.open(node) + node.children.map(inline).join('') + writer.close(node);
  };
  for (const node of nodes) {
    if (node.kind === 'text') {
      const text = node.text.trim();
      if (text) lines.push(pad + writer.text(text));
      continue;
    }
    if (node.kind === 'comment') continue;
    const whole = inline(node).trim();
    const hasElementChild = node.children.some((child) => child.kind === 'element' && child.children.some((inner) => inner.kind === 'element'));
    if ((pad + whole).length <= LINE && !hasElementChild) {
      lines.push(pad + whole);
      continue;
    }
    if (!node.children.length || RAW.has(node.tag)) {
      lines.push(pad + whole);
      continue;
    }
    lines.push(pad + writer.open(node));
    lines.push(...write(node.children, writer, depth + 1));
    lines.push(pad + writer.close(node));
  }
  return lines;
}

const htmlWriter: Writer = {
  open: (node) => `<${node.tag}${node.attrs.map(([name, value]) => (value === null ? ` ${name}` : ` ${name}="${escapeAttr(value)}"`)).join('')}>`,
  close: (node) => (VOID.has(node.tag) ? '' : `</${node.tag}>`),
  empty: (node) => htmlWriter.open(node) + htmlWriter.close(node),
  text: escapeText,
};

/** The stage's markup as a product writes it in HTML. */
export function htmlOf(source: string): string {
  return write(tidy(parse(source)), htmlWriter, 0).join('\n');
}

/** The names React gives the platform's attributes, where they are not the attribute's own. */
const REACT_ATTRS: Record<string, string> = {
  class: 'className',
  for: 'htmlFor',
  tabindex: 'tabIndex',
  readonly: 'readOnly',
  maxlength: 'maxLength',
  minlength: 'minLength',
  colspan: 'colSpan',
  rowspan: 'rowSpan',
  autocomplete: 'autoComplete',
  autofocus: 'autoFocus',
  inputmode: 'inputMode',
  enterkeyhint: 'enterKeyHint',
  crossorigin: 'crossOrigin',
  srcset: 'srcSet',
  datetime: 'dateTime',
  novalidate: 'noValidate',
  accesskey: 'accessKey',
  contenteditable: 'contentEditable',
  spellcheck: 'spellCheck',
  viewbox: 'viewBox',
};

const camel = (name: string) => name.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
const jsString = (value: string) => `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

/** An inline style as React's object of it: `{{ inlineSize: '20rem', '--tanrei-x': '1px' }}`. */
function styleObject(value: string): string {
  const entries = value
    .split(';')
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .map((declaration) => {
      const colon = declaration.indexOf(':');
      const property = declaration.slice(0, colon).trim();
      const key = property.startsWith('--') ? jsString(property) : camel(property);
      return `${key}: ${jsString(declaration.slice(colon + 1).trim())}`;
    });
  return `{{ ${entries.join(', ')} }}`;
}

/** The stage's markup as a product writes it in React: the wrappers it imports and one component that draws it. */
export function reactOf(source: string, names: ReactNames): string {
  const used = new Set<string>();
  const tagOf = (node: Extract<Node, { kind: 'element' }>) => {
    const wrapper = names.elements[node.tag];
    if (!wrapper) return node.tag;
    used.add(wrapper[0]);
    return wrapper[0];
  };
  const propsOf = (node: Extract<Node, { kind: 'element' }>) => {
    const wrapper = names.elements[node.tag];
    return node.attrs.map(([name, value]) => {
      // An inline handler is a function of the event; `this` is the element it is written on.
      if (/^on[a-z]+$/.test(name) && value !== null) return ` on${name[2].toUpperCase()}${name.slice(3)}={(event) => { ${value.replace(/\bthis\b/g, 'event.currentTarget')} }}`;
      if (name === 'style' && value !== null) return ` style=${styleObject(value)}`;
      const listed = wrapper?.[1][name];
      const prop = listed ? listed[0] : /^(aria-|data-)/.test(name) ? name : (REACT_ATTRS[name] ?? (wrapper ? camel(name) : name));
      if (value === null) return ` ${prop}`;
      if (listed?.[1] && value.trim() !== '' && Number.isFinite(Number(value))) return ` ${prop}={${Number(value)}}`;
      return ` ${prop}="${escapeAttr(value)}"`;
    }).join('');
  };
  const writer: Writer = {
    open: (node) => `<${tagOf(node)}${propsOf(node)}>`,
    close: (node) => `</${tagOf(node)}>`,
    empty: (node) => `<${tagOf(node)}${propsOf(node)} />`,
    text: (text) => text.replace(/&/g, '&amp;').replace(/[{}<>]/g, (character) => `{'${character}'}`).replace(/\u00a0/g, '&nbsp;'),
  };
  const tree = tidy(parse(source)).filter((node) => node.kind !== 'text' || node.text.trim());
  const many = tree.length !== 1;
  const body = write(tree, writer, many ? 3 : 2);
  const component = many ? [`    <>`, ...body, `    </>`] : body;
  const imports = used.size ? [`import { ${[...used].sort().join(', ')} } from '${names.module}';`, ''] : [];
  return [...imports, 'export function Example() {', '  return (', ...component, '  );', '}'].join('\n');
}
