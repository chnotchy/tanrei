import { CONFIG } from '../config.js';
import { GENERATED_HEADER, cssColor, kebab, typeFamily } from '../pure.js';

const PREFIX = CONFIG.web.cssPrefix;
const varName = (path) => `${PREFIX}-${kebab(path)}`;
/** The custom property of a token id. A layer's own tokens keep their own prefix: `acme.comp.rating.gap` → `--acme-comp-rating-gap`. */
export const idToVar = (id) => (id.startsWith(`${CONFIG.namespace}.`) ? varName(id.split('.').slice(1)) : `--${kebab(id.split('.'))}`);
const ref = (id) => `var(${idToVar(id)})`;

// Shape, borders, focus rings and shadows stay in px so they do not grow with text.
// Everything else scales with the root font size (200% text resize).
const PX_GROUPS = ['shape', 'border', 'stroke', 'focus', 'elevation', 'outline'];
function dimension(value, path) {
  if (value.unit !== 'px') return `${value.value}${value.unit}`;
  if (value.value === 0) return '0px';
  if (PX_GROUPS.some((g) => path.includes(g))) return `${value.value}px`;
  return `${+(value.value / 16).toFixed(4)}rem`;
}

const duration = (v) => `${v.value}${v.unit}`;
const bezier = (v) => `cubic-bezier(${v.join(', ')})`;
const fontFamily = (v) => v.map((f) => (/[\s]/.test(f) ? `"${f}"` : f)).join(', ');

// No elevation is an empty list of layers. `none` would be the obvious spelling, but an elevation token is
// composed into lists — `box-shadow: inset 0 0 0 1px …, var(--tanrei-sys-elevation-level0)`, and Tailwind's
// `--tw-shadow` — where `none` invalidates the whole declaration. One zero-sized transparent layer draws nothing
// and is valid alone and inside a list.
const NO_SHADOW = '0 0 0 0 transparent';
function shadow(token) {
  if (token.value.length === 0) return NO_SHADOW;
  return token.value
    .map((layer, i) => {
      const color = token.partialAlias?.[i]?.color ? ref(token.partialAlias[i].color) : cssColor(layer.color);
      const px = (d) => (d.value === 0 ? '0' : `${d.value}px`);
      return `${layer.inset ? 'inset ' : ''}${px(layer.offsetX)} ${px(layer.offsetY)} ${px(layer.blur)} ${px(layer.spread)} ${color}`;
    })
    .join(', ');
}

// Runtime dials: a `mul` rule is emitted as the same arithmetic in CSS, so overriding a
// `--tanrei-dial-*` property moves every derived token live. Rounding mirrors the build (0.25px, 1ms),
// which keeps build-time and runtime results identical at a 16px root. Tone mapping cannot run in CSS,
// so colors stay build-time values.
function derivedExpression(rule, type) {
  if (!rule || rule.fn !== 'mul') return null;
  const of = ref(rule.of.slice(1, -1));
  if (rule.by === 1 && rule.exp === undefined) return of;
  const exponent = typeof rule.exp === 'string' ? ref(rule.exp.slice(1, -1)) : rule.exp;
  const coefficient = rule.exp === undefined ? String(rule.by) : `pow(${rule.by}, ${exponent})`;
  if (type === 'number') return `calc(${of} * ${coefficient})`;
  return `round(nearest, calc(${of} * ${coefficient}), ${type === 'duration' ? '1ms' : '0.25px'})`;
}

// A computed color is emitted as the same computation over role variables, so it follows the scheme,
// the contrast level and a re-pointed palette by itself. color-mix(in srgb) interpolates premultiplied,
// exactly like the engine's mixColors, so build-time values and the browser agree.
function colorExpression(rule) {
  const amount = (v) => (typeof v === 'string' ? `calc(${ref(v.slice(1, -1))} * 100%)` : `${+(v * 100).toFixed(4)}%`);
  if (rule?.fn === 'mix') return `color-mix(in srgb, ${ref(rule.base.slice(1, -1))}, ${ref(rule.with.slice(1, -1))} ${amount(rule.amount)})`;
  if (rule?.fn === 'alpha') return `color-mix(in srgb, ${ref(rule.of.slice(1, -1))} ${amount(rule.amount)}, transparent)`;
  return null;
}

/**
 * One token → one or more `[name, value]` declarations. Exported for Theme Studio, which writes a dragged dial — and
 * the few declarations that follow it as literals — the way this emitter writes them, without emitting the sheet.
 */
export function declarations(token) {
  const name = idToVar(token.id);
  if (token.alias && token.type !== 'typography') return [[name, ref(token.alias)]];
  // A choice of kind reaches CSS as its NAME — `--tanrei-sys-behavior-pressed-feedback: ripple` — so
  // a stylesheet can ask `@container style(--tanrei-sys-behavior-pressed-feedback: ripple)` and a script can read the
  // computed value. The index never leaves the build.
  if (token.enum) {
    const chosen = token.enum.values?.[token.value];
    if (typeof chosen !== 'string') throw new Error(`css: ${token.id}: ${JSON.stringify(token.value)} is not an index into dev.tanrei.enum.values`);
    return [[name, chosen]];
  }
  const live = token.type !== 'typography' && derivedExpression(token.derive, token.type);
  if (live) return [[name, live]];
  switch (token.type) {
    case 'color':
      return [[name, colorExpression(token.derive) ?? cssColor(token.value)]];
    case 'dimension':
      return [[name, dimension(token.value, token.path)]];
    case 'duration':
      return [[name, duration(token.value)]];
    case 'cubicBezier':
      return [[name, bezier(token.value)]];
    case 'number':
    case 'fontWeight':
      return [[name, String(token.value)]];
    case 'fontFamily':
      return [[name, fontFamily(token.value)]];
    case 'shadow':
      return [[name, shadow(token)]];
    case 'typography': {
      if (token.alias) {
        const target = idToVar(token.alias);
        return ['font-family', 'font-size', 'font-weight', 'font-weight-emphasized', 'letter-spacing', 'line-height', 'font'].map((p) => [
          `${name}-${p}`,
          `var(${target}-${p})`,
        ]);
      }
      const v = token.value;
      const family = token.partialAlias?.fontFamily ? ref(token.partialAlias.fontFamily) : fontFamily(v.fontFamily);
      const size = derivedExpression(token.derive?.fontSize, 'dimension') ?? `${+(v.fontSize.value / 16).toFixed(4)}rem`;
      // em keeps tracking proportional if a consumer overrides the size.
      const tracking = v.letterSpacing.value === 0 ? '0' : `${+(v.letterSpacing.value / v.fontSize.value).toFixed(4)}em`;
      // Emphasis is a weight step, not a role: `<role>-font-weight-emphasized` is the role's weight plus
      // its family's step, as one expression over the two properties, so a re-valued weight or step moves it live.
      const isRole = token.path[0] === 'sys' && token.path[1] === 'typescale';
      return [
        [`${name}-font-family`, family],
        [`${name}-font-size`, size],
        [`${name}-font-weight`, String(v.fontWeight)],
        ...(isRole ? [[`${name}-font-weight-emphasized`, `calc(var(${name}-font-weight) + var(${PREFIX}-sys-typescale-emphasis-${typeFamily(token.path[2])}))`]] : []),
        [`${name}-letter-spacing`, tracking],
        [`${name}-line-height`, String(v.lineHeight)],
        [`${name}-font`, `${v.fontWeight} var(${name}-font-size)/${v.lineHeight} ${family}`],
      ];
    }
    default:
      throw new Error(`css: unsupported token type "${token.type}" (${token.id})`);
  }
}

// A pill: a radius of at least half the short side is clamped by the
// browser, so a superellipse could only change its exponent and would flatten the caps where Figma's construction draws
// a circle. CSS cannot tell a box its radius was clamped, but the build knows which shape tokens are the full step: every
// comp token whose alias chain reaches `sys.shape.corner.*` gets a companion `<name>-pill` — 1 when the chain passes
// through `corner.full`, else 0 — which the web's one corner rule reads to draw that box round whatever the smoothing.
const CORNER = `${CONFIG.namespace}.sys.shape.corner.`;
const FULL = `${CORNER}full`;
function cornerCompanion(token, tokens) {
  if (token.path[0] !== 'comp' || token.type !== 'dimension' || !token.alias) return [];
  const chain = [];
  for (let id = token.alias; id && !chain.includes(id); id = tokens[id]?.alias) chain.push(id);
  if (!chain.some((id) => id.startsWith(CORNER))) return [];
  return [[`${idToVar(token.id)}-pill`, chain.includes(FULL) ? '1' : '0']];
}

// A ring drawn inside (SPB-26): an elevation's ring — the layer with no offset, no blur and a positive spread — is cast
// outside the box, where two shapes a narrow gap apart meet through it. CSS cannot rewrite one layer of a shadow held in
// a custom property, so every shadow token gets a companion `<name>-inset-ring`: the same layers with that ring as an
// inset layer. An alias's companion reads its target's, so both follow a re-valued step live. The companion follows the
// token files: a product that overrides the plain custom property by hand must override its companion with it
// (packages/web/README.md, "Elevation"), or a component that reads the companion keeps drawing the old value.
const isRing = (layer) => !layer.inset && layer.offsetX.value === 0 && layer.offsetY.value === 0 && layer.blur.value === 0 && layer.spread.value > 0;
function insetRingCompanion(token) {
  if (token.type !== 'shadow') return [];
  const name = `${idToVar(token.id)}-inset-ring`;
  if (token.alias) return [[name, `var(${idToVar(token.alias)}-inset-ring)`]];
  return [[name, shadow({ ...token, value: token.value.map((layer) => (isRing(layer) ? { ...layer, inset: true } : layer)) })]];
}

const unavailableValue = ({ components, variants }) =>
  JSON.stringify([...components, ...Object.entries(variants).flatMap(([component, values]) => values.map((v) => `${component}:${v}`))].join(' '));

/** What lives in a layer the system does not extend: `component=layer`, space-separated, in one string. */
const outsideValue = (outside) => JSON.stringify(Object.entries(outside).map(([component, layer]) => `${component}=${layer}`).join(' '));

const block = (selector, decls, indent = '') =>
  `${indent}${selector} {\n${decls.map(([n, v]) => `${indent}  ${n}: ${v};`).join('\n')}\n${indent}}`;

function colorValue(token) {
  return token.alias ? ref(token.alias) : cssColor(token.value);
}

/**
 * @param {{ scope?: string, unavailable?: { components: string[], variants: Record<string, string[]> }, outside?: Record<string, string> }} [options]
 *   `scope` = a system id: the sheet then applies inside `[data-tanrei-system="<id>"]` instead of `:root`, so several
 *   systems can coexist on one page. `unavailable` = what the system does not ship, declared as one string
 *   property (`component` or `component:variant`, space-separated) that a component reads to warn in development. It is
 *   declared even when empty, so a preset's empty list overrides the default system's inherited one. `outside` = the
 *   components that live in a layer the system does not extend (component → that layer), declared the same way: the
 *   system's sheet has no tokens for them, and a component used there says so.
 */
export function emitCss(model, { scope, unavailable, outside } = {}) {
  const NS = CONFIG.namespace;
  const S = scope ? `[data-${NS}-system="${scope}"]` : ':root';
  const pair = (light, dark) => (light === dark ? light : `light-dark(${light}, ${dark})`);

  // A component color is normally ONE declaration for all six schemes: an alias or a computation over role variables,
  // which follow the scheme by themselves. Two rules are decided per scheme at build time — `tone` and `contrast-pick`
  // (IR paint kind 'scheme') — and their result is delivered exactly as a role's is: `light-dark()` in the base
  // block, and the contrast blocks re-declare it where a level changes it. Whatever aliases or mixes such a token
  // reads it through var(), so it follows too.
  const inScheme = (id, scheme) => declarations(model.componentColors?.[scheme]?.[id] ?? model.tokens[id])[0][1];
  const perScheme = model.partial
    ? []
    : Object.keys(model.componentColors?.light ?? {}).filter((id) => model.schemes.some((scheme) => inScheme(id, scheme) !== inScheme(id, 'light')));
  const componentLevel = (suffix) => perScheme.map((id) => [idToVar(id), pair(inScheme(id, `light${suffix}`), inScheme(id, `dark${suffix}`))]);

  const base = [];
  for (const token of Object.values(model.tokens)) {
    if (token.path[0] === 'sys' && token.path[1] === 'color') continue;
    if (perScheme.includes(token.id)) base.push(componentLevel('').find(([name]) => name === idToVar(token.id)));
    else base.push(...declarations(token), ...cornerCompanion(token, model.tokens), ...insetRingCompanion(token));
  }

  const roles = Object.keys(model.colors.light);
  const level = (suffix) => [
    ...roles.map((role) => [
      `${PREFIX}-sys-color-${role}`,
      pair(colorValue(model.colors[`light${suffix}`][role]), colorValue(model.colors[`dark${suffix}`][role])),
    ]),
    ...componentLevel(suffix),
  ];
  // The base block holds the standard level of a per-scheme component color already (in token order).
  const standard = level('');
  const changed = (decls) => decls.filter(([n, v]) => standard.find(([sn]) => sn === n)[1] !== v);
  const medium = changed(level('-medium'));
  const high = changed(level('-high'));

  const attr = (k, v) => `[data-${NS}-${k}="${v}"]`;
  // A system scope takes a contrast set on itself, inside itself, or — unless it says otherwise — around itself
  // (a page-wide contrast switch on <html> must reach a preset mounted further down).
  const scoped = (level) => [`${S}${attr('contrast', level)}`, `${S} ${attr('contrast', level)}`, `${attr('contrast', level)} ${S}:not([data-${NS}-contrast])`].join(', ');
  return [
    `/* ${GENERATED_HEADER.join(' ')} */`,
    `@layer ${NS}.tokens {`,
    // Custom properties resolve their var() references where they are declared. Declaring the whole
    // set again on a contrast scope makes component tokens pick up that scope's system colors, so
    // data-${NS}-contrast works on a subtree and not only on <html>.
    block(S, [['color-scheme', 'light dark'], ...(unavailable ? [[`${PREFIX}-unavailable`, unavailableValue(unavailable)]] : []), ...(outside ? [[`${PREFIX}-unavailable-layer`, outsideValue(outside)]] : [])], '  '),
    block(scope ? `${S}, ${S} [data-${NS}-contrast]` : `:root, [data-${NS}-contrast]`, [...base, ...standard.slice(0, roles.length)], '  '),
    '',
    `  /* Theme follows the OS by default; force it per subtree with data-${NS}-theme. */`,
    block(attr('theme', 'light'), [['color-scheme', 'light']], '  '),
    block(attr('theme', 'dark'), [['color-scheme', 'dark']], '  '),
    '',
    `  /* Contrast follows prefers-contrast by default; force it with data-${NS}-contrast. */`,
    '  @media (prefers-contrast: more) {',
    block(`${S}:not([data-${NS}-contrast])`, high, '    '),
    '  }',
    block(scope ? scoped('medium') : attr('contrast', 'medium'), medium, '  '),
    block(scope ? scoped('high') : attr('contrast', 'high'), high, '  '),
    '}',
    '',
  ].join('\n');
}
