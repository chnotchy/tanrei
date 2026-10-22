// The preview's five screens: a product built from Tanrei's own components, drawn inside the preview's scope, so
// that everything in them — the components and the screens' own layout (studio.css, "Preview: the screens") — is
// drawn with the system being edited. Nothing here holds a design value: the layout reads tokens, the components
// read theirs.
//
// What a screen draws of the system itself comes from the model: one sample per variant and per size a component
// declares (a variant a layer adds is drawn with the others), the steps of the series, the layer's own tokens.
import { emphasisFamily } from '../core.js';
import type { StudioStrings } from '../strings';
import { type Ctx, type Json, format, h, ltr } from './dom';

export const SCREENS = ['overview', 'dashboard', 'settings', 'list', 'docs'] as const;
export type Screen = (typeof SCREENS)[number];

/** Text styles by level: a heading of each face, running text, a label, code. Roles a layer adds follow. */
const RAMP = ['heading-1', 'heading-3', 'body', 'label', 'code'];
/** The same icons, unselected and selected: what the system's icon set, weight and fills make of them. */
const ICON_SET = ['home', 'favorite', 'bookmark', 'notifications', 'settings'];
const SPACES = ['space50', 'space100', 'space200', 'space300', 'space400'];
const CORNERS = ['extra-small', 'small', 'medium', 'large', 'extra-large'];
/** The heights of the dashboard's bars, in per cent of the chart: data, not a design value. */
const BARS = [40, 72, 55, 30, 66, 45, 80, 52, 61, 38, 75, 58];
/** Amounts are written in dollars and shown in each language's currency, at about its size. */
const RATE: Record<string, number> = { USD: 1, EUR: 1, JPY: 150, CNY: 7, INR: 80, SAR: 4 };
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

/**
 * The values a component's variant axis declares, as the model holds them: the `variant` axis, or — for a component
 * whose variants are its states' first word (a button: filled, tonal…) — those states. Only for a component whose
 * element has a `variant` property: a checkbox's states (selected, error-…) are no variants.
 */
export function variantsOf(view: Json, component: string, tagPrefix: string): string[] {
  const declared = view.model.components?.[component];
  if (!declared) return [];
  const element = customElements.get(`${tagPrefix}-${component}`) as (CustomElementConstructor & { elementProperties?: Map<string, unknown> }) | undefined;
  if (element?.elementProperties && !element.elementProperties.has('variant')) return [];
  return declared.axes?.variant?.values ?? declared.states?.variants ?? [];
}
const sizesOf = (view: Json, component: string): string[] => view.model.components?.[component]?.axes?.size?.values ?? [];

/** What drawing a screen needs: the context, the computed view, a prefix for ids that are this pane's own. */
export interface Drawing {
  ctx: Ctx;
  view: Json;
  /** Unique within the page: two panes draw the same screen. */
  uid: string;
  /**
   * Said after the name of each landmark the screen draws (its navigation, its search, its table of contents), where
   * two panes draw the same screen side by side: the second pane's landmarks are told from the first's.
   */
  distinct?: string;
}

export function drawScreen(screen: Screen, drawing: Drawing): HTMLElement {
  const make = { overview, dashboard, settings, list, docs }[screen];
  return h('div', { class: `ts-screen ts-screen-${screen}`, 'data-screen': screen }, make(drawing));
}

// ── pieces every screen uses ───────────────────────────────────────────────────────────────────────
function kit({ ctx, view, distinct }: Drawing) {
  const { studio, t } = ctx;
  const s = t.screens;
  const NS = studio.namespace;
  const tag = (name: string) => `${studio.tagPrefix}-${name}` as 'div';
  /** A Tanrei element: `el('button', { variant: 'tonal' }, 'Save')`. */
  const el = (name: string, attrs: Json = {}, ...children: (Node | string | null | (Node | string | null)[])[]) => h(tag(name), attrs, ...children);
  const icon = (name: string, attrs: Json = {}) => h('span', { class: `${studio.tagPrefix}-icon`, 'aria-hidden': 'true', translate: 'no', ...attrs }, name);
  const slotIcon = (name: string) => icon(name, { slot: 'icon' });
  const typescale = `${NS}.sys.typescale.`;
  const font = (role: string) => `font: var(${studio.cssVar(`${typescale}${role}`)}-font); letter-spacing: var(${studio.cssVar(`${typescale}${role}`)}-letter-spacing);`;
  const text = (role: string, tagName: 'h3' | 'h4' | 'h5' | 'p' | 'span', words: string, attrs: Json = {}) => h(tagName, { style: font(role), ...attrs }, words);
  const currency = s.currency;
  const money = new Intl.NumberFormat(s.locale, { style: 'currency', currency, maximumFractionDigits: 0 });
  const amount = (dollars: number) => money.format(Math.round((dollars * (RATE[currency] ?? 1)) / 10) * 10);
  const number = new Intl.NumberFormat(s.locale);
  const percent = new Intl.NumberFormat(s.locale, { style: 'percent', maximumFractionDigits: 1, signDisplay: 'exceptZero' });
  const date = new Intl.DateTimeFormat(s.locale, { dateStyle: 'long', timeZone: 'UTC' });
  const year = new Intl.DateTimeFormat(s.locale, { year: 'numeric', timeZone: 'UTC' });
  const appBar = (headline: string, ...actions: Node[]) =>
    el(
      'app-bar',
      { headline, 'divider-visibility': 'always', 'heading-level': 3 },
      el('button', { slot: 'navigation', variant: 'text', label: s.common.menu }, slotIcon('menu')),
      el('button', { slot: 'actions', variant: 'text', label: s.common.search }, slotIcon('search')),
      el('button', { slot: 'actions', variant: 'text', label: s.common.notifications }, slotIcon('notifications')),
      ...actions,
    );
  const avatar = (initials: string, label: string, size = 'small', attrs: Json = {}) => el('avatar', { initials, label, size, ...attrs });
  const landmark = (label: string) => (distinct ? t.named(label, distinct) : label);
  return { studio, t, s, NS, el, icon, slotIcon, font, text, amount, number, percent, date, year, appBar, avatar, landmark, view, typescale };
}
type Kit = ReturnType<typeof kit>;

const section = (k: Kit, title: string, ...children: (Node | null)[]) => h('section', { class: 'ts-s-panel' }, k.text('label', 'h3', title, { class: 'ts-s-eyebrow' }), ...children);
const row = (attrs: Json, ...children: (Node | Node[] | null)[]) => h('div', { class: 'ts-s-row', ...attrs }, ...children);

// ── overview: every kind of component once, then what the system itself is made of ──────────────────
function overview(drawing: Drawing) {
  const k = kit(drawing);
  const { s, el, view, studio, slotIcon } = k;
  const o = s.overview;
  const variants = (component: string) => variantsOf(view, component, studio.tagPrefix);
  const buttons = section(
    k,
    o.buttons,
    row({ 'data-sample': 'variants' }, variants('button').map((variant) => el('button', { variant }, cap(variant)))),
    row({ 'data-sample': 'sizes' }, sizesOf(view, 'button').map((size) => el('button', { size }, cap(size))), el('button', { disabled: true }, k.t.sample.disabled)),
    row(
      { 'data-sample': 'icons' },
      el('button', {}, slotIcon('add'), o.add),
      el('button', { variant: 'tonal', size: 'small' }, slotIcon('edit'), k.s.common.edit),
      toggle(k, false),
      toggle(k, true),
      el('button', { variant: 'tonal', label: o.favorite }, slotIcon('favorite')),
      el('button', { variant: 'filled', destructive: true, size: 'small' }, o.delete),
    ),
  );
  const inputs = section(
    k,
    o.inputs,
    el('text-field', { label: o.email, type: 'email', placeholder: s.person.email, 'supporting-text': o.emailHint }),
    el('select-field', { label: o.plan, value: 'pro' }, ...(['free', 'pro', 'team'] as const).map((plan) => el('option', { value: plan, label: o.plans[plan] }))),
  );
  const selection = section(
    k,
    o.selection,
    el('switch', { label: o.notify, checked: true }),
    el('checkbox', { label: o.terms, checked: true }),
    el('radio-group', { label: o.view, value: 'list', orientation: 'horizontal' }, el('radio-button', { value: 'list', label: o.list }), el('radio-button', { value: 'grid', label: o.grid })),
    el('slider', { label: o.volume, value: 60 }),
  );
  const tabs = (variant: string) => el('tabs', { variant, value: 'week', label: o.period, 'data-sample': `tabs-${variant}` }, el('tab', { value: 'day', label: o.day }), el('tab', { value: 'week', label: o.week }), el('tab', { value: 'month', label: o.month }));
  const tagWords = [o.published, o.review, o.drafted];
  const choosing = section(
    k,
    o.choosing,
    ...variants('tabs').map(tabs),
    row(
      { 'data-sample': 'chip-variants' },
      variants('chip').map((variant, i) => el('chip', { kind: 'filter', variant, label: [o.unread, o.important][i % 2], selected: i === 0 })),
      el('chip', { kind: 'input', label: o.design, 'remove-label': s.common.remove.replace('{name}', o.design) }),
    ),
    row({ 'data-sample': 'tag-variants' }, variants('tag').map((variant, i) => el('tag', { variant, label: tagWords[i % tagWords.length], status: ['success', 'warning', undefined][i % 3] }))),
  );
  const feedback = section(
    k,
    o.feedback,
    ...variants('callout').map((variant) => el('callout', { variant, status: 'info', headline: o.updateTitle, 'data-sample': `callout-${variant}` }, o.updateBody)),
    el('progress-indicator', { label: o.uploading, value: 0.64 }),
    row({}, k.avatar(s.person.initials, s.person.full, 'medium'), el('badge', { count: 3, label: o.messages(3) }, el('button', { variant: 'text', label: s.common.notifications }, slotIcon('notifications')))),
  );
  const surfaces = section(
    k,
    o.surfaces,
    ...variants('card').map((variant) =>
      el(
        'card',
        { variant, 'data-sample': `card-${variant}` },
        h('div', { class: 'ts-s-stack ts-s-pad' }, k.text('heading-5', 'h4', o.reportTitle), k.text('body-small', 'p', o.reportBody, { class: 'ts-s-muted' }), row({}, el('button', { variant: 'tonal', size: 'small' }, o.open))),
      ),
    ),
    el('menu', { inline: true, open: true }, el('menu-item', { label: o.copy, 'leading-icon': 'content_copy', shortcut: 'mod+c' }), el('menu-item', { label: o.duplicate, 'leading-icon': 'library_add' }), el('menu-item', { label: o.delete, 'leading-icon': 'delete', destructive: true })),
  );
  return h('div', { class: 'ts-s-overview' }, buttons, inputs, selection, choosing, feedback, surfaces, system(k));
}

/** A toggle is the system's own: a real Button that switches, its glyph filled while it is on (BTN-13). */
function toggle(k: Kit, pressed: boolean) {
  const { t } = k;
  const label = h('span', { text: pressed ? t.sample.selected : t.sample.unselected });
  const el = h(`${k.studio.tagPrefix}-button` as 'tanrei-button', { toggle: true, variant: 'outlined', size: 'small', selected: pressed, 'data-sample-toggle': true, onchange: () => (label.textContent = el.selected ? t.sample.selected : t.sample.unselected) }, k.slotIcon('favorite'), label);
  return el;
}

/** What the system itself is made of: its text styles, its icons, its intents, its steps, and the layer's own tokens. */
function system(k: Kit) {
  const { t, view, studio, NS, typescale, icon } = k;
  const tokens = view.model.tokens as Record<string, Json>;
  const v = (id: string) => `var(${studio.cssVar(id)})`;
  const font = (id: string) => `font: var(${studio.cssVar(id)}-font); letter-spacing: var(${studio.cssVar(id)}-letter-spacing);`;
  const added = (prefix: string, core: string[]) => Object.keys(tokens).filter((id) => id.startsWith(prefix) && tokens[id].vocabulary?.extension && !core.includes(id.slice(prefix.length)));
  /**
   * Emphasis is a weight step, not a role: the sheet's `<role>-font-weight-emphasized` — the role's weight plus its
   * family's `sys.typescale.emphasis.*` — read live, so a step edited anywhere in the Studio moves the sample. The
   * same sum is the fallback, for a sheet that predates the property.
   */
  const emphasizedWeight = (id: string) => `var(${studio.cssVar(id)}-font-weight-emphasized, calc(var(${studio.cssVar(id)}-font-weight) + var(${studio.cssVar(`${NS}.sys.typescale.emphasis.${emphasisFamily(id.slice(typescale.length))}`)})))`;
  const texts: Record<string, string> = { 'heading-1': t.sample.headline, 'heading-3': t.sample.title, body: t.sample.body, label: t.sample.label, code: t.sample.code };
  const ramp = [...RAMP.map((role) => `${typescale}${role}`), ...added(typescale, RAMP)];
  const own = Object.values(tokens).filter((token) => token.namespace !== NS);
  // `data-selected` on a region selects every icon in it (icons.css): the family of that state AND its fill.
  const iconRow = (selected: boolean) => h('div', { class: 'ts-icon-row', 'data-icon-row': selected ? 'selected' : 'unselected', 'data-selected': selected ? 'true' : undefined }, h('span', { class: 'ts-icon-row-label', style: font(`${typescale}label-small`), text: selected ? t.sample.selected : t.sample.unselected }), ICON_SET.map((name) => icon(name)));
  return h(
    'section',
    { class: 'ts-s-panel ts-s-system' },
    k.text('label', 'h3', k.s.overview.system, { class: 'ts-s-eyebrow' }),
    // The line of code is a left-to-right run in every language: a command, then its comment.
    h('div', { class: 'ts-ramp' }, ramp.map((id) => h('p', { style: font(id), 'data-font': font(id), 'data-sample': id.slice(typescale.length), 'data-emphasized-weight': emphasizedWeight(id) }, id === `${typescale}code` ? ltr(texts.code) : (texts[id.slice(typescale.length)] ?? t.listed(id.slice(typescale.length), t.sample.added))))),
    h('div', { class: 'ts-icon-set', 'data-sample': 'icon-set' }, iconRow(false), iconRow(true)),
    h(
      'div',
      { class: 'ts-intents', 'data-intents': true },
      view.intents.map((intent: string) => h('span', { class: 'ts-intent' }, h('span', { style: `background: var(${studio.roleVar(intent)}); color: var(${studio.roleVar(`on-${intent}`)});`, text: intent }), h('span', { style: `background: var(${studio.roleVar(`${intent}-container`)}); color: var(${studio.roleVar(`on-${intent}-container`)});`, text: 'Aa' }))),
      // A single role a layer declared, drawn with the role it names as its content.
      Object.entries(view.model.colors.light as Json)
        .filter(([, token]) => (token as Json).vocabulary?.extension)
        .map(([role, token]) => h('span', { class: 'ts-intent' }, h('span', { style: `background: var(${studio.roleVar(role)}); color: ${(token as Json).vocabulary.onRole ? v((token as Json).vocabulary.onRole) : 'inherit'};`, text: role }))),
    ),
    h(
      'div',
      { class: 'ts-measures', 'aria-hidden': 'true' },
      h('div', { class: 'ts-spaces' }, [...SPACES.map((step) => `${NS}.sys.space.${step}`), ...added(`${NS}.sys.space.`, SPACES)].map((id) => h('i', { style: `inline-size: ${v(id)};`, 'data-step': id }))),
      h('div', { class: 'ts-corners' }, [...CORNERS.map((step) => `${NS}.sys.shape.corner.${step}`), ...added(`${NS}.sys.shape.corner.`, CORNERS)].map((id) => h('i', { style: `border-radius: ${v(id)};`, 'data-step': id }))),
    ),
    own.length
      ? h(
          'div',
          { class: 'ts-own', 'data-own': true },
          h('span', { class: 'ts-s-eyebrow', style: font(`${typescale}label-small`), text: t.sample.yours }),
          own.map((token) =>
            h(
              'div',
              { class: 'ts-own-row', style: font(`${typescale}label-small`), 'data-own-token': token.id },
              token.type === 'color' ? h(`${studio.tagPrefix}-swatch` as 'div', { class: 'ts-own-swatch', decorative: true, size: 'small', shape: 'circle', color: v(token.id) }) : token.type === 'dimension' ? h('i', { class: 'ts-own-bar', style: `inline-size: ${v(token.id)};` }) : h('i'),
              h('span', { dir: 'ltr', text: token.id }),
              h('span', { dir: 'ltr', 'data-own-value': true, text: format(token.type, token.value) }),
            ),
          ),
        )
      : null,
  );
}

// ── dashboard: an app's home, with its navigation ─────────────────────────────────────────────────
function navigation(k: Kit, value: string) {
  const d = k.s.dashboard;
  const item = (key: string, label: string, icon: string, attrs: Json = {}) => k.el('navigation-drawer-item', { value: key, label, icon, ...attrs });
  return k.el(
    'navigation-drawer',
    { open: true, value, label: k.landmark(k.s.common.navigation) },
    k.el('navigation-drawer-section', { headline: d.workspace, 'heading-level': 4 }, item('home', d.home, 'home'), item('orders', d.orders, 'receipt_long', { 'trailing-text': k.number.format(12) }), item('customers', d.customers, 'group'), item('reports', d.reports, 'monitoring')),
    k.el('navigation-drawer-section', { headline: d.manage, divider: true, 'heading-level': 4 }, item('settings', d.settings, 'settings'), item('help', d.help, 'help')),
  );
}

function dashboard(drawing: Drawing) {
  const k = kit(drawing);
  const { s, el, slotIcon, amount, percent } = k;
  const d = s.dashboard;
  const kpi = (label: string, value: string, delta: number) =>
    el('card', { variant: 'outlined' }, h('div', { class: 'ts-s-kpi ts-s-pad' }, k.text('body-small', 'span', label, { class: 'ts-s-muted' }), k.text('heading-3', 'span', value), el('tag', { label: percent.format(delta), status: delta < 0 ? 'error' : 'success', size: 'small' })));
  const orders: [number, string, 'shipped' | 'preparing' | 'cancelled', number][] = [
    [1024, s.customers.a.name, 'shipped', 320],
    [1023, s.customers.b.name, 'preparing', 84],
    [1022, s.customers.c.name, 'cancelled', 0],
  ];
  const STATUS = { shipped: 'success', preparing: 'warning', cancelled: 'error' } as const;
  const share = new Intl.NumberFormat(s.locale, { style: 'percent' });
  const cell = (text: string, attrs: Json = {}) => h('td', attrs, text);
  return h(
    'div',
    { class: 'ts-s-app' },
    k.appBar(d.title, k.avatar(s.person.initials, s.common.account, 'small', { slot: 'actions' })),
    h(
      'div',
      { class: 'ts-s-app-body' },
      navigation(k, 'home'),
      h(
        'div',
        { class: 'ts-s-content' },
        h(
          'div',
          { class: 'ts-s-row ts-s-between' },
          k.text('heading-3', 'h4', d.greeting.replace('{name}', s.person.called)),
          h('div', { class: 'ts-s-row' }, el('button', { variant: 'outlined', size: 'small' }, slotIcon('download'), d.export), el('button', { size: 'small' }, slotIcon('person_add'), d.invite)),
        ),
        h('div', { class: 'ts-s-grid ts-s-kpis' }, kpi(d.revenue, amount(22844), 0.033), kpi(d.expenses, amount(2511), -0.012), kpi(d.orders, k.number.format(458), 0.081), kpi(d.profit, amount(20333), 0.041)),
        h(
          'div',
          { class: 'ts-s-grid ts-s-two' },
          el(
            'card',
            { variant: 'outlined' },
            h(
              'div',
              { class: 'ts-s-stack ts-s-pad' },
              h('div', { class: 'ts-s-row ts-s-between' }, k.text('heading-5', 'h5', d.trend), el('tabs', { value: 'two', label: d.trend, variant: 'secondary', size: 'small' }, el('tab', { value: 'two', label: d.twoWeeks }), el('tab', { value: 'month', label: d.month }))),
              h('div', { class: 'ts-s-bars', role: 'img', 'aria-label': d.chart }, BARS.map((height) => h('span', { style: `block-size: ${height}%;` }))),
            ),
          ),
          el(
            'card',
            { variant: 'outlined' },
            h(
              'div',
              { class: 'ts-s-stack ts-s-pad' },
              k.text('heading-5', 'h5', d.goals),
              ...(
                [
                  [d.quarter, 0.72],
                  [d.newCustomers, 0.45],
                ] as const
              ).map(([label, value]) => h('div', { class: 'ts-s-stack ts-s-tight' }, h('div', { class: 'ts-s-row ts-s-between' }, k.text('body-small', 'span', label), k.text('label', 'span', share.format(value))), el('progress-indicator', { label, value, 'value-text': share.format(value) }))),
              el('callout', { status: 'success', 'status-label': d.reached }, d.reachedBody),
            ),
          ),
        ),
        el(
          'table',
          {},
          h(
            'table',
            {},
            h('caption', {}, d.recent),
            h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, d.order), h('th', { scope: 'col' }, d.customer), h('th', { scope: 'col' }, d.status), h('th', { scope: 'col', 'data-align': 'end' }, d.amount))),
            h(
              'tbody',
              {},
              orders.map(([id, customer, status, dollars]) => h('tr', {}, cell(`#${id}`), cell(customer), h('td', {}, el('tag', { label: d[status], status: STATUS[status], size: 'small' })), cell(amount(dollars), { 'data-align': 'end' }))),
            ),
          ),
        ),
      ),
    ),
  );
}

// ── settings: a form ──────────────────────────────────────────────────────────────────────────────
function settings(drawing: Drawing) {
  const k = kit(drawing);
  const { s, el } = k;
  const f = s.settings;
  const given = el('text-field', { label: f.first, value: s.person.first, autocomplete: 'given-name' });
  const family = el('text-field', { label: f.last, value: s.person.last, autocomplete: 'family-name' });
  return h(
    'div',
    { class: 'ts-s-form' },
    h('div', { class: 'ts-s-stack ts-s-tight' }, k.text('heading-3', 'h3', f.title), k.text('body', 'p', f.intro, { class: 'ts-s-muted' })),
    el('tabs', { value: 'profile', label: f.sections }, el('tab', { value: 'profile', label: f.profile }), el('tab', { value: 'notify', label: f.notifications }), el('tab', { value: 'billing', label: f.billing })),
    h(
      'section',
      { class: 'ts-s-panel' },
      h('div', { class: 'ts-s-grid ts-s-two-fields' }, ...(s.person.order === 'family-given' ? [family, given] : [given, family])),
      el('text-field', { label: f.email, type: 'email', value: s.person.email, required: true, 'required-text': f.required, autocomplete: 'email' }),
      el('select-field', { label: f.zone, value: 'home' }, el('option', { value: 'home', label: f.zones.home }), el('option', { value: 'other', label: f.zones.other })),
      el('text-field', { label: f.bio, multiline: true, 'min-rows': 3, counter: true, maxlength: 160 }),
    ),
    h(
      'section',
      { class: 'ts-s-panel' },
      k.text('heading-5', 'h4', f.notifications),
      el('switch', { label: f.comments, checked: true }),
      el('switch', { label: f.weekly }),
      el('radio-group', { label: f.frequency, value: 'daily' }, el('radio-button', { value: 'now', label: f.now }), el('radio-button', { value: 'daily', label: f.daily }), el('radio-button', { value: 'never', label: f.never })),
    ),
    el('callout', { status: 'warning', headline: f.twoStep }, f.twoStepBody),
    h('div', { class: 'ts-s-row ts-s-end' }, el('button', { variant: 'text' }, s.common.cancel), el('button', {}, f.saveChanges)),
  );
}

// ── list and detail ───────────────────────────────────────────────────────────────────────────────
function list(drawing: Drawing) {
  const k = kit(drawing);
  const { s, el, slotIcon, amount, avatar } = k;
  const l = s.list;
  const plans = s.overview.plans;
  const people = [
    ['a', plans.pro],
    ['b', plans.team],
    ['c', l.trial],
    ['d', plans.free],
  ] as const;
  const [first] = people;
  const customer = s.customers[first[0]];
  return h(
    'div',
    { class: 'ts-s-app' },
    k.appBar(l.title, avatar(s.person.initials, s.common.account, 'small', { slot: 'actions' })),
    h(
      'div',
      { class: 'ts-s-split' },
      h(
        'div',
        { class: 'ts-s-list' },
        el('search', { label: k.landmark(l.find), placeholder: l.findHint }),
        h('div', { class: 'ts-s-row' }, el('chip', { kind: 'filter', label: l.all, selected: true }), el('chip', { kind: 'filter', label: l.paying }), el('chip', { kind: 'filter', label: l.trial })),
        el(
          'list',
          { label: l.title, dividers: true, selection: 'single', value: first[0] },
          people.map(([key, plan]) => el('list-item', { value: key }, el('list-row', { headline: s.customers[key].name, 'supporting-text': s.customers[key].email, 'trailing-text': plan }, avatar(s.customers[key].initials, s.customers[key].name, 'small', { slot: 'leading', decorative: true })))),
        ),
      ),
      h(
        'div',
        { class: 'ts-s-detail' },
        h(
          'div',
          { class: 'ts-s-row ts-s-between' },
          h('div', { class: 'ts-s-row' }, avatar(customer.initials, customer.name, 'large', { decorative: true }), h('div', { class: 'ts-s-stack ts-s-tight' }, k.text('heading-4', 'h4', customer.name), k.text('body-small', 'span', l.since.replace('{year}', k.year.format(Date.UTC(2024, 3, 1))), { class: 'ts-s-muted' }))),
          h('div', { class: 'ts-s-row' }, el('button', { variant: 'outlined', size: 'small' }, slotIcon('mail'), l.email), el('button', { size: 'small' }, slotIcon('edit'), s.common.edit)),
        ),
        el('tabs', { value: 'overview', label: l.tabs }, el('tab', { value: 'overview', label: l.overview }), el('tab', { value: 'orders', label: l.orders }), el('tab', { value: 'notes', label: l.notes })),
        h(
          'div',
          { class: 'ts-s-grid ts-s-kpis' },
          ...(
            [
              [l.spent, amount(4820)],
              [l.count, k.number.format(31)],
              [l.plan, plans.pro],
            ] as const
          ).map(([label, value]) => el('card', { variant: 'filled' }, h('div', { class: 'ts-s-kpi ts-s-pad' }, k.text('body-small', 'span', label, { class: 'ts-s-muted' }), k.text('heading-4', 'span', value)))),
        ),
        el('callout', { status: 'info', 'status-label': l.info }, l.invoice.replace('{date}', k.date.format(Date.UTC(2026, 10, 1)))),
      ),
    ),
  );
}

// ── a documentation page: a header, a sidebar, the text, a live example, code, a table of contents ─────────
function docs(drawing: Drawing) {
  const k = kit(drawing);
  const { s, el, slotIcon, studio } = k;
  const p = s.docs;
  const o = s.overview;
  const anchor = (id: string) => `${drawing.uid}-${id}`;
  const header = el(
    'app-bar',
    { headline: 'Tanrei', 'divider-visibility': 'always', 'heading-level': 3 },
    el('select', { slot: 'actions', label: p.system, 'label-hidden': true, value: 'mine', size: 'small' }, el('option', { value: 'mine', label: drawing.view.system.name ?? drawing.view.layer.id })),
    el('button', { slot: 'actions', variant: 'text', label: s.common.search }, slotIcon('search')),
    el('button', { slot: 'actions', variant: 'text', label: p.colorMode }, slotIcon('contrast')),
    el('button', { slot: 'actions', variant: 'text', label: p.language }, slotIcon('translate')),
  );
  const nav = el(
    'navigation-drawer',
    { open: true, value: 'button', label: k.landmark(p.nav) },
    el('navigation-drawer-section', { headline: p.start, 'heading-level': 4 }, el('navigation-drawer-item', { value: 'intro', label: p.intro }), el('navigation-drawer-item', { value: 'web', label: p.web })),
    el('navigation-drawer-section', { headline: p.components, 'heading-level': 4 }, ...(['button', 'card', 'dialog', 'tabs'] as const).map((name) => el('navigation-drawer-item', { value: name, label: p[name] }))),
  );
  const code = `<${studio.tagPrefix}-button variant="filled">${s.common.save}</${studio.tagPrefix}-button>`;
  const article = h(
    'article',
    { class: `ts-s-article ${studio.tagPrefix}-prose` },
    h('h3', {}, p.button),
    h('p', { class: 'ts-s-lead' }, p.lead),
    h('p', {}, p.body),
    h('div', { class: `ts-s-demo ${studio.tagPrefix}-not-prose` }, el('button', { variant: 'filled' }, s.common.save), el('button', { variant: 'tonal' }, o.draft), el('button', { variant: 'outlined' }, s.common.cancel), el('button', { variant: 'text' }, o.details)),
    h('h4', { id: anchor('usage') }, p.usage),
    el('code-block', { class: `${studio.tagPrefix}-not-prose`, language: 'html', code, label: p.code }),
    el('callout', { class: `${studio.tagPrefix}-not-prose`, status: 'info', headline: p.tipTitle }, p.tip),
    h('h4', { id: anchor('sizes') }, p.sizes),
    h('p', {}, p.sizesBody),
  );
  const toc = h('aside', { class: 'ts-s-toc', 'aria-label': k.landmark(p.toc) }, el('table-of-contents', { label: p.toc, tracking: 'manual', current: `#${anchor('usage')}` }, h('a', { href: `#${anchor('usage')}` }, p.usage), h('a', { href: `#${anchor('sizes')}` }, p.sizes)));
  return h('div', { class: 'ts-s-app' }, header, h('div', { class: 'ts-s-docs' }, nav, article, toc));
}
