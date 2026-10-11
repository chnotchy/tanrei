// The prose specimen (specs/prose.specimen.md) as HTML, for the harness: a fixture of the prose spec names a section of
// that document in its `content`, and this builds the section the way a Markdown renderer
// with GitHub's extensions would — the elements, attributes and class names remark-gfm writes — so that prose.css is
// tested against what a product's renderer hands it.
//
// A renderer for ONE document, not a Markdown parser: it knows the constructs the specimen uses (headings, paragraphs,
// nested and loose lists, task items, quotes, rules, description lists, footnotes, emphasis, code, links, a line of
// raw HTML, the `[[name]]` placeholders) and nothing else. `@tanrei/web` ships no parser, and neither does its harness.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fixturePicture } from './pictures.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const SPECIMEN = path.resolve(here, '../../../specs/prose.specimen.md');
/** Another spec's specimen in the same form (`specs/inline-code.specimen.md`, say), by the spec's name. */
const specimenFile = (spec?: string) => (spec ? path.resolve(here, `../../../specs/${spec}.specimen.md`) : SPECIMEN);

export interface SpecimenOptions {
  /** Prefix of every id the section writes (heading ids, footnote ids), so two sections can share a page. */
  idPrefix?: string;
  /** Every heading gets prose's wrapper and an anchor (PRS-21): the specimen's `anchors` section says so of itself. */
  anchors?: boolean;
  /** The spec whose specimen holds the section (`inline-code`); prose's own where left out. */
  spec?: string;
}

/** The names of the specimen's sections, in order. */
export function specimenSections(): string[] {
  return [...fs.readFileSync(SPECIMEN, 'utf8').matchAll(/<!-- section: ([a-z0-9-]+) -->/g)].map((m) => m[1]);
}

/** The Markdown of one section: from its marker to the next one, without the document's comments. */
export function specimenMarkdown(section: string, spec?: string): string {
  const source = fs.readFileSync(specimenFile(spec), 'utf8');
  const start = source.indexOf(`<!-- section: ${section} -->`);
  if (start < 0) throw new Error(`prose specimen: no section "${section}" (it has ${specimenSections().join(', ')})`);
  const rest = source.slice(start).replace(/^<!--.*?-->/s, '');
  const end = rest.search(/<!-- section: /);
  return (end < 0 ? rest : rest.slice(0, end)).replace(/<!--.*?-->/gs, '');
}

/** One section of the specimen as the HTML of its blocks. */
export function specimenHtml(section: string, options: SpecimenOptions = {}): string {
  return new Renderer(options).document(specimenMarkdown(section, options.spec));
}

/** The text of one block of a specimen — code, links, strong, emphasis — as HTML: for a harness that lays the blocks out itself. */
export function specimenInline(text: string): string {
  return new Renderer({}).inline(text);
}

/**
 * The `[[code-block]]` placeholder of prose's specimen is the Code block: the element around a
 * `<pre><code>`, holding the code of the code block's own fixture `plain` — an island of prose (PRS-15, PRS-16).
 */
function codeBlockPlaceholder(): string {
  const spec = JSON.parse(fs.readFileSync(path.resolve(here, '../../../specs/code-block.spec.json'), 'utf8')) as { fixtures: { id: string; props: Record<string, unknown> }[] };
  const { code, label } = spec.fixtures.find((fixture) => fixture.id === 'plain')!.props as { code: string; label: string };
  return `<tanrei-code-block label="${attribute(label)}"><pre><code>${escape(code)}</code></pre></tanrei-code-block>`;
}

const escape = (text: string) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const attribute = (text: string) => escape(text).replaceAll('"', '&quot;');

const ITEM = /^( *)([-*]|\d+\.) +(.*)$/;
const startsBlock = (line: string) => /^(#{1,6} |> ?|---\s*$|\[\[[\w-]+\]\]\s*$|<\/?(p|div)\b|\[\^[\w-]+\]: )/.test(line) || ITEM.test(line);

class Renderer {
  private readonly prefix: string;
  private readonly anchors: boolean;
  private readonly notes = new Map<string, string>();
  private readonly referenced: string[] = [];

  constructor(options: SpecimenOptions) {
    this.prefix = options.idPrefix ?? '';
    this.anchors = options.anchors ?? false;
  }

  document(markdown: string): string {
    const body = this.blocks(markdown.split('\n'));
    return body + this.footnotes();
  }

  /** A run of lines as blocks. */
  private blocks(lines: string[]): string {
    const out: string[] = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim()) { i++; continue; }

      const heading = /^(#{1,6}) +(.*)$/.exec(line);
      if (heading) { out.push(this.heading(heading[1].length, heading[2].trim())); i++; continue; }

      if (/^---\s*$/.test(line)) { out.push('<hr>'); i++; continue; }

      const placeholder = /^\[\[([\w-]+)\]\]\s*$/.exec(line);
      if (placeholder?.[1] === 'code-block') {
        out.push(codeBlockPlaceholder());
        i++;
        continue;
      }
      if (placeholder) {
        // Phase A's components are not built yet (the specimen's header): a labelled box stands for each, an island.
        out.push(`<div class="tanrei-not-prose specimen-placeholder" role="img" aria-label="${placeholder[1]}">${placeholder[1]}</div>`);
        i++;
        continue;
      }

      const note = /^\[\^([\w-]+)\]: +(.*)$/.exec(line);
      if (note) { this.notes.set(note[1], note[2]); i++; continue; }

      // A line of raw HTML is the content's own element (the specimen's `<p dir="ltr">`).
      if (/^<(p|div)\b.*>\s*$/.test(line)) { out.push(line.trim()); i++; continue; }

      if (line.startsWith('>')) {
        const quoted: string[] = [];
        while (i < lines.length && lines[i].startsWith('>')) quoted.push(lines[i++].replace(/^> ?/, ''));
        out.push(`<blockquote>${this.blocks(quoted)}</blockquote>`);
        continue;
      }

      if (ITEM.test(line)) {
        const [html, next] = this.list(lines, i);
        out.push(html);
        i = next;
        continue;
      }

      // A term and its descriptions (`Term` then `: description`); groups that follow each other are one list.
      if (lines[i + 1]?.startsWith(': ')) {
        const groups: string[] = [];
        while (i < lines.length && lines[i].trim() && lines[i + 1]?.startsWith(': ')) {
          groups.push(`<dt>${this.inline(lines[i++].trim())}</dt>`);
          while (i < lines.length && lines[i].startsWith(': ')) groups.push(`<dd>${this.inline(lines[i++].slice(2).trim())}</dd>`);
          let skip = i;
          while (skip < lines.length && !lines[skip].trim()) skip++;
          if (lines[skip + 1]?.startsWith(': ')) i = skip;
        }
        out.push(`<dl>${groups.join('')}</dl>`);
        continue;
      }

      const text: string[] = [];
      while (i < lines.length && lines[i].trim() && !(text.length && startsBlock(lines[i]))) text.push(lines[i++].trim());
      out.push(`<p>${this.inline(text.join(' '))}</p>`);
    }
    return out.join('\n');
  }

  private heading(level: number, text: string): string {
    const id = this.prefix + (text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'heading');
    const heading = `<h${level} id="${attribute(id)}">${this.inline(text)}</h${level}>`;
    if (!this.anchors) return heading;
    // PRS-21: prose's wrapper, and after the heading a link to it that shows the glyph `link`, named with the
    // heading's text. A plain anchor stands in for the Link component.
    const name = attribute(`Link to: ${text}`);
    return `<div class="tanrei-prose-heading">${heading}<a class="tanrei-prose-anchor" href="#${attribute(id)}" aria-label="${name}"><span class="tanrei-icon" data-size="small" aria-hidden="true">link</span></a></div>`;
  }

  /**
   * A list that starts at `lines[start]`: its items are the lines with its marker at its indent, each with the lines
   * set in under it. It is loose (its items' text in paragraphs) when a blank line separates two of its items or two
   * blocks of one item. A list ends where the specimen begins another: at a line that is not set in, at a marker of
   * the other kind, at a number that does not follow the last one, or where task items begin or end.
   */
  private list(lines: string[], start: number): [string, number] {
    const first = ITEM.exec(lines[start])!;
    const indent = first[1].length;
    const ordered = /\d/.test(first[2]);
    const isTask = (text: string) => /^\[[ x]\] /.test(text);
    const task = isTask(first[3]);
    const items: string[][] = [];
    let number = ordered ? Number.parseInt(first[2], 10) : 0;
    let loose = false;
    let i = start;
    while (i < lines.length) {
      const item = ITEM.exec(lines[i]);
      if (!item || item[1].length !== indent || /\d/.test(item[2]) !== ordered || isTask(item[3]) !== task) break;
      if (ordered && items.length && Number.parseInt(item[2], 10) !== number + 1) break;
      if (ordered) number = Number.parseInt(item[2], 10);
      const content = indent + item[2].length + 1;
      const body = [item[3]];
      i++;
      while (i < lines.length) {
        if (!lines[i].trim()) {
          // A blank line belongs to the item when what follows it is set in under the item.
          let next = i;
          while (next < lines.length && !lines[next].trim()) next++;
          if (next < lines.length && /^ */.exec(lines[next])![0].length >= content) { body.push(''); i++; continue; }
          break;
        }
        if (/^ */.exec(lines[i])![0].length < content) break;
        body.push(lines[i].slice(content));
        i++;
      }
      if (body.includes('')) loose = true;
      items.push(body);
      // A blank line before the next item of this list makes the list loose.
      let next = i;
      while (next < lines.length && !lines[next].trim()) next++;
      const following = next < lines.length ? ITEM.exec(lines[next]) : null;
      const continues =
        !!following && following[1].length === indent && /\d/.test(following[2]) === ordered && isTask(following[3]) === task && (!ordered || Number.parseInt(following[2], 10) === number + 1);
      if (next > i && continues) { loose = true; i = next; }
    }
    const tag = ordered ? 'ol' : 'ul';
    const startAt = ordered && Number.parseInt(first[2], 10) !== 1 ? ` start="${Number.parseInt(first[2], 10)}"` : '';
    const html = items
      .map((body) => {
        const done = /^\[x\] /.test(body[0]);
        // remark-gfm writes the box without a name, which leaves a form control unnamed (axe's `label`); a stylesheet
        // cannot name it, so the specimen's renderer does what a product's must.
        const box = task ? `<input type="checkbox" disabled${done ? ' checked' : ''} aria-label="${done ? 'Completed task' : 'Incomplete task'}"> ` : '';
        const [head, ...rest] = task ? [body[0].slice(4), ...body.slice(1)] : body;
        // An item whose first block is a heading (steps' specimen: a step's title given as a heading, STP-6).
        const titled = task ? null : /^(#{1,6}) +(.*)$/.exec(head);
        if (titled) return `<li>\n${this.heading(titled[1].length, titled[2].trim())}\n${this.blocks(rest)}\n</li>`;
        // The item's own text runs to the first blank line or the first block set in under it.
        const text = [head];
        let k = 0;
        while (k < rest.length && rest[k].trim() && !startsBlock(rest[k])) text.push(rest[k++].trim());
        const inner = this.blocks(rest.slice(k));
        const own = box + this.inline(text.join(' '));
        return `<li${task ? ' class="task-list-item"' : ''}>${loose ? `<p>${own}</p>` : own}${inner ? `\n${inner}\n` : ''}</li>`;
      })
      .join('\n');
    return [`<${tag}${startAt}${task ? ' class="contains-task-list"' : ''}>\n${html}\n</${tag}>`, i];
  }

  /** The text of a block: code, links, footnote references, addresses, strong, emphasis, struck text, `<small>`. */
  inline(text: string): string {
    const held: string[] = [];
    const hold = (html: string) => `\u0000${held.push(html) - 1}\u0000`;
    let out = text.replace(/`([^`]+)`/g, (_, code: string) => hold(`<code>${escape(code)}</code>`));
    out = out.replace(/<(\/?)small>/g, (_, close: string) => hold(`<${close}small>`));
    // An anchor the specimen writes as a content pipeline writes it (the link that leaves the site, with
    // its mark's attribute, its words and the site's picture) passes through as it is; the picture's address is the
    // harness's own copy of the fixture picture.
    out = out
      .replace(/<a\s[^>]*>(?:<img\s[^>]*>)?/g, (open) => hold(open.replace(/src="(fixtures\/[^"]+)"/, (_, src: string) => `src="${fixturePicture(src)}"`)))
      .replace(/<\/a>/g, () => hold('</a>'));
    out = escape(out);
    out = out.replace(/\[\^([\w-]+)\]/g, (_, id: string) => {
      if (!this.referenced.includes(id)) this.referenced.push(id);
      const n = this.referenced.indexOf(id) + 1;
      return hold(`<sup><a href="#${this.prefix}user-content-fn-${id}" id="${this.prefix}user-content-fnref-${id}" data-footnote-ref aria-describedby="${this.prefix}footnote-label">${n}</a></sup>`);
    });
    // A web address the specimen writes in Markdown, or bare, is there for another reason than leaving the site (a
    // long address that must wrap): this pipeline writes it as not external, as the Link's fixtures of the same kind
    // say `external: off`, so that a specimen is drawn the same on a page with an address and on one without — the
    // package's script would otherwise find every web address external on a page written into a blank window (LNK-30).
    const web = (href: string) => (/^https?:\/\//i.test(href) ? ' data-external="false"' : '');
    out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label: string, href: string) => hold(`<a href="${attribute(href)}"${web(href)}>`) + label + hold('</a>'));
    out = out.replace(/https?:\/\/[^\s<]*[^\s<.,;:!?)]/g, (url) => hold(`<a href="${url.replaceAll('"', '&quot;')}" data-external="false">${url}</a>`));
    out = out.replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, (address) => hold(`<a href="mailto:${address}">${address}</a>`));
    out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>').replace(/~~([^~]+)~~/g, '<del>$1</del>');
    // eslint-disable-next-line no-control-regex
    return out.replace(/\u0000(\d+)\u0000/g, (_, index: string) => held[Number(index)]);
  }

  /** The notes the section refers to, as remark-gfm writes them: a labelled section, an ordered list, a back link each. */
  private footnotes(): string {
    if (!this.referenced.length) return '';
    const items = this.referenced
      .map((id, index) => {
        const back = `<a href="#${this.prefix}user-content-fnref-${id}" data-footnote-backref aria-label="Back to reference ${index + 1}" class="data-footnote-backref">↩</a>`;
        return `<li id="${this.prefix}user-content-fn-${id}">\n<p>${this.inline(this.notes.get(id) ?? '')} ${back}</p>\n</li>`;
      })
      .join('\n');
    return `\n<section data-footnotes class="footnotes"><h2 class="sr-only" id="${this.prefix}footnote-label">Footnotes</h2>\n<ol>\n${items}\n</ol>\n</section>`;
  }
}
