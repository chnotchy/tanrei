import { LitElement, type PropertyDeclarations, type PropertyValues, html, nothing } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import { keyed } from 'lit/directives/keyed.js';
import { wordPlaces } from '../../generated/words.js';
import { AvailabilityController, GlyphDrawnController, GlyphMirrorController, OpenAxesController, WordsController, hostAria, report } from '../../primitives/index.js';
import { fillPlaces, placeFaults, reportPlaces } from '../../primitives/places.js';
import type { TanreiAvatarShapeRegistry, TanreiAvatarSizeRegistry } from '../../registry.js';
import { AXES, GROUP_AXES, groupStyles, styles } from './avatar.styles.js';
import { TanreiElement } from '../../primitives/element.js';

/** The core sizes (small, medium, large), plus any a design system's generated `.d.ts` registers. */
export type TanreiAvatarSize = keyof TanreiAvatarSizeRegistry;
/** The core shapes (circle, square), plus any a design system's generated `.d.ts` registers. */
export type TanreiAvatarShape = keyof TanreiAvatarShapeRegistry;

const AVATAR = 'tanrei-avatar';
const GROUP = 'tanrei-avatar-group';
/** AVT-5: the most characters of initials an avatar draws, as a reader counts them. */
const INITIALS = 2;
/** AVT-18: a larger count is drawn as this number followed by a plus sign. */
const COUNT_CAP = 99;
/** AVT-6: the system's own glyph, where the product gives none: a person for a circle, a neutral mark for a square. */
const SYSTEM_GLYPHS = { person: 'person', thing: 'category' } as const;

/**
 * AVT-5: a text as the characters a reader counts — grapheme clusters, so that a letter with its marks, a syllable of a
 * script that joins its signs, or a sequence that is one picture is never cut in half. Where the platform cannot
 * segment, code points: a surrogate pair is still never split.
 */
function characters(text: string): string[] {
  if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
    return [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text)].map((part) => part.segment);
  }
  return Array.from(text);
}

/**
 * Stands for a person, or for a team or a project, by a small picture — by initials or a glyph where there is no
 * picture — in a round or a square box of three sizes. A picture, never a control.
 *
 * Contract: specs/avatar.spec.json. `<tanrei-avatar label="Ada Lovelace" initials="AL" src="/people/ada.jpg">`. It draws
 * the first of these it has: the picture, once it has loaded; the initials the product gives (at most two characters as
 * a reader counts them, as written — the avatar never makes initials from the name); the glyph in its `icon` slot; the
 * system's own glyph. The box never changes size and nothing changes place when the picture arrives or fails. Every
 * visual value is a `--tanrei-comp-avatar-*` token; how far its corners ease is the system's amount
 * (`--tanrei-sys-shape-corner-smoothing`).
 *
 * Alone, it is an image named by `label` (the name in full — never "Photo of", never the initials). Beside the same
 * name in visible text, set `decorative` and the name is read once. It takes no input and no focus and emits no event:
 * an avatar that leads somewhere is inside a link, one that opens something inside a Button, and a dot or a count on it
 * is a `<tanrei-badge>` around it.
 *
 * @tag tanrei-avatar
 * @slot icon - The fallback glyph: a glyph of the system's icon set (its ligature text, in an element), drawn where there is neither a picture nor initials. Empty draws the system's own glyph for the shape. A glyph the icon set flags is mirrored in right-to-left; `data-mirror="auto | always | never"` on the element decides for one use.
 * @csspart container - The box: its side, its corners, its fill; what the picture is clipped to.
 * @csspart image - The picture, once it has loaded.
 * @csspart label - The initials.
 * @csspart icon - The box the glyph is drawn in.
 */
export class TanreiAvatar extends TanreiElement {
  private readonly availability = new AvailabilityController(this, 'avatar');
  static override styles = styles;

  static override properties: PropertyDeclarations = {
    src: { type: String },
    label: { type: String },
    initials: { type: String },
    decorative: { type: Boolean, reflect: true },
    size: { type: String, reflect: true },
    shape: { type: String, reflect: true },
    loading: { type: String },
    referrerPolicy: { type: String, attribute: 'referrerpolicy' },
    crossOrigin: { type: String, attribute: 'crossorigin' },
    member: { state: true },
    hasIcon: { state: true },
    loaded: { state: true },
    failed: { state: true },
  };

  /** The address of the picture. Empty, or a picture that has not loaded or cannot be loaded, draws the fallback: initials where the product gave some, otherwise a glyph. */
  src = '';

  /** The name of the person or the thing the avatar stands for, in full ("Ada Lovelace", "Design team"). Not drawn: it is the avatar's accessible name while `decorative` is false. */
  label = '';

  /** The one or two characters drawn where there is no picture ("AL", "山"). The product makes them; the avatar draws at most two, as written, and never reads them aloud. */
  initials = '';

  /** True hides the avatar from assistive technology, for an avatar that stands beside the same name in visible text, so the name is read once. Ignored for the members of a group. */
  decorative = false;

  /** Small (24) stands beside one line of text; medium (40) is a list row's or a comment's avatar; large (56) heads a person's own page or card. A group gives its size to every member. */
  size: TanreiAvatarSize = 'medium';

  /** Circle is a person. Square, a rounded square, is something that is not one person: a team, a project, an organisation, a bot. A group gives its shape to every member. */
  shape: TanreiAvatarShape = 'circle';

  /** When the picture is asked for: HTML's `loading` — `lazy` waits until the avatar nears the window. Unset is the browser's own (eager). */
  loading: 'eager' | 'lazy' | '' = '';

  /** HTML's `referrerpolicy`, passed to the picture as written. Unset, the page's own policy applies: which referrer a picture's host is sent is the product's to say. */
  referrerPolicy = '';

  /** HTML's `crossorigin`, passed to the picture as written (`anonymous`, `use-credentials`). Null asks for the picture without CORS. */
  crossOrigin: string | null = null;

  /** Whether it is a member of a group: a child of `<tanrei-avatar-group>` (AVT-16, AVT-19). */
  protected member = false;
  /** Whether the icon slot has content. */
  protected hasIcon = false;
  /** AVT-3: whether the picture of `src` has loaded. */
  protected loaded = false;
  /** AVT-4: whether the picture of `src` could not be loaded; it is not asked for again. */
  protected failed = false;

  /** AVT-22: sizes and shapes a design system adds, and a value the active system does not have (src/primitives/axes.ts). */
  private readonly axes = new OpenAxesController(this, { component: 'avatar', behavior: 'AVT-22', axes: AXES });

  /**
   * AVT-15: the glyph in the icon slot is marked when the icon set mirrors its name in right-to-left, or the product's
   * `data-mirror` says so; the system's own glyphs go through the same rule. `iconGlyph()` draws the mark. The avatar
   * mirrors nothing itself.
   */
  private readonly mirror = new GlyphMirrorController(this, { slots: 'slot[name="icon"]', drawn: '.icon.own' });

  /** AVT-2: the glyph box carries `data-drawn` while the icon set can draw its ligature; until then it draws nothing. */
  protected readonly glyphs = new GlyphDrawnController(this, () => this.renderRoot?.querySelectorAll<HTMLElement>('.icon:not([hidden])') ?? []);

  /** The address as it is asked for: nothing for one that is empty or white space (AVT-4). */
  private get address(): string {
    return (this.src ?? '').trim();
  }

  /** AVT-5: the initials as drawn — the first two characters as a reader counts them, as the product wrote them. */
  private get drawnInitials(): string {
    return characters((this.initials ?? '').trim()).slice(0, INITIALS).join('');
  }

  private scan() {
    this.hasIcon = [...this.children].some((child) => child.slot === 'icon');
  }

  private readonly onSlotChange = () => this.scan();

  /**
   * AVT-4: the picture has arrived. It is drawn in the fallback's place once it can be painted (decoded), so that no
   * frame shows the box with neither; the `keyed()` element is this address's own, so a picture that arrives after
   * `src` changed is not this one.
   */
  private readonly onLoad = (event: Event) => {
    const image = event.currentTarget as HTMLImageElement;
    const show = () => {
      if (image.isConnected && image.getAttribute('src') === this.address) this.loaded = true;
    };
    if (typeof image.decode === 'function') image.decode().then(show, show);
    else show();
  };

  /** AVT-4: the picture cannot be loaded. The fallback stays, the picture's element goes, and nothing asks again. */
  private readonly onError = () => {
    this.failed = true;
    this.loaded = false;
    report(this, 'AVT-4', `the picture "${this.address}" could not be loaded; the fallback is drawn and the picture is not asked for again`);
  };

  override connectedCallback() {
    super.connectedCallback();
    this.member = this.parentElement?.localName === GROUP;
  }

  protected override willUpdate(changed: PropertyValues) {
    // The first render already draws the right fallback: the light-DOM children are there before a slot says so.
    if (!this.hasUpdated) this.scan();
    // AVT-4: a new address starts again from the fallback.
    if (changed.has('src')) {
      this.loaded = false;
      this.failed = false;
    }
  }

  protected override updated(changed: PropertyValues) {
    const has = (name: string) => changed.has(name);
    const label = (this.label ?? '').trim();
    // AVT-9, AVT-19: one image named by label — whatever it draws — unless it is decorative (a member of a group is
    // always named); without a name it exposes nothing. AVT-8: inside a link or a Button the name is that element's.
    const named = label !== '' && (this.member || !this.decorative);
    hostAria(this, { role: named ? 'img' : null, 'aria-label': named ? label : null, 'aria-hidden': named ? null : 'true' });

    if ((has('label') || has('decorative') || has('member')) && label === '') {
      if (this.member) report(this, 'AVT-19', 'a member of a group has no label, so the group exposes nothing for it; give it the name it stands for');
      else if (!this.decorative) report(this, 'AVT-9', 'the avatar has no label, so it has no name; give it the name it stands for, or set decorative beside that name in text');
    }
    if (has('initials')) {
      const given = characters((this.initials ?? '').trim());
      if (given.length > INITIALS) report(this, 'AVT-5', `initials "${this.initials}" are ${given.length} characters; the first ${INITIALS} are drawn ("${this.drawnInitials}")`);
    }
  }

  protected override firstUpdated() {
    // AVT-23: the group's props mean nothing on an avatar that has no members: the group is <tanrei-avatar-group>.
    const stray = ['max', 'total', 'overflow-label'].filter((name) => this.hasAttribute(name));
    if (stray.length) report(this, 'AVT-23', `${stray.join(', ')} ${stray.length > 1 ? 'are' : 'is'} ignored on an avatar that has no members; the group form is <${GROUP}>`);
  }

  protected override render() {
    const address = this.address;
    const asked = address !== '' && !this.failed;
    const pictured = asked && this.loaded;
    const initials = pictured ? '' : this.drawnInitials;
    // AVT-2: exactly one of three — the picture once it has loaded, else the initials, else a glyph.
    const glyph = !pictured && initials === '';
    // AVT-6: the product's glyph, or the system's for the shape.
    const own = glyph && !this.hasIcon ? (this.shape === 'square' ? SYSTEM_GLYPHS.thing : SYSTEM_GLYPHS.person) : '';
    // AVT-5, AVT-6, AVT-9: nothing that is drawn is read — the name is the host's.
    return html`
      <span part="container" class="container ${classMap({ member: this.member, pictured })}" data-tanrei-shape aria-hidden="true">
        ${initials ? html`<span part="label" class="label">${initials}</span>` : nothing}
        <span part="icon" class="icon ${classMap({ own: !!own })}" ?hidden=${!glyph}
          >${own ? html`<span class="ink">${own}</span>` : nothing}<slot name="icon" @slotchange=${this.onSlotChange}></slot
        ></span>
        ${asked
          ? keyed(
              address,
              html`<img
                part="image"
                class="image ${classMap({ loaded: pictured })}"
                alt=""
                decoding="async"
                draggable="false"
                loading=${this.loading || nothing}
                referrerpolicy=${this.referrerPolicy || nothing}
                crossorigin=${this.crossOrigin ?? nothing}
                src=${address}
                @load=${this.onLoad}
                @error=${this.onError}
              />`,
            )
          : nothing}
      </span>
    `;
  }
}

/**
 * Several avatars drawn as one row in which each lies a little over the one before it, with a gap around each, and a
 * last box that counts the members it does not draw: the avatar's group form.
 *
 * Contract: specs/avatar.spec.json (AVT-16…AVT-23). `<tanrei-avatar-group label="Reviewers" max="4">` around
 * `<tanrei-avatar>` members. The group gives its `size` and `shape` to every member and makes each one named, whatever
 * its `decorative` says. `max` is the most boxes drawn, the overflow box included (six members with `max="4"` are three
 * members and "+3"); `total` is the real count where the product gives fewer members than exist. The members it does not
 * draw stay in the document as its children and are not drawn or exposed. Anything that is not a `<tanrei-avatar>` is
 * not a member and is not drawn.
 *
 * It is a group named by `label`, holding one named image per member it draws and then the overflow's text
 * (`overflow-label` or the product's words `avatarGroupOverflowLabel`, with `{count}` filled by the number not drawn;
 * else the drawn count). The overflow box is text, not a control: showing the people it counts is a
 * link or a Button beside the group.
 *
 * @tag tanrei-avatar-group
 * @slot - The members: `<tanrei-avatar>` elements, in order from the start edge.
 * @csspart overflow - The box that counts the members not drawn.
 * @csspart label - The count in the overflow box.
 */
export class TanreiAvatarGroup extends TanreiElement {
  private readonly availability = new AvailabilityController(this, 'avatar');
  private readonly words = new WordsController(this);
  static override styles = groupStyles;
  /** The group decides which of its children are drawn (AVT-17): the others stay in the document, assigned to no slot. */
  static override shadowRootOptions: ShadowRootInit = { ...LitElement.shadowRootOptions, slotAssignment: 'manual' };

  static override properties: PropertyDeclarations = {
    label: { type: String },
    max: { type: Number },
    total: { type: Number },
    overflowLabel: { type: String, attribute: 'overflow-label' },
    size: { type: String, reflect: true },
    shape: { type: String, reflect: true },
    members: { state: true },
  };

  /** The group's name ("Reviewers"): what assistive technology reads before its members. */
  label = '';

  /** The most boxes the group draws, the overflow box included; 0 draws every member. A whole number of 2 or more. */
  max = 0;

  /** How many members there are, where the product gives the group fewer than exist. Null (no attribute) counts the members given. */
  total: number | null = null;

  /**
   * What assistive technology reads for the overflow box: your sentence with the place `{count}`, which the group fills
   * with the number of members not drawn, in full ("{count} more"). Empty reads the product's words
   * (`setWords({ avatarGroupOverflowLabel })`); with neither, the drawn text ("+12").
   */
  overflowLabel = '';

  /** The size of every member and of the overflow box. */
  size: TanreiAvatarSize = 'medium';

  /** The shape of every member and of the overflow box. */
  shape: TanreiAvatarShape = 'circle';

  /** The members given: the `<tanrei-avatar>` children, in order. */
  protected members: TanreiAvatar[] = [];

  /** AVT-22: sizes and shapes a design system adds, and a value the active system does not have. */
  private readonly axes = new OpenAxesController(this, { component: 'avatar-group', behavior: 'AVT-22', axes: GROUP_AXES });

  /** AVT-23: the custom state the styles read to take an empty group out of the layout. */
  private readonly internals: ElementInternals | null = typeof this.attachInternals === 'function' ? this.attachInternals() : null;

  /** AVT-21: hears members come and go. A member's own changes are that avatar's to draw. */
  private children$: MutationObserver | null = null;

  private scan() {
    const members = [...this.children].filter((child): child is TanreiAvatar => child.localName === AVATAR);
    if (members.length !== this.members.length || members.some((member, index) => member !== this.members[index])) this.members = members;
  }

  /** AVT-22: max as used — 0 (every member) for 1, a negative number or one that is not whole. */
  private get limit(): number {
    const max = this.max;
    return typeof max === 'number' && Number.isInteger(max) && max >= 2 ? max : 0;
  }

  /** AVT-18, AVT-22: how many members there are — total, or the members given where total is null or cannot be right. */
  private get count(): number {
    const given = this.members.length;
    const total = this.total;
    return typeof total === 'number' && Number.isInteger(total) && total >= given ? total : given;
  }

  /**
   * AVT-17, AVT-18: how many of the members given are drawn. With an overflow box and a limit, one fewer than the
   * limit, or all of them where they fit within that; otherwise every one.
   */
  private get drawn(): number {
    const given = this.members.length;
    const limit = this.limit;
    const boxed = this.count > given || (limit > 0 && given > limit);
    return boxed && limit > 0 ? Math.min(given, limit - 1) : given;
  }

  /** The current locale: the nearest `lang`, else the browser's. */
  private locale(): string | undefined {
    const lang = this.closest('[lang]')?.getAttribute('lang') || (typeof navigator !== 'undefined' ? navigator.language : '');
    try {
      return Intl.getCanonicalLocales(lang)[0];
    } catch {
      return undefined;
    }
  }

  /**
   * AVT-19: what assistive technology reads for the overflow box — the product's sentence with `{count}` filled by the
   * number not drawn, in full and in the locale's digits without grouping (never cut at 99 as the drawn text is); empty
   * where there is no sentence.
   */
  private spoken(hidden: number): string {
    const sentence = (this.words.get('avatarGroupOverflowLabel', this.overflowLabel ?? '') ?? '').trim();
    if (!sentence) return '';
    const count = new Intl.NumberFormat(this.locale(), { useGrouping: false, maximumFractionDigits: 0 }).format(hidden);
    return fillPlaces(sentence, { count })
      .runs.map((run) => run.text)
      .join('');
  }

  /** AVT-17, AVT-18: the overflow box's text — a plus sign and the number not drawn, in the locale's digits without grouping; above 99, 99 and a plus sign, at every size. */
  private text(hidden: number): string {
    const format = new Intl.NumberFormat(this.locale(), { useGrouping: false, maximumFractionDigits: 0 });
    return hidden > COUNT_CAP ? `${format.format(COUNT_CAP)}+` : `+${format.format(hidden)}`;
  }

  override connectedCallback() {
    super.connectedCallback();
    this.scan();
    if (typeof MutationObserver !== 'undefined') {
      this.children$ ??= new MutationObserver(() => this.scan());
      this.children$.observe(this, { childList: true });
    }
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.children$?.disconnect();
  }

  protected override willUpdate() {
    // AVT-16: the group gives its size and its shape to every member it draws — whenever anything changes, since a
    // change of max or total draws members it did not draw before. (One it does not draw is in no slot, so it has no
    // style to read a size from: it is given the group's when it is drawn.)
    for (const member of this.members.slice(0, this.drawn)) {
      if (member.size !== this.size) member.size = this.size;
      if (member.shape !== this.shape) member.shape = this.shape;
    }
    // AVT-23: no members, no group.
    try {
      if (this.members.length === 0) this.internals?.states.add('empty');
      else this.internals?.states.delete('empty');
    } catch {
      // A browser without custom states: the empty group is a row of no size.
    }
  }

  protected override updated(changed: PropertyValues) {
    const has = (name: string) => changed.has(name);
    // AVT-17: the members drawn are the slot's; the others are assigned nowhere, so they are neither drawn nor exposed.
    const slot = this.renderRoot.querySelector('slot');
    if (slot && typeof slot.assign === 'function') slot.assign(...this.members.slice(0, this.drawn));

    // AVT-19: one group named by its label; without members it exposes nothing (AVT-23).
    const label = (this.label ?? '').trim();
    const shown = this.members.length > 0;
    hostAria(this, { role: shown ? 'group' : null, 'aria-label': shown && label ? label : null });

    if ((has('label') || has('members')) && shown && !label) {
      report(this, 'AVT-19', 'the group has no label, so its members are exposed without a group’s name; give it one ("Reviewers")');
    }
    // AVT-22: what a debug build tells the product about max and total.
    if (has('max') && this.max !== 0 && this.limit === 0) {
      report(this, 'AVT-22', `max ${this.max} is not a whole number of 2 or more; every member is drawn, as for 0`);
    }
    if ((has('total') || has('members')) && this.total !== null && this.total !== undefined && this.count !== this.total) {
      report(this, 'AVT-22', `total ${this.total} is not a whole number of at least the ${this.members.length} members given; the members given are counted`);
    }
    // AVT-19: what of the sentence is not its place, and a sentence that does not say how many.
    const sentence = shown && this.count > this.drawn ? (this.words.get('avatarGroupOverflowLabel', this.overflowLabel ?? '') ?? '').trim() : '';
    if (sentence) {
      const declared = wordPlaces.avatarGroupOverflowLabel ?? [];
      reportPlaces(this, 'AVT-19', 'overflowLabel', sentence, declared, 'it is read as it is written');
      for (const name of placeFaults(sentence, declared).absent) report(this, 'AVT-19', `overflow-label has no place {${name}}, so it does not say how many are not drawn; write it as "{${name}} more"`);
    }
    // AVT-23: a group's props with no members to count.
    if (!shown && (this.max !== 0 || (this.total !== null && this.total !== undefined) || (this.overflowLabel ?? '') !== '')) {
      report(this, 'AVT-23', 'max, total or overflow-label is set on a group that has no members; it draws nothing');
    }
  }

  protected override render() {
    const hidden = this.count - this.drawn;
    const spoken = hidden > 0 ? this.spoken(hidden) : '';
    // AVT-19: the members in the order given, then the overflow's text — the product's sentence, or the text as drawn.
    return html`
      <span class="row" ?hidden=${this.members.length === 0}>
        <slot></slot>
        ${hidden > 0
          ? html`<span part="overflow" class="container member overflow" data-tanrei-shape
              ><span part="label" class="label count" aria-hidden=${spoken ? 'true' : nothing}>${this.text(hidden)}</span
              >${spoken ? html`<span class="spoken">${spoken}</span>` : nothing}</span
            >`
          : nothing}
      </span>
    `;
  }
}

if (!customElements.get(AVATAR)) customElements.define(AVATAR, TanreiAvatar);
if (!customElements.get(GROUP)) customElements.define(GROUP, TanreiAvatarGroup);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-avatar': TanreiAvatar;
    'tanrei-avatar-group': TanreiAvatarGroup;
  }
}
