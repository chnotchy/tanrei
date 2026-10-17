// The docs' own steps in the Markdown pipeline: what rendered Markdown draws with Tanrei's components.
//
// Tanrei does not move a product's content at run time, so the docs do it where the content is built:
// four passes over the HTML tree of every `.md` / `.mdx` page, registered after Starlight's own by the integration
// below. They are plain objects of the Markdown engine's plugin shape (a `name` and a visitor per element), so nothing
// is imported from the engine and the lockfile is not touched.
//
// 1. A notice. Authors write Starlight's directive — `:::note[Title]`, `:::tip`, `:::caution`, `:::danger` — and
//    Starlight's step, which runs first, turns it into `aside.starlight-aside` with the title it was given or the
//    kind's name in the page's language. That element is replaced by a callout at the reading size:
//
//      <tanrei-callout size="large" status="info" data-kind="note" data-title="…">
//        <p slot="title">…</p>
//        <div class="tanrei-prose" data-size="large" data-measure="false">…</div>
//      </tanrei-callout>
//
//    note → `info`, caution → `warning`, danger → `error`; a tip has no status and shows the glyph `lightbulb`.
//    The title and the body stay in the document (found by the site's search, shown before the element is defined).
//    `data-kind` and `data-title` are for `components/MarkdownContent.astro`, which knows the page's language and
//    writes the kind's name as `status-label` where the author's title does not already say it. `components/
//    Callout.astro` writes the same markup for a page that needs the notice as a component.
//
// 2. A table. Every `<table>` that Markdown renders is wrapped in `<tanrei-table>`, the scroll box that draws it
//    (packages/web/IMPLEMENTATION.md, "Markdown"). A Markdown table has no caption, so it is named for assistive technology
//    by `label` (TBL-23): THE NEAREST HEADING BEFORE IT in the page, or the page's title where no heading comes
//    first; a second table under the same heading is "<heading> (2)", so that no two tables of a page share a name.
//    A table written as HTML inside MDX is the author's own and is left alone.
//
// 3. Code. Every fenced block becomes Tanrei's code block, highlighted HERE, where the page is built, by the
//    highlighter the element itself brings (`@tanrei/web/highlight`) — so the first paint has its colors,
//    with scripting off too, and the browser loads no highlighter:
//
//      <tanrei-code-block language="tsx" label="Usage: TSX" copy>
//        <pre translate="no" spellcheck="false"><code data-syntax-of="tsx"><span data-line><span data-line-code><span data-syntax="keyword">import</span> …</span></span>…</code></pre>
//      </tanrei-code-block>
//
//    The lines are written as the element draws them (`highlightToNodes` with the block's own props as `lines`): each
//    line's box and the box of its code, and beside it the prompt, the number, the sign and the mark the fence asks
//    for. So `code.css` draws the block whole before the element is defined, nothing moves when it is, and the
//    element finds its work done and writes nothing into the page. (The words of a marked line's label are the
//    page's language's, written later: that label alone is added by the element — it is not drawn.)
//
//    - The fence's first word is the language. One the highlighter does not know, `text` and a fence with none are
//      drawn plain (the build names an unknown one once, as a warning).
//    - A fence of shell commands (`sh`, `bash`, `zsh`, `shell`) takes the prompt `$`, which is drawn and is not code.
//    - The rest of the fence's first line is the element's own attributes, written as HTML writes them, and no other
//      vocabulary: ```` ```ts title="sizes.ts" line-numbers start-line="96" highlighted-lines="98, 100-101" ````.
//      The ones read are in `FENCE_ATTRIBUTES`; `copy="false"` and `prompt=""` take away what the step adds.
//    - A block that can scroll needs a name (COD-22): its `title`, or else `label` — the nearest heading before it and
//      the language's name ("Usage: TSX"), numbered where two blocks of a page would share one.
//    - The words of the copy button and of a marked line are the page's language's: `components/MarkdownContent.astro`
//      writes them (`copy-label`, `highlighted-label`, …), as it does a notice's kind.
//
//    Inline code is not this step's: `components/MarkdownContent.astro` gives every `code` of a page that is not in
//    a `pre` — Markdown's and the docs' components' alike — the inline-code class and its attributes.
//
// 4. A link that leaves the site. Every anchor Markdown renders whose address is of another origin than the site's
//    (`site` of astro.config.mjs) is marked as the Link's external link is (specs/link.spec.json, LNK-30, LNK-31,
//    LNK-34), by the build step the web package gives for it, `markExternalLinks()` of
//    `@tanrei/web/links/node` — the same rule and the same attributes as any product's pipeline writes:
//
//      <a href="https://…" data-external="true" aria-description="external link">…</a>
//
//    `prose.css` draws the arrow for `data-external` (mirrored in a right-to-left page by the stylesheet: the markup
//    is the same), so the mark is in the first paint and the browser computes nothing. Where and how the address
//    opens does not change: no `target`, no `rel`. The words are the page's language's, which this step does not
//    know: it leaves `data-docs-words="externalLink"` in their place and `components/MarkdownContent.astro` writes
//    `aria-description` there from the docs' strings (lib/i18n.ts), as it writes a notice's kind.
//    The other site's icon stands before the link's text where the site has recorded one (LNK-32): the step asks
//    `resolveSiteIcons()` for the origins the pages link to, from the lock file alone (`links.config.mjs`), and
//    `markExternalLinks()` writes the `img` the Link draws. NOTHING IS FETCHED by a build: a person reads the icons
//    once with `pnpm --filter @tanrei/docs links`, and commits the lock file and the pictures (public/link-pictures/).
//    A path, a fragment, a mail address and an address of the site's own origin are left alone; so is an anchor that
//    already says whether it is external (`data-external`), one that carries a class of Tanrei's, and every anchor an
//    author wrote as HTML in MDX, which is the author's own. Code is never a link: a fence is text.

import { highlightToNodes, languages, loadLanguage } from '@tanrei/web/highlight';
import { markExternalLinks, resolveSiteIcons } from '@tanrei/web/links/node';
import { linkOptions, linkedOrigins } from '../../links.config.mjs';
import { EXTERNAL_WORDS } from './markdown-content.mjs';

const KINDS = { note: 'info', tip: undefined, caution: 'warning', danger: 'error' };
const ALIGN = { left: 'start', center: 'center', right: 'end' };
const HEADINGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

const classes = (node) => {
  const value = node.properties?.className ?? node.properties?.class ?? [];
  return Array.isArray(value) ? value.map(String) : String(value).split(/\s+/);
};
const element = (tagName, properties, children = []) => ({ type: 'element', tagName, properties, children });
const isElement = (node, tagName) => node?.type === 'element' && (!tagName || node.tagName === tagName);
const isIcon = (node) => node.type === 'raw' || node.type === 'mdxJsxTextElement' || isElement(node, 'svg');

/** Starlight's aside → Tanrei's callout. */
const callouts = {
  name: 'tanrei-docs-callout',
  element: {
    filter: ['aside'],
    visit(node, ctx) {
      const names = classes(node);
      if (!names.includes('starlight-aside')) return;
      const kind = Object.keys(KINDS).find((k) => names.includes(`starlight-aside--${k}`)) ?? 'note';
      const title = node.children.find((child) => isElement(child, 'p') && classes(child).includes('starlight-aside__title'));
      const body = node.children.find((child) => isElement(child, 'div') && classes(child).includes('starlight-aside__content'));
      // The title's first child is Starlight's inline icon (raw HTML in Markdown, a fragment in MDX): it goes.
      const titleContent = (title?.children ?? []).filter((child, i) => !(i === 0 && isIcon(child)));
      const properties = { size: 'large', 'data-kind': kind, 'data-title': title ? ctx.textContent(title).trim() : '' };
      if (KINDS[kind]) properties.status = KINDS[kind];
      return element('tanrei-callout', properties, [
        ...(kind === 'tip' ? [element('span', { slot: 'icon', 'data-pagefind-ignore': true }, [{ type: 'text', value: 'lightbulb' }])] : []),
        element('p', { slot: 'title' }, titleContent),
        ...(body?.children.length ? [element('div', { class: 'tanrei-prose', 'data-size': 'large', 'data-measure': 'false' }, [...body.children])] : []),
      ]);
    },
  },
};

/** A Markdown table → a table in Tanrei's scroll box, named by the heading above it. One instance per document. */
const tables = () => {
  let heading = '';
  const used = new Map();
  return {
    name: 'tanrei-docs-table',
    before(_root, ctx) {
      heading = String(ctx.data?.astro?.frontmatter?.title ?? '');
    },
    element: [
      {
        filter: HEADINGS,
        visit(node, ctx) {
          heading = ctx.textContent(node).trim() || heading;
        },
      },
      {
        filter: ['table'],
        visit(node, ctx) {
          const parent = ctx.parent(node);
          if (isElement(parent, 'tanrei-table')) return;
          const count = (used.get(heading) ?? 0) + 1;
          used.set(heading, count);
          // A table with no heading before it on a page with no title has no name to give, however many there are.
          const label = heading && count > 1 ? `${heading} (${count})` : heading;
          ctx.wrapNode(node, element('tanrei-table', label ? { label } : {}));
        },
      },
      {
        // A column's alignment: the engine writes `style="text-align: right"`, a physical side. The Table's word is
        // `data-align` — start, center or end, by the layout direction (TBL-7, TBL-28).
        filter: ['th', 'td'],
        visit(node, ctx) {
          const side = /^\s*text-align:\s*(left|center|right)\s*;?\s*$/.exec(String(node.properties?.style ?? ''))?.[1];
          if (!side) return;
          ctx.setProperty(node, 'style', null);
          ctx.setProperty(node, 'data-align', ALIGN[side]);
        },
      },
    ],
  };
};

// ── Code ────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** A language's name in a block's accessible name. Proper names: the same in every language of the site. */
const LANGUAGE_NAMES = {
  html: 'HTML', xml: 'XML', svg: 'SVG', markup: 'HTML', css: 'CSS', js: 'JavaScript', mjs: 'JavaScript', cjs: 'JavaScript', javascript: 'JavaScript', jsx: 'JSX',
  ts: 'TypeScript', typescript: 'TypeScript', tsx: 'TSX', json: 'JSON', jsonc: 'JSON', sh: 'Shell', bash: 'Shell', zsh: 'Shell', shell: 'Shell',
  swift: 'Swift', kotlin: 'Kotlin', kt: 'Kotlin', dart: 'Dart',
};
const SHELLS = new Set(['sh', 'bash', 'zsh', 'shell']);
const PLAIN = new Set(['', 'text', 'plain', 'plaintext']);
/** What a fence's first line may say after the language: attributes of `<tanrei-code-block>` (specs/code-block.spec.json). */
const FENCE_ATTRIBUTES = new Set([
  'title', 'label', 'language-label', 'variant', 'size', 'highlight', 'wrap', 'line-numbers', 'start-line', 'max-lines', 'highlighted-lines', 'added-lines', 'removed-lines',
  'highlighted-label', 'added-label', 'removed-label', 'prompt', 'copy', 'copy-label', 'copied-label', 'copy-failed-label',
]);
const FENCE_ATTRIBUTE = /\s*([a-z][a-z-]*)(?:="([^"]*)")?/y;

/** The attributes a fence's first line names, or a sentence that says what in it cannot be read. */
export function fenceAttributes(meta) {
  const attributes = {};
  FENCE_ATTRIBUTE.lastIndex = 0;
  let end = 0;
  for (let match; (match = FENCE_ATTRIBUTE.exec(meta)); end = FENCE_ATTRIBUTE.lastIndex) {
    if (!FENCE_ATTRIBUTES.has(match[1])) return `"${match[1]}" is not an attribute a fence may give its code block`;
    attributes[match[1]] = match[2] ?? true;
  }
  return meta.slice(end).trim() ? `"${meta.slice(end).trim()}" is not written as attributes (name or name="value")` : attributes;
}

/** What stands beside a block's lines, by the attribute a fence gives: the props `highlightToNodes` takes as `lines`. */
const BESIDE_LINES = {
  'line-numbers': ['lineNumbers', () => true],
  'start-line': ['startLine', Number],
  'highlighted-lines': ['highlightedLines', String],
  'added-lines': ['addedLines', String],
  'removed-lines': ['removedLines', String],
  'highlighted-label': ['highlightedLabel', String],
  'added-label': ['addedLabel', String],
  'removed-label': ['removedLabel', String],
  prompt: ['prompt', String],
};

/** A node `highlightToNodes` gives — text, or a span with its attributes and children — as a node of the HTML tree. */
const treeNode = (node) => (typeof node === 'string' ? { type: 'text', value: node } : element(node.name, { ...node.attributes }, node.children.map(treeNode)));

/** The names the highlighter knows a language by: set once, when the integration loads the grammars. */
let KNOWN = new Set();

/** A fenced block → Tanrei's code block with its runs, named by the heading above it. One instance per document. */
const codeBlocks = (warn) => () => {
  let heading = '';
  const used = new Map();
  return {
    name: 'tanrei-docs-code',
    before(_root, ctx) {
      heading = String(ctx.data?.astro?.frontmatter?.title ?? '');
    },
    element: [
      {
        filter: HEADINGS,
        visit(node, ctx) {
          heading = ctx.textContent(node).trim() || heading;
        },
      },
      {
        filter: ['pre'],
        visit(node, ctx) {
          const code = node.children?.find((child) => isElement(child, 'code'));
          if (!code || isElement(ctx.parent(node), 'tanrei-code-block')) return;
          const language = String(code.data?.lang ?? '').trim().toLowerCase();
          const given = fenceAttributes(String(code.data?.meta ?? ''));
          if (typeof given === 'string') throw new Error(`${ctx.fileURL?.pathname ?? 'A page'}: a code fence's first line — ${given}.`);
          if (!PLAIN.has(language) && !KNOWN.has(language)) warn(language, ctx.fileURL);

          const properties = {};
          if (language) properties.language = language;
          if (!given.title && !given.label) {
            const name = [heading, LANGUAGE_NAMES[language]].filter(Boolean).join(': ');
            const count = (used.get(name) ?? 0) + 1;
            used.set(name, count);
            if (name) properties.label = count > 1 ? `${name} (${count})` : name;
          }
          if (SHELLS.has(language)) properties.prompt = '$';
          properties.copy = '';
          for (const [name, value] of Object.entries(given)) properties[name] = value === true ? '' : value;
          for (const name of ['copy', 'prompt']) if (given[name] === 'false' || given[name] === '') delete properties[name];

          // One line break at the end of a fence's text is the fence's, not the code's (COD-2).
          const text = ctx.textContent(code).replace(/\n$/, '');
          // The element's attributes, as the props that say what stands beside its lines.
          const beside = Object.fromEntries(Object.entries(BESIDE_LINES).filter(([name]) => properties[name] !== undefined).map(([name, [prop, read]]) => [prop, read(properties[name])]));
          const nodes = highlightToNodes(text, language, { lines: beside });
          if (!Array.isArray(nodes)) throw new Error(`The grammar of "${language}" was not loaded before the pages were read.`);
          // COD-2: code is not translated and not spell-checked — written here, so the element has nothing to add.
          return element('tanrei-code-block', properties, [element('pre', { translate: 'no', spellcheck: 'false' }, [element('code', { 'data-syntax-of': language || 'text' }, nodes.map(treeNode))])]);
        },
      },
    ],
  };
};
/** What `externalLinks` leaves for `components/MarkdownContent.astro`, which writes the words in its place (lib/markdown-content.mjs). */
export { EXTERNAL_WORDS };

/**
 * A Markdown link that leaves the site → the Link's external link. `site` is the site's own origins. The engine's
 * tree is changed through its context alone, so the helper marks a copy of the anchor (it reads the address, the
 * download and the description, and never the content) and what it wrote is set on the anchor itself.
 */
export const externalLinks = (site, icons = {}) => ({
  name: 'tanrei-docs-external-link',
  element: {
    filter: ['a'],
    visit(node, ctx) {
      if (classes(node).some((name) => name.startsWith('tanrei-'))) return;
      const copy = element('a', { ...node.properties });
      markExternalLinks(copy, { site, base: site[0], icons });
      if (copy.properties['data-external'] !== 'true' || node.properties?.['data-external'] !== undefined || node.properties?.dataExternal !== undefined) return;
      ctx.setProperty(node, 'data-external', 'true');
      // The site's icon, where one is recorded for its origin: the helper wrote it as the copy's first child.
      const icon = copy.children.find((child) => isElement(child, 'img'));
      if (icon) ctx.prependChild(node, icon);
      // One description for a link (LNK-34): an anchor that has one keeps it, and one that opens a new tab says that.
      const said = ['aria-description', 'ariaDescription', 'aria-describedby', 'ariaDescribedBy', 'target'].some((name) => node.properties?.[name]);
      if (!said) ctx.setProperty(node, EXTERNAL_WORDS, 'externalLink');
    },
  },
});

/** The Astro integration: list it after `starlight()`, so that these passes run after Starlight's. */
export function tanreiMarkdown() {
  return {
    name: 'tanrei-docs-markdown',
    hooks: {
      'astro:config:setup': async ({ config, logger }) => {
        const options = config.markdown?.processor?.options;
        if (!Array.isArray(options?.hastPlugins)) {
          logger.warn('The Markdown processor takes no HTML-tree plugins: tables, notices, code and external links are not drawn by Tanrei.');
          return;
        }
        // Every grammar is loaded before a page is read, so the highlighter answers at once for each fence.
        KNOWN = new Set(languages());
        await Promise.all([...KNOWN].map((language) => loadLanguage(language)));
        const unknown = new Set();
        const warn = (language, fileURL) => {
          if (unknown.has(language)) return;
          unknown.add(language);
          logger.warn(`A code fence names "${language}", a language the highlighter has no grammar for: it is drawn plain (first seen in ${fileURL?.pathname ?? 'a page'}).`);
        };
        options.hastPlugins.push(callouts, tables, codeBlocks(warn));
        // The site's own origin: every other one is another site's. Without it nothing can be told, and nothing is marked.
        // The icons of the other sites, from the lock file alone: an origin without one shows the arrow alone. What a
        // person must do is said — an origin the lock file has not read yet, a picture missing from its directory —;
        // an origin whose icon could not be used was said when it was read, and is recorded with its reason.
        if (config.site) {
          const report = (message) => /not-in-lock|is missing from the picture directory/.test(message) && logger.warn(`${message} (run \`pnpm --filter @tanrei/docs links\`)`);
          const icons = await resolveSiteIcons(linkedOrigins(), { ...linkOptions, mode: 'frozen', report });
          options.hastPlugins.push(externalLinks([new URL(config.site).origin], icons));
        } else logger.warn('The site has no address of its own (`site`): links that leave it are not marked.');
      },
    },
  };
}
