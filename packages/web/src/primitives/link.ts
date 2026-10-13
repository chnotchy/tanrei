import { type CSSResult, type ReactiveController, type ReactiveControllerHost, noChange, unsafeCSS } from 'lit';
import { Directive, type ElementPart, type PartInfo, PartType, directive } from 'lit/directive.js';
import { report } from './report.js';
import { WordsController } from './words.js';

// A control with a destination is a link: the one place the web decides what a destination is,
// what the anchor carries, which keys a link takes and what a debug build says. A component with a link form (Button,
// card, action chip, list item) declares the destination props, holds a `LinkController`, draws
// `<a>` in place of its native element while `link.form` is not null, and puts `linkAttributes(form)` on it:
//
//   static properties = { …, href: { type: String }, target: { type: String }, targetLabel: { type: String, attribute: 'target-label' }, rel: { type: String }, download: { type: String } };
//   private readonly link = new LinkController(this, { ids: { refused: 'BTN-26', newContext: 'BTN-24' }, disabled: () => this.disabled, holds: () => (this.toggle ? 'a toggle' : null) });
//   private readonly press = new PressController(this, { …, keys: () => this.link.pressKeys });
//   render() { const form = this.link.form; … html`<${form ? literal`a` : literal`button`} ${linkAttributes(form)} aria-description=${this.link.describe() ?? nothing} …>` }
//
// What the browser gives an anchor stays the browser's (D2, D3, D4): Enter fires `click` and then follows the address
// unless the click was cancelled; Space scrolls; a modified or a middle click opens a tab; the context menu, the drag
// and the status bar are its own. Nothing here listens for any of it.

/** Where a destination opens: where the person is, or a new context — a new tab or window on the web. */
export type TanreiLinkTarget = 'same' | 'new';

/** D7: the glyph of the system's icon set that marks a link which opens a new context. The icon set mirrors it. */
export const LINK_MARK = 'open_in_new';

/** D3: the keys that press a link. Enter activates; Space does what it does on any link and shows no pressed state. */
export const LINK_KEYS: readonly string[] = ['Enter'];

/**
 * D9 in a stylesheet: the disabled condition of an element that is a native control or the anchor of its link form — a
 * disabled anchor has no `:disabled`, it carries `aria-disabled="true"`. One pseudo-class, so a selector that ends in it
 * weighs what it weighed with `:disabled`.
 */
export const DISABLED = ":is(:disabled, [aria-disabled='true'])";

/** Why an address is not a destination (D11): it names a script to run, or the platform cannot read it as an address. */
export type LinkRefusal = 'script' | 'unreadable';

/** A base that has a hierarchy, for a document whose own address has none (`about:blank`, a `data:` page). */
const HIERARCHICAL_BASE = 'https://tanrei.invalid/';

/**
 * D11 — what is not a place to go is not a destination. White space is no destination (and no finding); an address
 * with the `javascript:` scheme, or one the URL parser rejects, is refused. A path or a fragment is an address whatever
 * the document's own is: it is read against the document's base, and against a hierarchical one where the document's
 * cannot resolve it — whether a control is a link does not depend on where its page was loaded from. The address is
 * handed to the anchor as it was given; the browser resolves it.
 */
export function readDestination(href: string | null | undefined): { href: string | null; refusal: LinkRefusal | null } {
  const given = href ?? '';
  if (!given.trim()) return { href: null, refusal: null };
  let url: URL | null = null;
  for (const base of [typeof document === 'undefined' ? HIERARCHICAL_BASE : document.baseURI, HIERARCHICAL_BASE]) {
    try {
      url = new URL(given, base);
      break;
    } catch {
      // The next base.
    }
  }
  if (!url) return { href: null, refusal: 'unreadable' };
  // The parser has already dropped what a browser drops before it reads the scheme (leading control characters, tabs
  // and line breaks inside it), so `java\nscript:` is caught as the browser would run it.
  if (url.protocol === 'javascript:') return { href: null, refusal: 'script' };
  return { href: given, refusal: null };
}

/**
 * The `target` prop as one of its two values: `same` and `new`, and HTML's spellings `_self` and `_blank` read as
 * those (ASCII case-insensitively, as HTML reads them). Anything else — a named frame, `_top`, `_parent` — is `same`,
 * and `known` is false (D11).
 */
export function readTarget(target: string | null | undefined): { target: TanreiLinkTarget; known: boolean } {
  const given = (target ?? '').trim();
  const html = given.toLowerCase();
  if (given === '' || given === 'same' || html === '_self') return { target: 'same', known: true };
  if (given === 'new' || html === '_blank') return { target: 'new', known: true };
  return { target: 'same', known: false };
}

/**
 * D6: the anchor's `rel` — the product's own, with `noopener` added for a new context so that the opened page has no
 * handle to the one that opened it. `noreferrer` is never added: that is the product's choice, made through `rel`.
 */
export function linkRel(rel: string | null | undefined, target: TanreiLinkTarget): string | null {
  const tokens = (rel ?? '').split(/\s+/).filter(Boolean);
  if (target === 'new' && !tokens.some((token) => token.toLowerCase() === 'noopener')) tokens.push('noopener');
  return tokens.length ? tokens.join(' ') : null;
}

/** The link a control is now: what its anchor carries and what the control draws and says for it. */
export interface LinkForm {
  /** The address the anchor carries; null while the link is disabled (D9: an anchor without a destination). */
  readonly href: string | null;
  readonly target: TanreiLinkTarget;
  /** D9: it cannot be followed. */
  readonly disabled: boolean;
  /** D7: it opens a new context, so a control that lays out its own content marks it with `LINK_MARK`. */
  readonly opensNew: boolean;
  /** D8: `targetLabel` while it opens a new context and the product gave one; null otherwise. */
  readonly targetLabel: string | null;
  /** The attributes of the anchor, null for one it does not carry (`linkAttributes()` writes them). */
  readonly attributes: Readonly<Record<(typeof ANCHOR_ATTRIBUTES)[number], string | null>>;
}

/** Everything `linkAttributes()` owns on the anchor. A component's template binds none of these on its link form. */
const ANCHOR_ATTRIBUTES = ['href', 'target', 'rel', 'download', 'role', 'aria-disabled'] as const;

/** The destination props, and the two attributes the web forwards to the anchor. */
export interface LinkProps {
  href: string;
  target: string;
  targetLabel: string;
  rel: string | null;
  download: string | null;
}

/**
 * The link form of `props`, or null where they name no destination (D11). `disabled`: D9 — the anchor without `href`,
 * with `role="link"` (an anchor without an address has no role of its own) and `aria-disabled="true"`, and nothing a
 * browser could follow or save. `role`: the role the anchor keeps in both forms, where its container's role fixes its
 * children's (a link item of a menu is a menu item: MNU-53) — the element is still the browser's link.
 */
export function linkForm(props: LinkProps, disabled: boolean, role: string | null = null): LinkForm | null {
  const { href } = readDestination(props.href);
  if (href === null) return null;
  const { target } = readTarget(props.target);
  const opensNew = target === 'new';
  return {
    href: disabled ? null : href,
    target,
    disabled,
    opensNew,
    targetLabel: opensNew && props.targetLabel.trim() ? props.targetLabel : null,
    attributes: disabled
      ? { href: null, target: null, rel: null, download: null, role: role ?? 'link', 'aria-disabled': 'true' }
      : { href, target: opensNew ? '_blank' : null, rel: linkRel(props.rel, target), download: props.download ?? null, role, 'aria-disabled': null },
  };
}

class LinkAttributesDirective extends Directive {
  constructor(part: PartInfo) {
    super(part);
    if (part.type !== PartType.ELEMENT) throw new Error('linkAttributes() goes on the element itself: <a ${linkAttributes(form)}>');
  }

  render(_form: LinkForm | null) {
    return noChange;
  }

  override update(part: ElementPart, [form]: [LinkForm | null]) {
    // Not a link: the element is the component's own (a native button, an element with the button role) and every
    // attribute on it is the template's.
    if (!form) return noChange;
    for (const name of ANCHOR_ATTRIBUTES) {
      const value = form.attributes[name];
      if (value === null) {
        if (part.element.hasAttribute(name)) part.element.removeAttribute(name);
      } else if (part.element.getAttribute(name) !== value) part.element.setAttribute(name, value);
    }
    return noChange;
  }
}

/**
 * The anchor's attributes, written on the element it is placed on: `<a ${linkAttributes(form)}>`. With a form it owns
 * `href`, `target` (`_blank` for a new context), `rel` (D6), `download`, `role` (none, or the one the form keeps) and
 * — for a disabled link (D9) — `role="link"` and `aria-disabled="true"` in place of the first four. With `null` it touches nothing, so one template can draw the
 * component's native element and its anchor.
 */
export const linkAttributes = directive(LinkAttributesDirective);

export interface LinkOptions {
  /**
   * The behaviour ids a debug report cites: `refused` — the sentence that says which forms take no destination, that an
   * unknown `target` is `same` and which addresses are refused (BTN-26, CRD-23, CHP-37, LST-30); `newContext` — the one
   * that says a link which opens a new context says so through `targetLabel` (BTN-24, CRD-21, CHP-35, LST-28).
   */
  ids: { refused: string; newContext: string };
  /** Whether the control is disabled now (D9). */
  disabled: () => boolean;
  /**
   * D10 — a control that holds a state, or a second action, takes no destination: what the control is now when it is
   * one of those ("a toggle", "a filter chip", "an option of a selectable list"), or null. The destination props are
   * then ignored and a debug build says so.
   */
  holds?: () => string | null;
  /**
   * The role the anchor carries in place of the link's, for a link inside a container whose role fixes its children's:
   * a menu is read by its items, so a link item is exposed as a menu item (`menuitem`, MNU-53). The anchor stays the
   * browser's link in everything else. Such a host also keeps its container's keys: it does not pass `pressKeys` on.
   */
  role?: string;
}

type LinkHost = ReactiveControllerHost & HTMLElement & LinkProps;

/**
 * The link form of a control, as a Lit controller: `form` is the link the host is now — null while it is
 * the control it would be without a destination — and after every update a debug build is told what the host
 * survived: a refused address (D11), an unknown `target` (D11), a destination on a control that takes none (D10), and
 * a new context that is not said (D8). It listens to nothing: activation is the anchor's (see the top of this file).
 */
export class LinkController implements ReactiveController {
  constructor(
    private readonly host: LinkHost,
    private readonly options: LinkOptions,
  ) {
    host.addController(this);
    this.words = new WordsController(host);
  }

  /** D8: `targetLabel` is the control's own prop, else the product's words of that name (`setWords()`). */
  private readonly words: WordsController;

  /** The link the host is now, or null: no destination (D11), or a control that takes none (D10). */
  get form(): LinkForm | null {
    if (this.options.holds?.()) return null;
    const { host } = this;
    // Named one by one: the props are a component's accessors, which a spread would not copy.
    const props: LinkProps = { href: host.href, target: host.target, targetLabel: this.words.get('targetLabel', host.targetLabel), rel: host.rel, download: host.download };
    return linkForm(props, this.options.disabled(), this.options.role ?? null);
  }

  /**
   * The keys that press the host, for `PressController`'s `keys`: Enter alone while it is a link (D3), the control's
   * own keys (undefined: Enter and Space) otherwise.
   */
  get pressKeys(): readonly string[] | undefined {
    return this.form ? LINK_KEYS : undefined;
  }

  /**
   * D8, D12: the description the anchor exposes — what the component already describes itself with (`before`, in
   * reading order), then `targetLabel` while the link opens a new context. Nothing is added to the name. Null: none.
   */
  describe(...before: (string | null | undefined)[]): string | null {
    const parts = [...before, this.form?.targetLabel].filter((part): part is string => !!part);
    return parts.length ? parts.join(', ') : null;
  }

  hostConnected() {}

  hostUpdated() {
    const { host } = this;
    const { refused, newContext } = this.options.ids;
    const held = this.options.holds?.() ?? null;
    const { href, refusal } = readDestination(host.href);
    if (held) {
      // D10: said once per control and kind, and only where a destination was actually given.
      if (href !== null || refusal) report(host, refused, `${held} cannot be a link: a control that holds a state, or a second action, is not a destination; href, target and targetLabel are ignored`);
      return;
    }
    if (refusal === 'script') report(host, refused, 'href names a script to run, not a place to go; it is ignored and the control has no destination');
    if (refusal === 'unreadable') report(host, refused, `href "${host.href}" cannot be read as an address; it is ignored and the control has no destination`);
    if (!readTarget(host.target).known) report(host, refused, `target "${host.target}" is not a value it defines ("same" or "new"); it opens as "same"`);
    const form = this.form;
    if (form?.opensNew && !form.targetLabel) {
      // Neither the control nor the product's words gave it: recorded for `missingWords()`, and said for this control.
      this.words.lacks('targetLabel', host.targetLabel);
      report(host, newContext, 'it opens a new context and targetLabel is empty, so nothing says so to people who cannot see the mark; give it the words ("opens in a new tab")');
    }
  }
}

/**
 * D1 in a stylesheet whose rules name a native element by its tag: every rule written for `native` (`button`) names the
 * anchor of the link form as well — `:is(button, a)`, which weighs what `button` weighed — so that the anchor IS the
 * same styled part, in every state and from the same tokens, and a rule added for the native element later cannot be
 * forgotten for the link. The tag is matched as a type selector only: never inside a custom property's name
 * (`--tanrei-comp-button-…`), a keyword (`ButtonText`) or a quoted value (`[role='button']`). A stylesheet that names
 * its part by a class needs none of this; `DISABLED` is the disabled condition both forms share.
 */
export function styledAsAnchorToo(styles: CSSResult, native: string): CSSResult {
  // No lookbehind: a browser without it would fail to load the component at all.
  const type = new RegExp(`(^|[^-\\w'"])${native}(?![-\\w'"])`, 'g');
  return unsafeCSS(styles.cssText.replace(type, `$1:is(${native}, a)`));
}
