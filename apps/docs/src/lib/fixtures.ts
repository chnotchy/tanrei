// How the Specs tab draws a spec fixture live, read from the spec alone (no list of components kept by hand).
//
// A fixture is the component's canonical rendering, and some are *presented*: their `open` (or `expanded`) is true. On a
// documentation page that is a problem, because a presented modal overlay covers the page, makes it inert and moves focus
// the moment the page loads. So each fixture is given a presentation here:
//
// - `overlay`: it presents over the window (a modal or full-screen value on a presentation axis, or a dialog-role
//   component with no such axis). It is drawn closed, with an opener that presents that exact fixture; the controller
//   in ../components/ComponentSpecs.astro closes it again from the component's own close events.
// - `check`: presented and not over the window (a docked picker, a menu, a standard sheet or drawer, a tooltip). It is
//   drawn open but hidden — in place, with the web's `inline` attribute where the spec's web notes declare one — and the
//   controller shows it if it stays inside its cell or inside a stage that stands for the window, and otherwise closes
//   it and gives it an opener, as an overlay.
// - `none`: not presented. It is drawn as it is; if the component has an open state, its events still drive it.
import { definedTags, getSpec, specs, webAttribute, webAttributeValues, webReadsAttribute, type FixtureItem, type Spec } from './repo';
// The avatar's fixtures name their picture `fixtures/avatar.png`, which each platform's harness resolves to its own
// copy: here the web package's (flat shapes, no person), inlined, so a page of fixtures asks the network for nothing.
import avatarPicture from '../../../../packages/web/test/fixtures/avatar.png?inline';
// The link card's fixtures name `fixtures/link-card.png` and `fixtures/site-icon.png` the same way; the page holds
// them, so no fixture makes a request (the card asks for nothing but the pictures it is given — LKC-14).
import linkCardPicture from '../../../../packages/web/test/fixtures/link-card.png?inline';
import siteIconPicture from '../../../../packages/web/test/fixtures/site-icon.png?inline';
import chatComposerPhoto1 from '../../../../packages/web/test/fixtures/chat-composer-photo-1.png?inline';
import chatComposerPhoto2 from '../../../../packages/web/test/fixtures/chat-composer-photo-2.png?inline';
import chatComposerPhoto3 from '../../../../packages/web/test/fixtures/chat-composer-photo-3.png?inline';
// The image preview's fixtures name six pictures the same way (and `fixtures/pending.png`, below); the page holds them.
import previewLandscape from '../../../../packages/web/test/fixtures/image-preview-landscape.png?inline';
import previewPortrait from '../../../../packages/web/test/fixtures/image-preview-portrait.png?inline';
import previewSquare from '../../../../packages/web/test/fixtures/image-preview-square.png?inline';
import previewTall from '../../../../packages/web/test/fixtures/image-preview-tall.png?inline';
import previewSmall from '../../../../packages/web/test/fixtures/image-preview-small.png?inline';
import previewThumbnail from '../../../../packages/web/test/fixtures/image-preview-landscape-thumbnail.png?inline';

type Value = string | boolean | number | string[];
type Props = Record<string, Value>;
type Fixture = Spec['fixtures'][number] & { slots?: Record<string, string | string[]>; direction?: 'ltr' | 'rtl' };
type SlotDecl = { name: string; description: string; fixture?: 'glyph' | 'icon-only-button' | 'button' | 'text' };

/** `inplace` is decided in the browser, from a `check`. */
export type Presentation = 'overlay' | 'check' | 'none';

export interface LiveFixture {
  /** The element, its items and slotted children, as HTML. */
  html: string;
  presentation: Presentation;
  /** Drawn with the web's `inline` attribute. */
  inline: boolean;
  /** The web property that presents the component (`open`, `expanded`), when it has one. */
  openProp?: string;
  /** Web event names that end the presentation (the spec's `close` and `dismiss`). */
  closeEvents: string[];
  /** Web event names that ask for a new presented state in `detail.open` / `detail.expanded` (the spec's `toggle`). */
  toggleEvents: string[];
}

/** Props whose value is what the spec calls presenting the component. */
const PRESENCE = ['open', 'expanded'];
/** Values of a presentation axis that place the component over the window. */
const OVER_WINDOW = ['modal', 'full-screen'];

const escape = (v: string) => v.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const kebab = (name: string) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/**
 * Props as attributes of the element `tag`, as the web package's fixture harness writes them. The attribute of a spec
 * prop is the one the element's manifest declares for the web's name of it (`readOnly` is `readonly` and `maxLength`
 * `maxlength`, as in HTML), and the kebab-case of that name where the manifest does not know it. `true` is the bare
 * attribute and `false` none — except a boolean that defaults to true: where the manifest gives it an attribute that
 * says the opposite (`inset: false` is `flush`, `handle: false` is `no-handle`), `false` is that attribute, bare, and
 * `true` none; where it does not, only `name="false"` turns it off.
 */
function attributes(tag: string, declared: Spec['props'], web: Record<string, string> | undefined, props: Props): string {
  const defaultsTrue = new Set(declared.filter((p) => p.type === 'boolean' && p.default === true).map((p) => p.name));
  return Object.entries(props)
    .filter(([k, v]) => v !== false || defaultsTrue.has(k))
    .map(([k, v]) => {
      const property = web?.[k] ?? k;
      const attribute = webAttribute(tag, property);
      const name = attribute?.name ?? kebab(property);
      if (attribute?.inverse && typeof v === 'boolean') return v ? '' : ` ${name}`;
      if (v === true) return ` ${name}`;
      return ` ${name}="${escape(Array.isArray(v) ? JSON.stringify(v) : String(v))}"`;
    })
    .join('');
}

/** An item of a kind that is another component, which may fill that component's slots (a Field's select or combobox: its leading glyph). */
type OwningItem = FixtureItem & { slots?: Record<string, string | string[]> };
/** An item kind as a spec writes it: `component` names the component the kind is, where it is one. */
type ItemKind = NonNullable<Spec['items']>[number] & { component?: string };
const kindOf = (spec: Spec, item: FixtureItem): ItemKind | undefined => spec.items?.find((each) => each.name === item.kind);

function itemsHtml(spec: Spec, items: FixtureItem[]): string {
  return items
    .map((item) => {
      const kind = kindOf(spec, item);
      const web = spec.platforms.web?.items?.[item.kind];
      if (!kind || !web) return '';
      // A prop the web mapping puts in a slot (`"icon": "slot=\"icon\""`: a tag group's tag and chip, a button group's
      // Button) is a child in that slot — a glyph's ligature text — and no attribute, as the web package's harness writes it.
      const slotOf = (name: string) => /^slot="([^"]+)"$/.exec(web.props?.[name] ?? '')?.[1];
      const slotted = Object.entries(item.props).filter(([name, value]) => slotOf(name) && typeof value === 'string' && value !== '');
      const props = Object.fromEntries(Object.entries(item.props).filter(([name]) => !slotOf(name)));
      const glyphs = slotted.map(([name, value]) => `<span slot="${slotOf(name)}">${escape(String(value))}</span>`).join('');
      // A file upload or a file picker as another component's item (a field's control): its content is the label of its
      // trigger, the product's own Button in the trigger slot, as the web package's harness writes it.
      // A text input as another component's item (a field's control, the twin of a text field's fixture): its content
      // names its icons, and its `wrap` is the attribute that says the opposite, as for the text input's own fixtures.
      const triggered = [getSpec('file-upload').platforms.web?.name, getSpec('file-picker').platforms.web?.name].includes(web.name);
      const textInput = web.name === getSpec('text-input').platforms.web?.name;
      // And what it was given as entered already (`entries`, `entryRemoveLabel` — read here from the
      // item, and no props of the text input): one small input chip for each, in its entries slot, before its icons.
      // A combobox as another component's item (a field's control, the twin of a combobox field's fixture): its
      // `chevron` is the attribute that says the opposite, and an open one draws its list in place, as for the
      // combobox's own fixtures (`comboboxProps`).
      const combobox = web.name === getSpec('combobox').platforms.web?.name;
      // A number input as another component's item (a field's control, the twin of a number field's fixture): its
      // `steppers` is the attribute that says the opposite, as for the number input's own fixtures.
      const numberInput = web.name === getSpec('number-input').platforms.web?.name;
      // A select as another component's item (a field's control, the twin of a select field's fixture) whose list is
      // open draws it in place (the web's `inline` attribute), as an open fixture of the select itself is drawn: a
      // list in the top layer would cover the page it is documented on.
      const select = web.name === getSpec('select').platforms.web?.name;
      const content = triggered ? `<tanrei-button slot="trigger" variant="outlined">${escape(item.content ?? '')}</tanrei-button>` : textInput ? `${entryChips(item.props)}${textInputIcons(item.content ?? '')}` : escape(item.content ?? '');
      // An item that is another component may hold that component's own items and fill its slots (a
      // field's select or combobox holds its options and its leading glyph): they are written as that component's own fixtures
      // write them, from that component's spec.
      const owned = (item as OwningItem).slots;
      const member = kind.component && ((item.items?.length && !spec.items?.some((k) => k.name === item.items![0].kind)) || owned) ? getSpec(kind.component) : undefined;
      const inner = `${item.items ? itemsHtml(member ?? spec, item.items) : ''}${member && owned ? slotsHtml(member, owned, false) : ''}${glyphs}${content}`;
      return `<${web.name}${attributes(web.name, kind.props, web.props, textInput ? withoutEntries(textInputProps(props)) : select && props.open === true ? { ...props, inline: true } : combobox ? comboboxProps(props, true) : numberInput ? numberInputProps(props) : props)}>${inner}</${web.name}>`;
    })
    .join('');
}

/**
 * A table fixture's items as the native table its element holds, as the web package's fixture harness writes it
 * (`tableMarkup` in packages/web/test/harness.ts): the fixture's `caption` as the `<caption>`, the columns as one
 * `<thead>` row of `<th scope="col">` — none where every header is empty — the rows as `<tbody>` rows and the footer
 * rows as `<tfoot>` rows, a cell as a `<td>`, or a `<th scope="row">` where it is the first of its row and `rowHeaders`
 * is true. A column's `align` and `wrap` are `data-align` and `data-wrap="false"` on its header cell and on each of its
 * cells; a cell's own items (a tag) are their components' elements. `suffix` is what tells this fixture's name from
 * another's on the page (see `tableName`): read, not drawn.
 *
 * The data features the web has built, as the package's README
 * writes them: a sortable column's header cell carries `aria-sort` (its `sort`, `none` where it has none) and
 * `data-value` and holds a `<button type="button">` around the header; the `empty` slot's text is the one cell of a
 * `<tr data-part="empty">` in the body of a fixture without body rows, in a `<div>` (what the table keeps in view is
 * an element); the fixture's `status` and its `pagination` slot's text are the `<p role="status">` and a `<span>` of a
 * `<div data-part="status">` after the table. Rows that can be chosen (`selection: multiple`, or `single`): every row begins with
 * a `<td data-part="selection">` — in the header row holding a `<tanrei-checkbox label-hidden>`, which the element
 * names and keeps in step; in a body row that has a `value` holding that row's, named by its `selectLabel` and
 * `checked` where the row is `selected`; and empty in a row without a value, a placeholder row and a footer row. A
 * row's `value` is `data-value` and its `selected` is `data-selected` on the `<tr>`; a `placeholder` row is `<tr
 * data-placeholder aria-hidden="true">`.
 */
function tableHtml(spec: Spec, fixture: Fixture, suffix: string): string {
  const items = fixture.items ?? [];
  const columns = items.filter((item) => item.kind === 'column');
  const rows = items.filter((item) => item.kind === 'row');
  const placed = (index: number) => {
    const { align, wrap } = (columns[index]?.props ?? {}) as Props;
    return `${align && align !== 'start' ? ` data-align="${escape(String(align))}"` : ''}${wrap === false ? ' data-wrap="false"' : ''}`;
  };
  const chooses = fixture.props.selection === 'multiple' || fixture.props.selection === 'single';
  // TBL-60: one row at most is chosen by a radio button, all of one name, which the product gives — here, the fixture's.
  const single = fixture.props.selection === 'single';
  /** The selection cell of a row (TBL-42): the row's checkbox — or radio button (TBL-60) — where it has a value, else nothing. */
  const choice = (item: FixtureItem) => {
    if (!chooses) return '';
    const { value, selected, selectLabel, placeholder, footer } = item.props as Props;
    if (!value || placeholder === true || footer === true) return '<td data-part="selection"></td>';
    const tag = single ? 'tanrei-radio-button' : 'tanrei-checkbox';
    return `<td data-part="selection"><${tag} label-hidden${single ? ` name="${escape(fixture.id)}"` : ''}${selectLabel ? ` label="${escape(String(selectLabel))}"` : ''}${selected === true ? ' checked' : ''}></${tag}></td>`;
  };
  const state = (item: FixtureItem) => {
    const { value, selected, placeholder } = item.props as Props;
    return `${value ? ` data-value="${escape(String(value))}"` : ''}${chooses && value && selected === true ? ' data-selected' : ''}${placeholder === true ? ' data-placeholder aria-hidden="true"' : ''}`;
  };
  const row = (item: FixtureItem) =>
    `<tr${state(item)}>${choice(item)}${(item.items ?? [])
      .map((cell, index) => {
        const inner = `${escape(cell.content ?? '')}${cell.items ? itemsHtml(spec, cell.items) : ''}`;
        return index === 0 && fixture.props.rowHeaders === true ? `<th scope="row"${placed(index)}>${inner}</th>` : `<td${placed(index)}>${inner}</td>`;
      })
      .join('')}</tr>`;
  const caption = fixture.props.caption ? `<caption>${escape(String(fixture.props.caption))}${suffix ? `<span style="${UNDRAWN}">${escape(suffix)}</span>` : ''}</caption>` : '';
  const header = (column: FixtureItem, index: number) => {
    const text = escape(String(column.props.header ?? ''));
    if (column.props.sortable !== true || !text) return `<th scope="col"${placed(index)}>${text}</th>`;
    const value = column.props.value ? ` data-value="${escape(String(column.props.value))}"` : '';
    return `<th scope="col" aria-sort="${escape(String(column.props.sort ?? 'none'))}"${value}${placed(index)}><button type="button">${text}</button></th>`;
  };
  const all = single ? '<td data-part="selection"></td>' : chooses ? '<td data-part="selection"><tanrei-checkbox label-hidden></tanrei-checkbox></td>' : '';
  const head = columns.some((column) => column.props.header) ? `<thead><tr>${all}${columns.map(header).join('')}</tr></thead>` : '';
  const body = rows.filter((item) => item.props.footer !== true);
  const foot = rows.filter((item) => item.props.footer === true);
  const slot = (name: string) => [fixture.slots?.[name] ?? []].flat()[0];
  const empty = slot('empty');
  const none = empty !== undefined && !body.length ? `<tr data-part="empty"><td colspan="${columns.length + (chooses ? 1 : 0)}"><div>${escape(empty)}</div></td></tr>` : '';
  const status = String(fixture.props.status ?? '');
  const pagination = slot('pagination');
  const line =
    status || pagination !== undefined
      ? `<div data-part="status">${status ? `<p role="status">${escape(status)}</p>` : ''}${pagination === undefined ? '' : `<span>${escape(pagination)}</span>`}</div>`
      : '';
  return `<table>${caption}${head}<tbody>${body.map(row).join('')}${none}</tbody>${foot.length ? `<tfoot>${foot.map(row).join('')}</tfoot>` : ''}</table>${line}`;
}

/**
 * What a table fixture adds to its name on this page: a table that scrolls in its own box is a region, and a page has
 * one landmark of a kind per name, while several fixtures share a caption. Such a fixture is named after its id too.
 */
function tableName(spec: Spec, fixture: Fixture): string {
  const name = (f: Fixture) => String(f.props.caption ?? f.props.label ?? '');
  return name(fixture) && spec.fixtures.filter((other) => name(other as Fixture) === name(fixture)).length > 1 ? ` (${fixture.id})` : '';
}

/** Read and not drawn (the fixture's HTML is set whole, outside any component's scoped styles). */
const UNDRAWN = 'position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap';

/** The spec whose items this renderer writes as a native table. */
const isTable = (spec: Spec) => spec.name === 'table';

/**
 * A description list fixture's items as the native list its element holds, as the web package's fixture harness writes
 * it (`descriptionListMarkup` in packages/web/test/harness.ts): each `fact` a `<div>` around a `<dt>` — its `term` —
 * and its `<dd>`s: one for the fact's own content (an empty one for empty content), or one for each `value` item, which
 * holds its content or its own items (a tag) as their components' elements.
 */
function descriptionListHtml(spec: Spec, fixture: Fixture): string {
  const value = (item: FixtureItem) => `<dd>${escape(item.content ?? '')}${item.items ? itemsHtml(spec, item.items) : ''}</dd>`;
  const fact = (item: FixtureItem) =>
    `<div><dt>${escape(String(item.props.term ?? ''))}</dt>${item.items ? item.items.map(value).join('') : `<dd>${escape(item.content ?? '')}</dd>`}</div>`;
  return `<dl>${(fixture.items ?? []).map(fact).join('')}</dl>`;
}
const isDescriptionList = (spec: Spec) => spec.name === 'description-list';

/** What stands for a picture and for the product's joined block in a figure fixture: the web harness's own staging, as inline styles. */
const FIGURE_SPECIMEN = 'font: var(--tanrei-sys-typescale-body-font)';
const FIGURE_PICTURE =
  'display: grid; place-items: center; box-sizing: border-box; inline-size: 100%; block-size: 10rem; background: var(--tanrei-sys-color-surface-container-highest); color: var(--tanrei-sys-color-on-surface-variant); font: var(--tanrei-sys-typescale-body-small-font)';
const FIGURE_ATTACHMENT =
  'padding: var(--tanrei-sys-space-space150) var(--tanrei-sys-space-space200); border-radius: var(--tanrei-sys-shape-corner-small); background: var(--tanrei-sys-color-surface-container-high); color: var(--tanrei-sys-color-on-surface); font: var(--tanrei-sys-typescale-code-font); overflow-wrap: anywhere; white-space: normal';

/**
 * A figure fixture as the native figure its element holds, as the web package's fixture harness writes it
 * (`figureMarkup` in packages/web/test/harness.ts): a frame around the header — the title as a `<p data-part="title">`,
 * from the `title` prop or the `title` slot, and the `actions` slot's glyphs as icon-only text Buttons — the stage and
 * the `attachment` slot's text; then the caption, from the `caption` prop or the `caption` slot, as the `<figcaption>`.
 * "Picture" stands for a picture and is drawn as a block with a size and a fill.
 */
function figureHtml(fixture: Fixture): string {
  const several = (value: string | string[] | undefined) => (value === undefined ? [] : Array.isArray(value) ? value : [value]);
  const slots = fixture.slots ?? {};
  const button = getSpec('button').platforms.web?.name;
  const title = several(slots.title)[0] ?? (fixture.props.title as string | undefined);
  const caption = several(slots.caption)[0] ?? (fixture.props.caption as string | undefined);
  const actions = several(slots.actions).map((glyph) => `<${button} variant="text" label="${escape(glyph)}"><span slot="icon">${escape(glyph)}</span></${button}>`);
  const attachment = several(slots.attachment)[0];
  const header = title || actions.length ? `<header>${title ? `<p data-part="title">${escape(title)}</p>` : ''}${actions.length ? `<div data-part="actions">${actions.join('')}</div>` : ''}</header>` : '';
  const content = fixture.content ?? '';
  const shown = content === 'Picture' ? `<div style="${FIGURE_PICTURE}">Picture</div>` : `<span style="${FIGURE_SPECIMEN}">${escape(content)}</span>`;
  const joined = attachment === undefined ? '' : `<div data-part="attachment"><div style="${FIGURE_ATTACHMENT}">${escape(attachment)}</div></div>`;
  return `<figure><div data-part="frame">${header}<div data-part="stage">${shown}</div>${joined}</div>${caption ? `<figcaption>${escape(caption)}</figcaption>` : ''}</figure>`;
}
const isFigure = (spec: Spec) => spec.name === 'figure';

/**
 * A skeleton fixture's items as the placeholders its element holds, as the web package's fixture harness writes them
 * (packages/web/test/harness.ts): each an empty `<span class="tanrei-skeleton-placeholder">` with its shape and
 * lines as `data-shape` and `data-lines` and its sizes as the CSS properties `inline-size` and `block-size`, a
 * number being that many CSS pixels.
 */
function skeletonHtml(fixture: Fixture): string {
  return (fixture.items ?? [])
    .map(({ props }) => {
      const sizes = [props.inlineSize === undefined ? '' : `inline-size: ${String(props.inlineSize)}px`, props.blockSize === undefined ? '' : `block-size: ${String(props.blockSize)}px`].filter(Boolean).join('; ');
      return `<span class="tanrei-skeleton-placeholder"${props.shape === undefined ? '' : ` data-shape="${escape(String(props.shape))}"`}${props.lines === undefined ? '' : ` data-lines="${escape(String(props.lines))}"`}${sizes ? ` style="${sizes}"` : ''}></span>`;
    })
    .join('');
}
const isSkeleton = (spec: Spec) => spec.name === 'skeleton';

/**
 * An accordion fixture's items as the native `details` elements its element holds, as the web package's fixture
 * harness writes them (`accordionMarkup` in packages/web/test/harness.ts): each item a `<details>` — `open` where the
 * item is — whose `<summary>` holds the icon as a `.tanrei-icon`, the label as its text, the supporting text in a
 * `data-supporting-text` element and the trailing text in a `data-trailing-text` one; a disabled item's summary
 * carries `aria-disabled="true"` and `tabindex="-1"`; the item's content is the text after the summary.
 */
function accordionHtml(fixture: Fixture): string {
  return (fixture.items ?? [])
    .map((item) => {
      const p = item.props as Props;
      const icon = p.icon ? `<span class="tanrei-icon" aria-hidden="true">${escape(String(p.icon))}</span>` : '';
      const supporting = p.supportingText ? `<span data-supporting-text>${escape(String(p.supportingText))}</span>` : '';
      const trailing = p.trailingText ? `<span data-trailing-text>${escape(String(p.trailingText))}</span>` : '';
      return `<details${p.open === true ? ' open' : ''}><summary${p.disabled === true ? ' aria-disabled="true" tabindex="-1"' : ''}>${icon}${escape(String(p.label ?? ''))}${supporting}${trailing}</summary>${escape(item.content ?? '')}</details>`;
    })
    .join('');
}

/** The spec whose items this renderer writes as native `details` elements. */
const isAccordion = (spec: Spec) => spec.name === 'accordion';

/**
 * A table of contents fixture's items as the product's own nested list of anchors, as the web package's fixture harness
 * writes them (`tableOfContentsMarkup` in packages/web/test/harness.ts): each item an `<li>` whose first child is its
 * anchor — `href` the anchor's attribute, the label its text — with the item's own items a `<ul>` after the anchor,
 * inside the same `<li>`.
 */
function tableOfContentsHtml(items: FixtureItem[]): string {
  return `<ul>${items.map((item) => `<li><a href="${escape(String((item.props as Props).href ?? ''))}">${escape(String((item.props as Props).label ?? ''))}</a>${item.items?.length ? tableOfContentsHtml(item.items) : ''}</li>`).join('')}</ul>`;
}

/** The spec whose items this renderer writes as a nested list of anchors. */
const isTableOfContents = (spec: Spec) => spec.name === 'table-of-contents';

/**
 * A breadcrumbs fixture's items as the product's own children of the element, as the web package's fixture harness
 * writes them (`breadcrumbsMarkup` in packages/web/test/harness.ts): an `<a href>` for a level with a destination and a
 * `<span>` for one without, the label its text, `aria-current="page"` on the current page, `data-icon` and
 * `data-icon-only` for a glyph. A fixture's destinations are another product's pages: each is drawn as a place on this
 * page (`#`), so that a level that is pressed leads nowhere else.
 */
function breadcrumbsHtml(items: FixtureItem[]): string {
  return items
    .map((item) => {
      const props = item.props as Props;
      const tag = props.href ? 'a' : 'span';
      const attrs = [props.href ? ' href="#"' : '', props.current ? ' aria-current="page"' : '', props.icon ? ` data-icon="${escape(String(props.icon))}"` : '', props.iconOnly ? ' data-icon-only' : ''].join('');
      return `<${tag}${attrs}>${escape(String(props.label ?? ''))}</${tag}>`;
    })
    .join('');
}
const isBreadcrumbs = (spec: Spec) => spec.name === 'breadcrumbs';

/**
 * A menubar fixture's items as the bar's children, as the web package's fixture harness writes them (`menubarMarkup` in
 * packages/web/test/harness.ts): a menu and an action are their elements with their props as attributes; a link item —
 * an `item` with an `href` — is its element around the product's own anchor, the label the anchor's text, with
 * `target="_blank"` for a new context and `aria-current="page"` on the anchor, and `target-label` and `disabled` on the
 * element (a disabled link item's anchor has no `href`). A fixture's destinations are another product's pages: each is
 * drawn as a place on this page (`#`), so that a link item that is pressed leads nowhere else.
 */
function menubarHtml(spec: Spec, items: FixtureItem[]): string {
  return items
    .map((item) => {
      const { label, href, target, targetLabel, current, disabled, ...rest } = item.props as Props;
      const kind = spec.items?.find((k) => k.name === item.kind);
      const web = spec.platforms.web?.items?.[item.kind];
      if (item.kind !== 'item' || !href || !kind || !web) return itemsHtml(spec, [item]);
      const host = attributes(web.name, kind.props, web.props, { ...rest, ...(disabled ? { disabled } : {}), ...(targetLabel ? { targetLabel } : {}) });
      const anchor = [disabled ? '' : ' href="#"', target === 'new' ? ' target="_blank"' : '', current ? ' aria-current="page"' : ''].join('');
      return `<${web.name}${host}><a${anchor}>${escape(String(label ?? ''))}</a></${web.name}>`;
    })
    .join('');
}
const isMenubar = (spec: Spec) => spec.name === 'menubar';

/**
 * A tree view fixture's items as the product's own nested lists, as the web package's fixture harness writes them
 * (`treeViewMarkup` in packages/web/test/harness.ts): each item an `<li>` — with `data-value`, `data-open`,
 * `data-expandable`, `data-loading` and `data-disabled` where the item has them — whose first child is its row, a
 * `<span>` holding the icon as a `.tanrei-icon` (its open icon in `data-open-icon`), the label in a `<bdi>` with the
 * supporting text after it in a `data-supporting-text` element, and the trailing text in a `data-trailing-text` one; the item's own items are a
 * `<ul>` after the row, inside the same `<li>`, to any depth.
 */
function treeViewHtml(items: FixtureItem[]): string {
  return `<ul>${items
    .map((item) => {
      const p = item.props as Props;
      const flags = ['open', 'expandable', 'loading', 'disabled'].map((name) => (p[name] === true ? ` data-${name}` : '')).join('');
      const icon = p.icon ? `<span class="tanrei-icon" aria-hidden="true"${p.openIcon ? ` data-open-icon="${escape(String(p.openIcon))}"` : ''}>${escape(String(p.icon))}</span>` : '';
      const supporting = p.supportingText ? `<small data-supporting-text>${escape(String(p.supportingText))}</small>` : '';
      const trailing = p.trailingText ? `<span data-trailing-text>${escape(String(p.trailingText))}</span>` : '';
      return `<li${p.value ? ` data-value="${escape(String(p.value))}"` : ''}${flags}${p.supportingPosition === 'inline' ? ' data-supporting-position="inline"' : ''}><span>${icon}<bdi>${escape(String(p.label ?? ''))}${supporting}</bdi>${trailing}</span>${item.items?.length ? treeViewHtml(item.items) : ''}</li>`;
    })
    .join('')}</ul>`;
}

/** The spec whose items this renderer writes as nested lists of rows. */
const isTreeView = (spec: Spec) => spec.name === 'tree-view';

/**
 * A page header fixture as the page's own elements its element holds, as the web package's fixture harness writes it
 * (`pageHeaderMarkup` in packages/web/test/harness.ts), in reading order: the `breadcrumbs` slot's text in
 * `[data-part="breadcrumbs"]`, the eyebrow as `<p data-part="eyebrow">`, the title — prop or slot — as the heading of
 * its level (`level`, or 1, or 2 for the small size), the description as a `<p>`, each meta item as a `<span>` in
 * `[data-part="meta"]`, and the `actions` slot's labels as text Buttons in `[data-part="actions"]`.
 */
function pageHeaderHtml(fixture: Fixture): string {
  const one = (value: string | string[] | undefined) => (value === undefined ? '' : Array.isArray(value) ? value.join(' ') : value);
  const many = (value: string | string[] | undefined) => (value === undefined ? [] : Array.isArray(value) ? value : [value]);
  const props = fixture.props as Props;
  const slots = (fixture.slots ?? {}) as Record<string, string | string[]>;
  const title = one(slots.title) || String(props.title ?? '');
  const description = one(slots.description) || String(props.description ?? '');
  const level = Number(props.level) >= 1 && Number(props.level) <= 6 ? Number(props.level) : props.size === 'small' ? 2 : 1;
  const button = getSpec('button').platforms.web?.name ?? 'button';
  return [
    slots.breadcrumbs === undefined ? '' : `<div data-part="breadcrumbs">${escape(one(slots.breadcrumbs))}</div>`,
    props.eyebrow ? `<p data-part="eyebrow">${escape(String(props.eyebrow))}</p>` : '',
    title ? `<h${level}>${escape(title)}</h${level}>` : '',
    description ? `<p>${escape(description)}</p>` : '',
    fixture.items?.length ? `<div data-part="meta">${fixture.items.map((item) => `<span>${escape(item.content ?? '')}</span>`).join('')}</div>` : '',
    slots.actions === undefined ? '' : `<div data-part="actions">${many(slots.actions).map((label) => `<${button} variant="text">${escape(label)}</${button}>`).join('')}</div>`,
  ].join('');
}
const isPageHeader = (spec: Spec) => spec.name === 'page-header';

/**
 * The spec whose fixtures are whole windows: the app shell reads the window's width and nothing else (APS-2), and its
 * frame is as tall as the window. Drawn in a cell of this page each would be the class of this page's window, not of
 * its own, and would give this page's root its scroll offset: they are listed without a live drawing until a fixture
 * can state its stage.
 */
const isAppShell = (spec: Spec) => spec.name === 'app-shell';

/**
 * The avatar: one spec that is two elements on the web (its web note). A fixture with members is the group element —
 * the avatar's tag with `-group` — around members that are the avatar's own element, which `itemsHtml` writes; a
 * fixture without is the avatar. Writing every fixture with the spec's one web name would draw avatars inside an
 * avatar.
 */
const isAvatar = (spec: Spec) => spec.name === 'avatar';
const AVATAR_PICTURE = 'src="fixtures/avatar.png"';
/** The picture that must not exist (the avatar's `image-failed`): bytes no decoder reads, as for the link card — the name itself would be asked of the site, on every load of the page, and answered 404. */
const AVATAR_MISSING: [string, string] = ['src="fixtures/missing.png"', 'src="data:image/png;base64,AAAA"'];

/**
 * The link card: an element with no shadow root that builds its anchor from its attributes where it holds none (its
 * web note), so a fixture is the element with its props. Its pictures are the package's own copies, and
 * `fixtures/missing.png` — the picture that must not exist — bytes no decoder reads, as the web's harness gives it.
 */
const isLinkCard = (spec: Spec) => spec.name === 'link-card';
const LINK_CARD_PICTURES: [string, string][] = [
  ['="fixtures/link-card.png"', `="${linkCardPicture}"`],
  ['="fixtures/site-icon.png"', `="${siteIconPicture}"`],
  ['="fixtures/missing.png"', '="data:image/png;base64,AAAA"'],
];

/**
 * The image preview: its pictures are the package's own copies, as the web's harness gives them
 * (packages/web/test/pictures.ts) — `fixtures/missing.png` bytes no decoder reads, and `fixtures/pending.png`, the
 * picture that never arrives, the address of no picture at all: an image without one is asked for nothing and waits,
 * and a request that is never answered would keep this page's own `load` from ever coming.
 */
/** The chat composer: the pictures of its tiles are the package's own copies, inline, as the web's harness gives them. */
const CHAT_COMPOSER_PICTURES: [string, string][] = [
  ['="fixtures/chat-composer-photo-1.png"', `="${chatComposerPhoto1}"`],
  ['="fixtures/chat-composer-photo-2.png"', `="${chatComposerPhoto2}"`],
  ['="fixtures/chat-composer-photo-3.png"', `="${chatComposerPhoto3}"`],
  // A fixture's string in the send or the stop slot is a labelled Button of the filled variant (the spec's notes).
  ['slot="send" variant="text"', 'slot="send" variant="filled"'],
  ['slot="stop" variant="text"', 'slot="stop" variant="filled"'],
];
/**
 * The attribute that marks an embedded text input's `held-` fixture (the spec's "The sample holder"): the Specs tab
 * draws the product's own box around it — a visible box and its padding, and the focus indication on the box for as
 * long as the input has focus — as the web's harness draws it (`sampleHolderCss` in packages/web/test/harness.ts). The
 * box is the page's (`.fixture-element` in components/ComponentSpecs.astro), never the element's.
 */
export const HELD = 'data-fixture-holder';
const IMAGE_PREVIEW_PICTURES: [string, string][] = [
  ['="fixtures/image-preview-landscape.png"', `="${previewLandscape}"`],
  ['="fixtures/image-preview-portrait.png"', `="${previewPortrait}"`],
  ['="fixtures/image-preview-square.png"', `="${previewSquare}"`],
  ['="fixtures/image-preview-tall.png"', `="${previewTall}"`],
  ['="fixtures/image-preview-small.png"', `="${previewSmall}"`],
  ['="fixtures/image-preview-landscape-thumbnail.png"', `="${previewThumbnail}"`],
  ['="fixtures/missing.png"', '="data:image/png;base64,AAAA"'],
  ['="fixtures/pending.png"', '=""'],
];

/**
 * Whether this renderer can draw a spec's fixtures. It writes each item as one element named by the web's mapping,
 * its props as attributes and its children inside it. That is not the markup of three kinds of spec, whose fixtures are
 * listed without a live drawing until the renderer learns their markup:
 *
 * - one whose containers nest two deep — except the table's, whose rows hold cells and whose markup (a native
 *   table's sections, rows and cells) `tableHtml` writes, and the description list's, whose facts hold values and
 *   whose markup (a native list's groups, terms and values) `descriptionListHtml` writes;
 * - one whose items are the product's own native elements — except the accordion's `details`, whose label is a
 *   `summary` inside it and not an attribute, and which `accordionHtml` writes; the code block's runs, whose text is
 *   a `span`'s content; a trail's anchors — and except the table of contents' `li`, whose anchor and nested list
 *   `tableOfContentsHtml` writes (its items also nest as deep as the page's headings do), and the tree view's `li`,
 *   whose row and nested lists `treeViewHtml` writes to any depth. The web's mapping says so itself: it names a native element for the kind
 *   (a lower-case name without a hyphen), where a custom element has a hyphen and a render function a capital;
 * - one whose items are whatever the product puts in a part, which the web's mapping names by a selector and not by an
 *   element, so there is no tag to write — except the page header's meta items (`[data-part="meta"] > *`), which
 *   `pageHeaderHtml` writes with the rest of the head's own elements.
 *
 * And not one whose fixtures are whole windows (`isAppShell`).
 */
export function drawsLive(spec: Spec): boolean {
  // The spec's own containers: an item that is another component holds that component's items, which
  // is no nesting of this spec's kinds — `drawsFixture` lists such a fixture without a drawing by itself.
  const containers = new Set((spec.items ?? []).filter((kind) => kind.container).map((kind) => kind.name));
  const nested = spec.fixtures.some((fixture) => (fixture.items ?? []).some((item) => containers.has(item.kind) && (item.items ?? []).some((child) => child.items)));
  const mapped = Object.values(spec.platforms.web?.items ?? {});
  const native = mapped.some((item) => /^[a-z][a-z0-9]*$/.test(item.name));
  const unnamed = mapped.some((item) => !/^[A-Za-z][A-Za-z0-9-]*$/.test(item.name));
  if (isAppShell(spec)) return false;
  return isTable(spec) || isDescriptionList(spec) || isSkeleton(spec) || isAccordion(spec) || isTableOfContents(spec) || isTreeView(spec) || isPageHeader(spec) || isBreadcrumbs(spec) || (!nested && !native && !unnamed);
}

/** What any element may carry and no manifest lists: this renderer's own staging, a child's `slot`, and the two open families. */
const isGlobalAttribute = (name: string) => ['class', 'style', 'dir', 'lang', 'slot'].includes(name) || name.startsWith('data-') || name.startsWith('aria-');

/**
 * Whether the installed web build can draw one fixture of a spec that is drawn live. A spec is accepted before the web
 * builds it (the web is `lagging` until it has), and a fixture that gives a prop the
 * element has no attribute for would be drawn as if the prop were not given — a picture of a state the spec does not
 * describe. Such a fixture is listed without a live drawing. No fixture is named here: the rule reads the manifest of
 * the installed build, so a fixture is drawn from the build that declares what it gives, and
 * `test/fixtures.test.mjs` holds the list of those that wait.
 *
 * A fixture that gives an attribute a value the element does not read yet waits the same way: where the manifest
 * declares an attribute's values as a closed list, a value outside it would be drawn as another value's picture.
 *
 * And so does a fixture that holds an element the installed build does not define at all — a Field around a control
 * that is accepted and not yet built (a color input given no prop writes no attribute to tell it by) — and one whose
 * item is another component that holds items or fills slots of its own while the installed element of
 * that component is still a field itself: it declares a `supporting-text` of its own, so it would draw a second frame
 * inside the Field's, which the Field reports (FLD-15). A Field's select with its options is drawn — the select is the
 * bare control, and `itemsHtml` writes its options and its slots; a control that is split and not yet rebuilt waits.
 *
 * (The table's slots — `empty`, `pagination` — are no attributes of its element: they are parts of the
 * product's own markup, which `tableHtml` writes since the web built them, as it writes the selection column and the
 * placeholder rows.)
 */
export function drawsFixture(spec: Spec, fixture: Fixture): boolean {
  const framesItself = (item: FixtureItem) => {
    const kind = kindOf(spec, item);
    const tag = spec.platforms.web?.items?.[item.kind]?.name;
    return Boolean(kind?.component) && (item.items !== undefined || 'slots' in item) && !!tag && webReadsAttribute(tag, 'supporting-text');
  };
  if ((fixture.items ?? []).some(framesItself)) return false;
  const { html } = liveFixture(spec, fixture);
  for (const [, tag, written] of html.matchAll(/<(tanrei-[a-z0-9-]+)((?:\s+[^\s=<>"]+(?:="[^"]*")?)*)\s*>/g)) {
    if (!definedTags.has(tag)) return false;
    for (const [, name, value] of written.matchAll(/\s+([^\s=<>"]+)(?:="([^"]*)")?/g)) {
      if (isGlobalAttribute(name)) continue;
      if (!webReadsAttribute(tag, name)) return false;
      // A value the build does not read yet, of an attribute it reads (the list's `reorder="drag"`, whose handle the
      // web has not built): the manifest lists the values it does.
      const values = webAttributeValues(tag, name);
      if (values && value !== undefined && !values.includes(value)) return false;
    }
  }
  return true;
}

/**
 * The two specs whose fixtures are a combobox's: the Combobox, and the Combobox field that is a Field around one and
 * forwards its props. A Field's fixture around a combobox — the twin of a combobox field's fixture — is
 * the third place a combobox is written, as an item (`itemsHtml`).
 */
const isCombobox = (spec: Spec) => spec.name === 'combobox' || spec.name === 'combobox-field';
/**
 * A combobox's `chevron`, a boolean that defaults to true, is the inverse attribute (`no-chevron`), which is a property
 * of its own on the web: `chevron: false` is written `no-chevron`, and `chevron: true` is nothing. As an item of
 * another component's fixture (`inPlace`) an open combobox draws its list in place, with the `inline` attribute its
 * element has for that: nothing opens the list of a twin, so it is drawn as its fixture says or not at all.
 */
function comboboxProps({ chevron, ...props }: Props, inPlace = false): Props {
  return { ...props, ...(chevron === false ? { noChevron: true } : {}), ...(inPlace && props.open === true ? { inline: true } : {}) };
}

/**
 * The two specs whose fixtures are a text input's: the Text input, and the Text field that is a Field around one and
 * forwards its props. A Field's fixture around a text input — the twin of a text field's fixture — is
 * the third place a text input is written, as an item (`itemsHtml`).
 */
const isTextInput = (spec: Spec) => spec.name === 'text-input' || spec.name === 'text-field';
/**
 * A text input's `wrap`, a boolean that defaults to true, is the inverse attribute (`no-wrap`), which is a property of
 * its own on the web: `wrap: false` is written `no-wrap`, and `wrap: true` is nothing. (`readOnly` and `maxLength` keep
 * HTML's names, `readonly` and `maxlength`; those two the manifest says itself — `webAttribute`.)
 */
function textInputProps({ wrap, ...props }: Props): Props {
  return wrap === false ? { ...props, noWrap: true } : props;
}
/**
 * The entries of a Field's item of the kind `text-input`, as a product writes them by hand one level
 * below a chip field, and as the web package's harness writes them: one small input `<tanrei-chip>` for each in the
 * text input's `entries` slot, named by the entry, its remove action by `entryRemoveLabel` with `{entry}` filled — and
 * without its remove action (`not-removable`) while the input is read-only. A disabled Field's are disabled
 * (`liveFixture`).
 */
function entryChips(props: Props): string {
  const entries = Array.isArray(props.entries) ? props.entries.map(String) : [];
  const removeLabel = String(props.entryRemoveLabel ?? '');
  return entries.map((entry) => `<tanrei-chip slot="entries" kind="input" size="small" label="${escape(entry)}" remove-label="${escape(removeLabel.replaceAll('{entry}', entry))}"${props.readOnly === true ? ' not-removable' : ''}></tanrei-chip>`).join('');
}
/** The same item's props without the two the Field's fixture reads itself. */
function withoutEntries({ entries: _entries, entryRemoveLabel: _entryRemoveLabel, ...props }: Props): Props {
  return props;
}
/**
 * A number input's `steppers`, a boolean that defaults to true, is the inverse attribute (`no-steppers`), which is a
 * property of its own on the web: `steppers: false` is written `no-steppers`, and `steppers: true` is nothing. The
 * same for the number input, for the number field that forwards it, and for a number input that is the item of a
 * Field's fixture.
 */
function numberInputProps({ steppers, ...props }: Props): Props {
  return steppers === false ? { ...props, noSteppers: true } : props;
}
/** A text input fixture's icons: its `content` is `leading-icon=<glyph> trailing-icon=<glyph>`, each a glyph of the icon set in that slot. */
function textInputIcons(content: string): string {
  return content
    .split(/\s+/)
    .filter((pair) => /^[a-z-]+=[a-z0-9_]+$/.test(pair))
    .map((pair) => pair.split('='))
    .map(([slot, glyph]) => `<span slot="${escape(slot)}">${escape(glyph)}</span>`)
    .join('');
}

/** A fixture's named slots, each string drawn as the slot's declared fixture kind. */
function slotsHtml(spec: Spec, slots: Fixture['slots'], overlay: boolean): string {
  const button = getSpec('button').platforms.web?.name;
  return Object.entries(slots ?? {})
    .flatMap(([name, value]) => {
      const kind = (spec.slots as SlotDecl[] | undefined)?.find((s) => s.name === name)?.fixture;
      return (Array.isArray(value) ? value : [value]).map((v) => {
        const text = escape(v);
        if (kind === 'icon-only-button' && button) return `<${button} slot="${name}" variant="text" label="${text}"><span slot="icon">${text}</span></${button}>`;
        // An overlay's action closes it, as a product's handler would (`data-fixture-action`, read by the controller).
        if (kind === 'button' && button) return `<${button} slot="${name}" variant="text"${overlay ? ' data-fixture-action' : ''}>${text}</${button}>`;
        return `<span slot="${name}">${text}</span>`;
      });
    })
    .join('');
}

/**
 * The attribute that declares a fixture's step in script: the files a file upload that keeps its own files is handed
 * once it is defined, as JSON — `[{ "name": "brief.pdf", "sizeText": "820 KB" }, …]`, one for each `file` item.
 */
export const STAGED_FILES = 'data-fixture-files';

/** A drop zone's content in a fixture: the sample screen the spec's default slot describes, as the web's harness draws it. */
const dropZoneSample = (fixture: Fixture) =>
  `<div style="box-sizing: border-box; block-size: 100%; display: flex; flex-direction: column; align-items: flex-start; gap: 0.75rem; padding: 1rem; background: var(--tanrei-sys-color-surface-container-low); color: var(--tanrei-sys-color-on-surface)"><p style="margin: 0">${escape(fixture.content ?? '')}</p><tanrei-button variant="outlined">New video</tanrei-button></div>`;

export function liveFixture(spec: Spec, fixture: Fixture): LiveFixture {
  const web = spec.platforms.web;
  const tag = web?.name ?? '';
  const eventsNamed = (names: string[]) =>
    (spec.events ?? []).filter((e) => names.includes(e.name)).map((e) => web?.events?.[e.name] ?? e.name);

  const presence = spec.props.find((p) => PRESENCE.includes(p.name) && p.type === 'boolean' && p.default === false);
  const effective = (name: string) => fixture.props[name] ?? spec.props.find((p) => p.name === name)?.default;
  const presented = !!presence && effective(presence.name) === true;

  let presentation: Presentation = 'none';
  if (presented) {
    const axes = spec.props.filter((p) => p.values?.some((v) => OVER_WINDOW.includes(v)));
    const overWindow = axes.length > 0 ? axes.some((p) => OVER_WINDOW.includes(String(effective(p.name)))) : spec.accessibility.role === 'dialog';
    presentation = overWindow ? 'overlay' : 'check';
  }

  const props: Props = { ...(fixture.props as Props) };
  if (presentation === 'overlay' && presence) delete props[presence.name];
  // The web's harness draws each fixture in a document of its own; here every fixture of the component shares one, where
  // options with one `name` are one group and exclude each other — the radio button's selected fixtures would each
  // unselect the one before them. So each fixture's name is its own.
  if (typeof props.name === 'string' && props.name) props.name = `${props.name}-${fixture.id}`;
  // The web's `inline` attribute, where its notes declare one, draws the presented surface in place instead of in the top layer.
  // (A composed component's `open` is a member's: the attribute is that member's too, where the element documents
  // that it passes it on — the select field does; the combobox field does not, and an open fixture of it is drawn
  // closed with its opener.)
  const presenter = presence && (presence as { from?: string }).from ? specs[String((presence as { from?: string }).from).split('.')[0]]?.platforms.web?.notes ?? '' : '';
  const inline = presentation === 'check' && (/`inline` attribute/.test(web?.notes ?? '') || (/`inline` attribute/.test(presenter) && !!web && webReadsAttribute(web.name, 'inline')));
  if (inline) props.inline = true;

  // The table: its caption is the native `<caption>`, not the attribute; its box takes its width from its layout, and
  // a fixture's cell has none to give, so it is drawn at the width the web's harness gives it (720, and 480 for the
  // fixtures whose columns must not fit); the site's own rules for Markdown tables stop at it.
  let own = '';
  if (isTable(spec)) {
    const suffix = tableName(spec, fixture);
    delete props.caption;
    // The status line's paragraph is the table's own markup (`tableHtml`), not the attribute that would write it.
    delete props.status;
    if (suffix && typeof props.label === 'string') props.label = `${props.label}${suffix}`;
    const narrow = /^(rtl-)?wide/.test(fixture.id);
    const lang = fixture.id === 'japanese' ? ' lang="ja"' : fixture.direction === 'rtl' && /[\u0600-\u06ff]/.test(JSON.stringify(fixture)) ? ' lang="ar"' : '';
    own = ` class="not-content tanrei-not-prose" style="inline-size: ${narrow ? 30 : 45}rem"${fixture.direction ? ` dir="${fixture.direction}"` : ''}${lang}`;
  }
  // The description list and the figure: the box of a native element, which takes its width from its layout — a
  // fixture's cell has none to give, so each is drawn at the width the web's harness gives it (720 and 480). The
  // figure's title and caption are parts of the native figure, not attributes.
  const ownLang = /^japanese/.test(fixture.id) ? ' lang="ja"' : fixture.direction === 'rtl' && /[\u0600-\u06ff]/.test(JSON.stringify(fixture)) ? ' lang="ar"' : '';
  if (isDescriptionList(spec) || isFigure(spec)) {
    own = ` class="not-content tanrei-not-prose" style="inline-size: ${isFigure(spec) ? 30 : 45}rem; max-inline-size: 100%"${fixture.direction ? ` dir="${fixture.direction}"` : ''}${ownLang}`;
  }
  // The skeleton takes the whole inline size of its place (SKL-1) and the text style in effect there (SKL-3), and a
  // fixture's cell gives neither, so it is drawn as the web's harness draws it: 300 wide, in the body text style.
  if (isSkeleton(spec)) {
    own = ` class="not-content tanrei-not-prose" style="inline-size: 18.75rem; max-inline-size: 100%; font: var(--tanrei-sys-typescale-body-font); letter-spacing: var(--tanrei-sys-typescale-body-letter-spacing)"${fixture.direction ? ` dir="${fixture.direction}"` : ''}${ownLang}`;
  }
  if (isFigure(spec)) {
    delete props.title;
    delete props.caption;
  }
  // The page header: the box of the page's own heading and paragraphs, as wide as its layout — a fixture's cell has
  // none to give, so it is drawn at the width the web's harness gives it (768). Its title, description and eyebrow
  // are parts, not attributes; the site's own rules for Markdown headings and paragraphs stop at it.
  if (isPageHeader(spec)) {
    own = ` class="not-content tanrei-not-prose" style="inline-size: 48rem; max-inline-size: 100%"${fixture.direction ? ` dir="${fixture.direction}"` : ''}${ownLang}`;
    for (const part of ['title', 'description', 'eyebrow', 'level']) delete props[part];
  }
  // The link card: a block as wide as its layout gives it, which decides its own layout from that width — a fixture's
  // cell has none to give, so it is drawn at the width the web's harness gives it (720). A fixture that leaves
  // `external` out is drawn as a destination of the product's own site, as the harness draws it: on this site every
  // address of the fixtures would otherwise be found external.
  if (isLinkCard(spec)) {
    own = ` class="not-content tanrei-not-prose" style="inline-size: 45rem; max-inline-size: 100%"${fixture.direction ? ` dir="${fixture.direction}"` : ''}${ownLang || (/[\u3040-\u30ff\u4e00-\u9fff]/.test(JSON.stringify(fixture.props.title ?? '')) ? ' lang="ja"' : '')}`;
    if (props.external === undefined) props.external = 'off';
  }
  // The breadcrumbs: a trail is as wide as its layout gives it — a fixture's cell has none to give, so it is drawn at
  // the width the web's harness gives it (480; 320 for `long-current`), which is what folds the long trails; the
  // site's own rules for Markdown links stop at it.
  if (isBreadcrumbs(spec)) {
    own = ` class="not-content tanrei-not-prose" style="inline-size: ${fixture.id === 'long-current' ? 20 : 30}rem; max-inline-size: 100%"${fixture.direction ? ` dir="${fixture.direction}"` : ''}${ownLang}`;
  }
  // The popover is drawn closed with its opener, as an overlay, and the Specs tab's controller gives it that opener as
  // its anchor.
  // The accordion: as wide as its layout, and a fixture's cell has none to give, so it is drawn at the width the
  // web's harness gives it (480); the site's own rules for Markdown stop at it.
  if (isAccordion(spec)) {
    const lang = fixture.direction === 'rtl' && /[\u0600-\u06ff]/.test(JSON.stringify(fixture)) ? ' lang="ar"' : '';
    own = ` class="not-content tanrei-not-prose" style="inline-size: 30rem; max-inline-size: 100%"${fixture.direction ? ` dir="${fixture.direction}"` : ''}${lang}`;
  }
  // The table of contents: as wide as its layout, and a fixture's cell has none to give, so it is drawn at the width
  // the web's harness gives it (a column of 240); the site's own rules for Markdown lists and links stop at it.
  if (isTableOfContents(spec)) {
    own = ` class="not-content tanrei-not-prose" style="inline-size: 15rem; max-inline-size: 100%"${fixture.direction ? ` dir="${fixture.direction}"` : ''}${ownLang}`;
  }
  // The tree view: as wide as its layout, and a fixture's cell has none to give, so it is drawn at the width the
  // web's harness gives it (a side pane's 368); the site's own rules for Markdown lists stop at it.
  if (isTreeView(spec)) {
    own = ` class="not-content tanrei-not-prose" style="inline-size: 23rem; max-inline-size: 100%"${fixture.direction ? ` dir="${fixture.direction}"` : ''}${ownLang}`;
  }
  // The callout fills what holds it (CLO-22) and a fixture's cell is as wide as its content, so it is given the width
  // prose's measure gives a callout in the content column — which is where it got it while the fixtures table was not
  // yet an island of prose (a Tanrei Table) — and its text wraps there whatever the cell says. (Its visually hidden
  // parts need nothing from here: the callout lays them out against itself, so the table's scroll box clips them.)
  if (spec.name === 'callout') own = ' style="inline-size: calc(var(--tanrei-comp-prose-measure) * 1rem); white-space: normal"';
  // The empty state takes the whole inline size of its region (EMP-1), and a fixture's cell has none to give, so it is
  // drawn at the width the web's harness gives it (480), where the measure is narrower than the region and two actions
  // share a row; its text wraps there whatever the cell says.
  if (spec.name === 'empty-state') own = ` style="inline-size: 30rem; max-inline-size: 100%; white-space: normal"${fixture.direction ? ` dir="${fixture.direction}"` : ''}${ownLang}`;
  // The field, the field group and the radio group: each is as wide as its layout (FLD-1, FGR-1, RGP-1), and a
  // fixture's cell has none to give, so each is drawn at the width the web's harness gives it (280, 320 and 320), in
  // the language its fixture is written in; the site's own rules for Markdown stop at it. The slider field is a block
  // as wide as its place too (SLF-13) and is drawn as its twins, the Field's fixtures around a Slider, are: 280.
  if (spec.name === 'field' || spec.name === 'field-group' || spec.name === 'radio-group' || spec.name === 'checkbox-group' || spec.name === 'slider-field') {
    const text = JSON.stringify(fixture);
    // A field's fixture around a text input (`text-…`) is the twin of a text field's fixture and is drawn as that one
    // is on its own page — the language set where a right-to-left fixture is written in Arabic, and nowhere else — so
    // that the two are one picture.
    const twin = spec.name === 'field' && (fixture.items ?? []).some((item) => item.kind === 'text-input');
    // A field's fixture around a combobox (`combobox-…`) is the twin of a combobox field's fixture and is drawn as
    // that one is on its own page — with no language of its own. Around an open combobox the field is the window its
    // list is drawn in (the combobox's `inline`): positioned, and as tall as the web's harness makes that stage (440).
    const comboboxTwin = spec.name === 'field' && (fixture.items ?? []).some((item) => item.kind === 'combobox');
    // One around a number input (`number-…`) is the twin of a number field's fixture, which is drawn with no language
    // of its own on its page: the twin is drawn so too.
    const numberTwin = spec.name === 'field' && (fixture.items ?? []).some((item) => item.kind === 'number-input');
    // A field whose select has its list open draws the list in place (`itemsHtml`), below the select: the field keeps
    // room below itself for a list at its greatest height.
    const listed = spec.name === 'field' && (fixture.items ?? []).some((item) => item.kind === 'select' && item.props.open === true);
    const room = comboboxTwin && (fixture.items ?? []).some((item) => item.props.open === true && item.props.disabled !== true)
      ? '; position: relative; block-size: 27.5rem'
      : listed
        ? '; margin-block-end: calc(var(--tanrei-comp-select-list-max-height) + var(--tanrei-comp-select-list-offset))'
        : '';
    const lang = comboboxTwin || numberTwin ? '' : twin ? (fixture.direction === 'rtl' && /[\u0600-\u06ff]/.test(text) ? ' lang="ar"' : '') : /-ja$/.test(fixture.id) ? ' lang="ja"' : /[\u0600-\u06ff]/.test(text) ? ' lang="ar"' : /[\u0590-\u05ff]/.test(text) ? ' lang="he"' : '';
    own = ` class="not-content tanrei-not-prose" style="inline-size: ${spec.name === 'field' || spec.name === 'slider-field' ? 17.5 : 20}rem; max-inline-size: 100%${room}"${fixture.direction ? ` dir="${fixture.direction}"` : ''}${lang}`;
  }
  // The file upload: as wide as its layout (FUP-1), and a fixture's cell has none to give, so it is drawn at the width
  // the web's harness gives it (360); its texts wrap there whatever the cell says, and the site's own rules for
  // Markdown stop at it. Its rows are File items (`tanrei-file-item`) written as its children while
  // `rows` is `given`; they carry no file, and nothing in a fixture is sent anywhere. A row's picture (`previewSrc`,
  // which every fixture names `fixtures/avatar.png`) is the web package's own copy of that picture, inline, as the
  // avatar's is (`AVATAR_PICTURE` matches the end of `preview-src="fixtures/avatar.png"` too): no fixture asks the site
  // for a file.
  //
  // A fixture whose `rows` is `own` (also by leaving it out) and that holds `file` items cannot be markup alone: the
  // element keeps its own files, a file is no attribute, and a row written as a child would not be drawn (FUP-42). The
  // fixture format has no field that asks for a step in script, so the step is declared here, on the element:
  // `data-fixture-files` lists each item's name and size text, and the Specs tab's controller hands the files over once
  // the element is defined (`stageFiles` in components/ComponentSpecs.astro), as the web package's harness does
  // (`Staging.after` in packages/web/test/harness.ts). The items are then not written as child rows. A staged file
  // carries the media type a browser reports for its name's ending, so that it is judged by a media type of `accept` as
  // a chosen one is (`tiles-own` takes `image/*` and refuses the PDF); it is empty, so a tile that asks for a picture
  // of it draws the format's glyph (FIT-6).
  // The chat composer keeps its own files the same way while `attachments` is `own` (CCM-22), and is staged the same
  // way: its `addFiles()` is called with one file per item (a kept file's File item is given no size, so an item's
  // `sizeText` is not drawn).
  const filesInScript =
    (spec.name === 'file-upload' && (fixture.props.rows ?? 'own') !== 'given' && (fixture.items ?? []).some((item) => item.kind === 'file')) ||
    (spec.name === 'chat-composer' && fixture.props.attachments === 'own' && (fixture.items ?? []).some((item) => item.kind === 'file'));
  // The chat composer: as wide as its layout (CCM-1), and a fixture's cell has none to give, so it is drawn at the
  // width the web's harness gives it (480) — wider than the width under which it is laid out stacked (CCM-4) — in the
  // direction its fixture names; the site's own rules for Markdown stop at it.
  if (spec.name === 'chat-composer') {
    const files = filesInScript ? ` ${STAGED_FILES}="${escape(JSON.stringify((fixture.items ?? []).filter((item) => item.kind === 'file').map((item) => ({ name: String(item.props.name ?? ''), sizeText: '' }))))}"` : '';
    own = ` class="not-content tanrei-not-prose" style="inline-size: 30rem; max-inline-size: 100%; white-space: normal"${fixture.direction ? ` dir="${fixture.direction}"` : ''}${files}`;
  }
  // The embedded text input: as wide as its layout (ETI-1), drawn at the width the web's harness gives it (280), in
  // the direction and the language its fixture is written in. A fixture whose id begins `held-` is drawn inside the
  // sample holder (below); every other one bare, where everything that is not text is the page's.
  if (spec.name === 'embedded-text-input') {
    const lang = /[\u0600-\u06ff]/.test(JSON.stringify(fixture)) ? ' lang="ar"' : '';
    own = fixture.id.startsWith('held-') ? ` ${HELD}${fixture.direction ? ` dir="${fixture.direction}"` : ''}${lang}` : ` style="inline-size: 17.5rem; max-inline-size: 100%"${fixture.direction ? ` dir="${fixture.direction}"` : ''}${lang}`;
  }
  if (spec.name === 'file-upload') {
    const files = filesInScript ? ` ${STAGED_FILES}="${escape(JSON.stringify((fixture.items ?? []).filter((item) => item.kind === 'file').map((item) => ({ name: String(item.props.name ?? ''), sizeText: String(item.props.sizeText ?? '') }))))}"` : '';
    own = ` class="not-content tanrei-not-prose" style="inline-size: 22.5rem; max-inline-size: 100%; white-space: normal"${fixture.direction ? ` dir="${fixture.direction}"` : ''}${files}`;
  }
  // The file picker: as wide as its layout (FPK-1) — the file upload's column, 360, so that it is the same picture as
  // the file upload's part above its list (FUP-56) — in the direction its fixture names.
  if (spec.name === 'file-picker') own = ` class="not-content tanrei-not-prose" style="inline-size: 22.5rem; max-inline-size: 100%; white-space: normal"${fixture.direction ? ` dir="${fixture.direction}"` : ''}`;
  // The file item: a row is as wide as its layout (FIT-2) and is drawn at the file upload's column, 360, so that a row
  // alone is the same picture as a row of a file upload (FUP-58); a tile is as wide as its box (FIT-3) and never wider
  // than its place. Its picture is the package's own copy, as a file upload's row's is.
  if (spec.name === 'file-item') own = ` class="not-content tanrei-not-prose" style="${fixture.props.form === 'tile' ? '' : 'inline-size: 22.5rem; '}max-inline-size: 100%; white-space: normal"${fixture.direction ? ` dir="${fixture.direction}"` : ''}`;
  // The tag group: as wide as its layout (TGR-1), and a fixture's cell has none to give, so it is drawn at the width
  // the web's harness gives it (728), in the language its fixture is written in: the fixtures that wrap then wrap.
  if (spec.name === 'tag-group') {
    const text = JSON.stringify(fixture);
    const lang = /-ja$/.test(fixture.id) ? ' lang="ja"' : /[\u0600-\u06ff]/.test(text) ? ' lang="ar"' : '';
    own = ` class="not-content tanrei-not-prose" style="inline-size: 45.5rem; max-inline-size: 100%"${fixture.direction ? ` dir="${fixture.direction}"` : ''}${lang}`;
  }
  // The menubar: across the inline size of its place (MBR-1), and a fixture's cell has none to give, so it is drawn at
  // the width the web's harness gives it (528): the fixtures that fold then fold. A fixture with a menu open says so
  // on an item, not on the bar, and a fixture cannot fill a bar's menu: it is drawn in place with the bar's `inline`
  // attribute — the open title over its empty surface, with room below for it — as the web's harness draws it.
  if (spec.name === 'menubar') {
    const open = !!fixture.items?.some((item) => item.props.open === true);
    if (open) props.inline = true;
    const text = JSON.stringify(fixture);
    const lang = /[\u0600-\u06ff]/.test(text) ? ' lang="ar"' : /[\u3040-\u30ff\u4e00-\u9fff]/.test(text) ? ' lang="ja"' : '';
    own = ` class="not-content tanrei-not-prose" style="inline-size: 33rem; max-inline-size: 100%${open ? '; margin-block-end: 3rem' : ''}"${fixture.direction ? ` dir="${fixture.direction}"` : ''}${lang}`;
  }
  // The select needs nothing of its own: an open fixture is drawn in place with the `inline` attribute, like every other.
  // The select field is a block as wide as its place (SEF-1), and a fixture's cell has none to give, so it is drawn at
  // the width the web's harness gives it (280), in the direction it names and the language it is written in, as its
  // twin — the Field's fixture `select-<id>` — is drawn on the Field's page.
  if (spec.name === 'select-field') {
    const text = JSON.stringify(fixture);
    const lang = /-ja$/.test(fixture.id) ? ' lang="ja"' : /[\u0600-\u06ff]/.test(text) ? ' lang="ar"' : /[\u0590-\u05ff]/.test(text) ? ' lang="he"' : '';
    own = ` style="inline-size: 17.5rem; max-inline-size: 100%"${fixture.direction ? ` dir="${fixture.direction}"` : ''}${lang}`;
  }
  // The tabs and the Tab view: `track` is true, false or null (TAB-49, TBV-16) — the attribute is absent for null, bare
  // for true and `track="false"` for false, as the web's harness writes it.
  if ((spec.name === 'tabs' || spec.name === 'tab-view') && props.track === false) props.track = 'false';
  // The combobox and the combobox field: `chevron`, a boolean that defaults to true, is the inverse attribute
  // (`no-chevron`), which is a property of its own on the web (`comboboxProps`). Each is a block as wide as its place
  // (CMB-49, CBF-1), and a fixture's cell has none to give, so it is drawn at the width the web's harness gives it
  // (280). The combobox field has no documented `inline` (it is its combobox's test attribute, passed on): an open
  // fixture of it is drawn closed with its opener, as every surface that stays in the top layer is.
  if (isCombobox(spec)) {
    if (props.chevron === false) props.noChevron = true;
    delete props.chevron;
    own = ` style="inline-size: 17.5rem; max-inline-size: 100%"${fixture.direction ? ` dir="${fixture.direction}"` : ''}`;
  }
  // The number input and the number field: `steppers`, a boolean that defaults to true, is the inverse attribute
  // (`no-steppers`), a property of its own on the web (`numberInputProps`). Each is a block as wide as its place
  // (NMI-36, NUM-47), and a fixture's cell has none to give, so it is drawn at the width the web's harness gives it
  // (280).
  if (spec.name === 'number-input' || spec.name === 'number-field') {
    if (props.steppers === false) props.noSteppers = true;
    delete props.steppers;
    own = ` style="inline-size: 17.5rem; max-inline-size: 100%"${fixture.direction ? ` dir="${fixture.direction}"` : ''}`;
  }
  // The text input and the text field: `wrap`, a boolean that defaults to true, is the inverse attribute (`no-wrap`),
  // a property of its own on the web (`textInputProps`). Each is a block as wide as its place (TXI-63, TXF-62), and a
  // fixture's cell has none to give, so it is drawn at the width the web's harness gives it (a phone form's column,
  // 280) — where a long line of code wraps, or scrolls inside the box (TXF-57, TXF-58) — in the direction it names and
  // the language it is written in: a right-to-left fixture is there to show what mirrors and what does not (TXF-24,
  // TXF-53). Its `content` names its icons, `leading-icon=<glyph> trailing-icon=<glyph>`: each is a glyph of the icon
  // set in that slot (`textInputIcons`).
  if (isTextInput(spec)) {
    if (props.wrap === false) props.noWrap = true;
    delete props.wrap;
    const lang = fixture.direction === 'rtl' && /[\u0600-\u06ff]/.test(JSON.stringify(fixture)) ? ' lang="ar"' : '';
    own = ` style="inline-size: 17.5rem; max-inline-size: 100%"${fixture.direction ? ` dir="${fixture.direction}"` : ''}${lang}`;
  }
  // The chip field: a block as wide as its place (CHF-1), drawn at the width the web's harness gives it (a phone
  // form's column, 280), in the direction it names — and in the language its twin, a Field around a text input, is
  // drawn in on the Field's page, so that the two are one picture; the site's own rules for Markdown
  // stop at it, as at the Field. `value` and `separators` are JSON arrays (`attributes`).
  if (spec.name === 'chip-field') {
    const lang = fixture.direction === 'rtl' && /[\u0600-\u06ff]/.test(JSON.stringify(fixture)) ? ' lang="ar"' : '';
    own = ` class="not-content tanrei-not-prose" style="inline-size: 17.5rem; max-inline-size: 100%"${fixture.direction ? ` dir="${fixture.direction}"` : ''}${lang}`;
  }
  // The one-time-code input is as wide as its row needs and never wider than its layout (OTC-1, OTC-23): it is drawn in
  // the width the web's harness gives it (400), so that a right-to-left fixture shows its row at the right edge
  // (OTC-27), in the direction the fixture names.
  if (spec.name === 'one-time-code-input') own = ` style="inline-size: 25rem; max-inline-size: 100%"${fixture.direction ? ` dir="${fixture.direction}"` : ''}`;
  // The avatar: a fixture is drawn in the direction it names (its glyph mirrors, its group starts at the right), in the
  // language it is written in.
  // TODO: the spec should name this fixture's direction. `group-max-rtl` is AVT-20's right-to-left row and does not
  // name its direction; until the spec does, it is drawn right-to-left here by its id, as the web's harness draws it.
  if (isAvatar(spec)) {
    const direction = fixture.direction ?? (fixture.id === 'group-max-rtl' ? 'rtl' : undefined);
    const lang = direction === 'rtl' && /[\u0600-\u06ff]/.test(JSON.stringify(fixture)) ? ' lang="ar"' : /[\u3040-\u30ff\u4e00-\u9fff]/.test(JSON.stringify(fixture)) ? ' lang="ja"' : '';
    own = `${direction ? ` dir="${direction}"` : ''}${lang}`;
  }
  // The drop zone wraps a screen of the product's (DRZ-1): its content is the sample screen the web's harness draws —
  // the fixture's content as a paragraph above an outlined Button, on a surface 360 × 240 — and the zone is live: a
  // file dragged onto it from the reader's computer shows the overlay. A fixture whose id begins `dragged` is drawn at
  // rest here, since a drag staged in script would end at the reader's first movement of the pointer (DRZ-7).
  if (spec.name === 'drop-zone') own = ` class="not-content tanrei-not-prose" style="inline-size: 22.5rem; max-inline-size: 100%; block-size: 15rem"${fixture.direction ? ` dir="${fixture.direction}"` : ''}`;
  const element = isAvatar(spec) && fixture.items ? `${tag}-group` : tag;
  // The checkbox group (320 wide, as the field group its twins are): its checkboxes are the product's own children, the
  // Checkbox's element, and its `value` is a property and no attribute (the spec's web note) — the first value is
  // written where HTML writes it, as `checked` on each child whose value the list holds (CKG-3), as the web's harness
  // writes it (`checkedItems` in packages/web/test/harness.ts).
  const held = spec.name === 'checkbox-group' && Array.isArray(props.value) ? props.value : [];
  const children = spec.name === 'checkbox-group' ? (fixture.items ?? []).map((item) => (held.includes(String(item.props.value)) ? { ...item, props: { ...item.props, checked: true } } : item)) : fixture.items;
  if (spec.name === 'checkbox-group') delete props.value;
  const items = !fixture.items || isPageHeader(spec) || filesInScript ? '' : isTableOfContents(spec) ? tableOfContentsHtml(fixture.items) : isBreadcrumbs(spec) ? breadcrumbsHtml(fixture.items) : isMenubar(spec) ? menubarHtml(spec, fixture.items) : isTreeView(spec) ? treeViewHtml(fixture.items) : isTable(spec) ? tableHtml(spec, fixture, tableName(spec, fixture)) : isDescriptionList(spec) ? descriptionListHtml(spec, fixture) : isSkeleton(spec) ? skeletonHtml(fixture) : isAccordion(spec) ? accordionHtml(fixture) : itemsHtml(spec, children ?? []);
  // The color input and the color field: each is a block as wide as its place (CLI-44, CLF-43), and a fixture's cell
  // has none to give, so each is drawn at the width the web's harness gives it (280), in the direction its fixture
  // names and the language it is written in — as the Field's `color-…` fixtures are (the field's case, above), so
  // that a color field's fixture and its twin are one picture.
  if (spec.name === 'color-field' || spec.name === 'color-input') {
    const text = JSON.stringify(fixture);
    const lang = /-ja$/.test(fixture.id) ? ' lang="ja"' : /[\u0600-\u06ff]/.test(text) ? ' lang="ar"' : /[\u0590-\u05ff]/.test(text) ? ' lang="he"' : '';
    own = ` style="inline-size: 17.5rem; max-inline-size: 100%"${fixture.direction ? ` dir="${fixture.direction}"` : ''}${lang}`;
  }
  // A Field's entries (the twin of a chip field's fixture) are disabled chips while the Field is: written by hand.
  const heldItems = spec.name === 'field' && fixture.props.disabled === true ? items.replaceAll('<tanrei-chip slot="entries"', '<tanrei-chip slot="entries" disabled') : items;
  const inner = spec.name === 'drop-zone' ? dropZoneSample(fixture) : isFigure(spec) ? figureHtml(fixture) : isPageHeader(spec) ? pageHeaderHtml(fixture) : isTextInput(spec) ? textInputIcons(fixture.content ?? '') : `${isTable(spec) ? '' : slotsHtml(spec, fixture.slots, presentation === 'overlay')}${heldItems}${escape(fixture.content ?? '')}`;
  return {
    html: (isLinkCard(spec) ? LINK_CARD_PICTURES : spec.name === 'image-preview' ? IMAGE_PREVIEW_PICTURES : spec.name === 'chat-composer' ? CHAT_COMPOSER_PICTURES : []).reduce((html, [name, picture]) => html.replaceAll(name, picture), `<${element}${attributes(element, spec.props, web?.props, props)}${own}>${inner}</${element}>`.replaceAll(AVATAR_PICTURE, `src="${avatarPicture}"`).replaceAll(...AVATAR_MISSING)),
    presentation,
    inline,
    openProp: presence ? (web?.props?.[presence.name] ?? presence.name) : undefined,
    closeEvents: presence ? eventsNamed(['close', 'dismiss']) : [],
    toggleEvents: presence ? eventsNamed(['toggle']) : [],
  };
}

/** Props of a fixture that the landing page's specimen leaves out: see `specimenFixtures`. */
const NOT_IN_A_SPECIMEN = ['size', 'href', 'toggle', 'width'];

/**
 * The fixtures of a spec that the landing page's specimen draws (components/Hero.astro), each as the HTML the Specs
 * tab draws it with (`liveFixture`): its props as the element's own attributes, and its slots — a Button's icon is a
 * slot, and props written on the element by their spec names drew every icon button as an empty circle.
 *
 * A specimen shows what the component looks like at rest, once: the fixtures at the default size that are no link (a
 * button of a specimen goes nowhere — a link fixture's address is a placeholder's), hold no toggle state, take the
 * default width and the page's own direction, and that the installed build can draw (`drawsFixture`).
 */
export function specimenFixtures(spec: Spec): string[] {
  return (spec.fixtures as Fixture[])
    .filter((fixture) => !NOT_IN_A_SPECIMEN.some((name) => name in fixture.props) && !fixture.direction && drawsFixture(spec, fixture))
    .map((fixture) => liveFixture(spec, fixture).html)
    // A specimen is markup alone: a fixture that needs a step in script would be drawn without what the step gives it.
    .filter((html) => !html.includes(` ${STAGED_FILES}=`));
}
