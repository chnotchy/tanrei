// Accessibility and structure invariants, checked for every scheme on every build.
// A failure here is a design bug, never a threshold to loosen.
import { CONFIG } from './config.js';
import { rgba } from './pure.js';

const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const luminance = ({ r, g, b }) => 0.2126 * lin(r / 255) + 0.7152 * lin(g / 255) + 0.0722 * lin(b / 255);
const over = (fg, bg) => ({
  r: fg.r * fg.a + bg.r * (1 - fg.a),
  g: fg.g * fg.a + bg.g * (1 - fg.a),
  b: fg.b * fg.a + bg.b * (1 - fg.a),
  a: 1,
});

/**
 * The order in which a SHORTENED list of warnings is shown (`tanrei build`, `tanrei validate`, the MCP server's
 * `validate_layer`): what concerns the system as a whole first, then the contrast findings, scheme by scheme. A system
 * may carry a hundred contrast warnings by design (a product layer on an imitation preset); a press that shows nothing must
 * not be item 101 of a list cut at 12. `checkInvariants` itself keeps its order: a11y-report.json is committed.
 */
export const leadWithStructure = (warnings) => [...warnings.filter((w) => !/^\[[a-z-]+\] /.test(w)), ...warnings.filter((w) => /^\[[a-z-]+\] /.test(w))];

/**
 * A finding against one of Tanrei's accessibility CRITERIA — a contrast pair under its threshold — as opposed to a
 * structural or functional one (a missing role, a press that shows nothing, a height that cannot hold its label, a bare
 * literal). A pair of component colors (`comp.<component>.….color on …`) is a criterion as a pair of roles is. The
 * difference matters for an imitation preset only: the criteria do not apply to it, in any contrast scheme,
 * while a structural or functional failure fails in every system.
 */
export const isCriterionFinding = (finding) => /^\[[a-z-]+\] [a-z0-9.-]+ on [a-z0-9.-]+: \d+\.\d+:1 < \d+(\.\d+)?:1 \(/.test(finding) || isTargetSizeFinding(finding);

/**
 * A target size under its criterion: a target token under WCAG 2.5.8's 24px, or a height the core vocabulary floors at
 * sys.target.minimum that a layer set below it. A criterion, as a contrast pair is: an error in the default system,
 * a warning in a product layer, information in an imitation preset.
 */
const isTargetSizeFinding = (finding) => finding.startsWith('target size: ');

/**
 * A target-floor finding that fails in every system, a product layer's too: a hit area under the drawn floor
 * (`sys.target.pointer` or `.touch` under `sys.target.minimum`) means nothing, and a density of zero or less draws
 * nothing at all.
 */
export const isRefusedEverywhere = (finding) => finding.startsWith('target floor: ');

/**
 * The least target size the build holds: WCAG 2.5.8 (Target Size, Minimum), 24 CSS px. A constant, as the contrast
 * thresholds are; Tanrei's own minimum target is a value of the system, `sys.target.minimum`, which may be anything
 * from this up.
 */
export const TARGET_THRESHOLDS = Object.freeze({ minimum: 24 });

/**
 * The heights the core vocabulary floors at sys.target.minimum: every token of `documents` whose rule has
 * `min: {<ns>.sys.target.minimum}`, and every token whose value is an alias of one (transitively). A layer may replace
 * such a token's rule — pin it, re-point it — and the target-floor check still holds what it resolves to.
 * @param {object[]} documents DTCG documents of the core vocabulary (its comp/ documents and those its layers hold)
 * @returns {string[]}
 */
export function targetFloors(documents) {
  const MIN = `{${CONFIG.namespace}.sys.target.minimum}`;
  const floored = new Set();
  const aliases = new Map();
  const walk = (node, path) => {
    if (!node || typeof node !== 'object') return;
    if ('$value' in node) {
      const id = path.join('.');
      if (node.$extensions?.['dev.tanrei.derive']?.min === MIN) floored.add(id);
      else if (typeof node.$value === 'string' && /^\{[^{}]+\}$/.test(node.$value)) aliases.set(id, node.$value.slice(1, -1));
      return;
    }
    for (const [key, child] of Object.entries(node)) if (!key.startsWith('$')) walk(child, [...path, key]);
  };
  for (const doc of documents) walk(doc, []);
  for (let grew = true; grew; ) {
    grew = false;
    for (const [id, target] of aliases) {
      if (floored.has(target) && !floored.has(id)) {
        floored.add(id);
        grew = true;
      }
    }
  }
  return [...floored].sort();
}

/** Why an imitation preset's measurements are information and not warnings — the words its report and headers use. */
export const PRESET_CRITERIA_NOTE =
  "An imitation preset is held to fidelity to the system it imitates, not to Tanrei's accessibility criteria, in every contrast scheme. These are measurements against the fixed thresholds, kept as information: they are not warnings and not mimicry gaps.";

/**
 * The accessibility report of an imitation preset (`tokens/generated/<id>/a11y-report.json`): the fixed ruler's
 * measurements, marked as not applying. Only criterion findings belong here; anything else fails the build.
 */
export const presetAccessibilityReport = (system, measurements, checked) => ({
  system,
  criteria: 'not-applied',
  because: PRESET_CRITERIA_NOTE,
  checked: checkedPairs(checked),
  count: measurements.length,
  measurements,
});

/** Why the default system's report lists no finding — the words its report uses. */
export const DEFAULT_CRITERIA_NOTE =
  "The default system is held to Tanrei's accessibility criteria in every contrast scheme: a pair under its threshold, or any other invariant violation, fails the build. A committed report therefore lists no finding; it records what was checked.";

/** The accessibility report of the default system (`tokens/generated/a11y-report.json`): what the build checked. */
export const defaultAccessibilityReport = (system, checked) => ({
  system,
  criteria: 'enforced',
  because: DEFAULT_CRITERIA_NOTE,
  checked: checkedPairs(checked),
});

/**
 * The rows whose selection is told by their fill (`ROW_SELECTION` below): each is a selected row's container color, the
 * color of a row that is not selected under the pointer, and the color of the selected row's text, the component's own
 * tokens. A menu's checked row is told by its mark and has no fill at standard contrast, a select's and a combobox's
 * option are menus, and a chip, a segmented button and a tab draw a check or an indicator beside their fill: none is
 * held here.
 */
const SELECTED_ROWS = [
  ['list.selected.container.color', 'list.unselected.hovered.container.color', 'list.selected.content.color'],
  ['tree-view.selected.container.color', 'tree-view.unselected.hovered.container.color', 'tree-view.selected.label.color'],
  ['navigation-drawer.selected.item.container.color', 'navigation-drawer.unselected.hovered.item.container.color', 'navigation-drawer.selected.item.label.color'],
  ['table.row.selected.container.color', 'table.row.unselected.hovered.container.color', 'table.row.selected.text.color'],
];

/**
 * The components whose colors `checkInvariants` compares in every scheme, and not by role alone: the radio's mark
 * (the radio button, and the menu's radio item) is drawn over a state layer that a rule derives, and a selected row
 * and a hovered one are layers over the surface the row stands on. A model read one scheme at a time
 * (`invariantModel`) carries their colors in every scheme, so that it reports what a whole model does.
 */
export const COMPONENTS_HELD_IN_EVERY_SCHEME = ['radio-button', 'menu', ...new Set(SELECTED_ROWS.map(([selected]) => selected.split('.')[0]))];

/** WCAG 2.x contrast ratio; a translucent foreground is composited over the background first. */
export function contrast(fgColor, bgColor) {
  const bg = rgba(bgColor);
  const fg = over(rgba(fgColor), bg);
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
}

const SURFACES = [
  'surface',
  'surface-dim',
  'surface-bright',
  'surface-container-lowest',
  'surface-container-low',
  'surface-container',
  'surface-container-high',
  'surface-container-highest',
];

// [foreground, background, minimum ratio, why]
const TEXT = 4.5;
const NON_TEXT = 3;

// The statuses a component may mark with a glyph or a dot in the status's own color on that status's tonal container
// (the tag's mark, the snackbar's glyph).
const STATUSES = ['info', 'warning', 'error', 'success'];

/** An intent is any role X that comes with on-X, X-container and on-X-container — core or palette-declared. */
export function intentsOf(roles) {
  return Object.keys(roles).filter((r) => [`on-${r}`, `${r}-container`, `on-${r}-container`].every((k) => k in roles));
}

// Built from the roles a system actually has, so a declared palette is checked exactly like a core
// intent. The thresholds are constants: no layer can reach them.
function pairsFor(roles, focusStyle = 'ring') {
  const intents = intentsOf(roles);
  // A glow draws the same two focus colors as a soft halo. It is held to the same ratio as the ring:
  // a halo is never easier to see than a line, so the color has to carry the contrast by itself.
  const focus = focusStyle === 'ring' ? 'focus indicator (WCAG 2.4.13)' : `focus indicator, drawn as a ${focusStyle} (WCAG 2.4.13)`;
  return [
    ...intents.flatMap((r) => [
      [`on-${r}`, r, TEXT, 'content on filled container'],
      [`on-${r}-container`, `${r}-container`, TEXT, 'content on tonal container'],
    ]),
    ...STATUSES.filter((r) => intents.includes(r)).map((r) => [r, `${r}-container`, NON_TEXT, 'status mark on its tonal container (WCAG 1.4.11)']),
    ['inverse-on-surface', 'inverse-surface', TEXT, 'content on inverse surface'],
    // inverse-primary on inverse-surface is a snackbar's action label: text.
    ['inverse-primary', 'inverse-surface', TEXT, 'accent text on inverse surface'],
    // A link on a surface of the opposite theme: the counterpart of `link` on the surfaces below.
    ['inverse-link', 'inverse-surface', TEXT, 'inline links on inverse surface'],
    ...SURFACES.flatMap((s) => [
      ['on-surface', s, TEXT, 'body text'],
      ['on-surface-variant', s, TEXT, 'secondary text'],
      ['link', s, TEXT, 'inline links'],
      ...intents.map((r) => [r, s, TEXT, `${r}-colored text`]),
      ['outline', s, NON_TEXT, 'functional boundary (WCAG 1.4.11)'],
      ['focus-ring', s, NON_TEXT, focus],
    ]),
  ];
}

// A callout's body holds the product's links and controls on a tonal container: in the default
// system the link color and the focus color are held there as they are on surfaces. A preset's or a product's link
// on its own tonal containers is not held: cupertino's link, its primary's tones, does not reach the text ratio there,
// and a raised-contrast scheme of a preset must pass every check it is given.
const tonalPairs = (roles) =>
  ['secondary', ...STATUSES].filter((r) => `${r}-container` in roles).flatMap((r) => [
    ['link', `${r}-container`, TEXT, 'inline link on a tonal container'],
    ['focus-ring', `${r}-container`, NON_TEXT, 'focus indicator on a tonal container (WCAG 2.4.13)'],
  ]);

const HIGH_CONTRAST_TEXT = 7;
// The hairline (outline-variant: an outlined control's edge, a divider) in a raised-contrast scheme: a person who chose
// more contrast is given an edge they can see — 3:1 at medium, 4.5:1 at high, as Material's colour scheme raises the
// role — while the input's edge (outline) stays the stronger of the two. At standard contrast the hairline is
// decoration beside a control that its label already identifies (WCAG 1.4.11), and is not held. The default system
// alone is held to it (below).
const HAIRLINE = { medium: 3, high: 4.5 };
// How far a selected row stands from a row under the pointer, both laid over the surface they stand on, in every
// scheme and on every surface role. A selection that is a layer twice the hover layer stands 1.15:1 to 1.3:1 from a
// hovered row in the default system; a tone chosen against the page met the hover layer at 1.00:1 to 1.03:1, and the
// two rows read as one grey. The default system alone is held to it: a preset keeps its original's selection.
const ROW_SELECTION = 1.1;

/**
 * The contrast thresholds the checks here hold, as the n of n:1. The docs state them from this object (their
 * Accessibility and Color pages), so that a page cannot say less, or more, than the build checks.
 */
export const CONTRAST_THRESHOLDS = Object.freeze({
  /** Text, and a content color on its container, in the standard and medium contrast schemes. */
  text: TEXT,
  /** The same pairs in the high-contrast schemes. */
  highContrastText: HIGH_CONTRAST_TEXT,
  /** A boundary that identifies a control, a status's mark, the focus indicator: in every scheme. */
  nonText: NON_TEXT,
  /** The hairline (outline-variant) in the default system's raised-contrast schemes. */
  hairline: Object.freeze({ ...HAIRLINE }),
});
// The scheme of the other theme at the same contrast level (an inverse status form mirrors it).
const OTHER_THEME = { light: 'dark', 'light-medium': 'dark-medium', 'light-high': 'dark-high', dark: 'light', 'dark-medium': 'light-medium', 'dark-high': 'light-high' };

/** The name a choice of kind has in this model, or undefined. */
const choiceOf = (model, name) => {
  const token = model.tokens[`${CONFIG.namespace}.sys.behavior.${name}`];
  return token?.enum?.values?.[token.value];
};

/**
 * Every finding of the fixed ruler, and how many contrast pairs it measured in each scheme of the model. A pair is one
 * comparison that can produce one finding: `rolePairs` are the pairs of color roles (a foreground role on each
 * background it may sit on, the tonal and declared pairs, the hairline and the input's edge of a raised-contrast
 * scheme); `componentPairs` are the pairs of a component's own colors (a focus indicator on its own bar, the snackbar's
 * inverse status forms, code, a radio's mark, a link told from text by color). A pair that a role pair already holds,
 * or whose colors the model does not carry, is not measured and not counted. The public number of pairs is this count:
 * `tokens/generated/a11y-report.json` (the default system) and `tokens/generated/<id>/a11y-report.json` write it.
 * @returns {{ failures: string[], checked: Record<string, { rolePairs: number, componentPairs: number }> }}
 */
export function auditInvariants(model) {
  const failures = [];
  const checked = Object.fromEntries(model.schemes.map((scheme) => [scheme, { rolePairs: 0, componentPairs: 0 }]));
  // Every ratio a pair is judged by is measured here, so what is counted is what is checked.
  const measure = (scheme, kind, fg, bg) => {
    checked[scheme][kind] += 1;
    return contrast(fg, bg);
  };
  const focusStyle = choiceOf(model, 'focus-style');
  for (const scheme of model.schemes) {
    const roles = model.colors[scheme];
    const isHigh = scheme.endsWith('-high');
    // A role a layer declared with `onRole` brings its own pair: that role's content must be readable on it.
    const declared = Object.entries(roles).filter(([, token]) => token.vocabulary?.onRole).map(([role, token]) => [token.vocabulary.onRole.split('.').at(-1), role, TEXT, `content on the declared role "${role}"`]);
    const tonal = model.system === CONFIG.namespace ? tonalPairs(roles) : [];
    for (const [fg, bg, min, why] of [...pairsFor(roles, focusStyle), ...tonal, ...declared]) {
      if (!roles[fg] || !roles[bg]) {
        failures.push(`[${scheme}] missing role for pair ${fg} / ${bg}`);
        continue;
      }
      const required = isHigh && min === TEXT ? HIGH_CONTRAST_TEXT : min;
      const ratio = measure(scheme, 'rolePairs', roles[fg].value, roles[bg].value);
      if (ratio < required) {
        failures.push(`[${scheme}] ${fg} on ${bg}: ${ratio.toFixed(2)}:1 < ${required}:1 (${why})`);
      }
    }
    // Held in the default system, as the tonal pairs are: a preset keeps its original's hairline, and a product on one
    // is not warned for the preset's choice.
    const level = model.system !== CONFIG.namespace ? null : isHigh ? 'high' : scheme.endsWith('-medium') ? 'medium' : null;
    if (level && roles['outline-variant'] && roles.outline) {
      for (const s of SURFACES.filter((each) => roles[each])) {
        const hairline = measure(scheme, 'rolePairs', roles['outline-variant'].value, roles[s].value);
        if (hairline < HAIRLINE[level]) failures.push(`[${scheme}] outline-variant on ${s}: ${hairline.toFixed(2)}:1 < ${HAIRLINE[level]}:1 (the hairline in a raised-contrast scheme)`);
        const edge = measure(scheme, 'rolePairs', roles.outline.value, roles[s].value);
        if (edge < hairline) failures.push(`[${scheme}] outline on ${s}: ${edge.toFixed(2)}:1 < ${hairline.toFixed(2)}:1 (an input's edge stays stronger than the hairline)`);
      }
    }
  }

  // A choice that draws nothing is a mistake, not a style: `dim` answers a press with the pressed
  // opacity, so a system that chooses it must give at least one component a pressed opacity below 1.
  if (choiceOf(model, 'pressed-feedback') === 'dim') {
    const pressed = Object.values(model.tokens).filter((t) => t.path[0] === 'comp' && /(^|\.)pressed\.opacity$/.test(t.path.slice(2).join('.')));
    if (pressed.length && pressed.every((t) => t.value >= 1)) failures.push(`sys.behavior.pressed-feedback is "dim", but every pressed opacity is 1 (${pressed.map((t) => t.id).join(', ')}): a press would show nothing — set the pressed opacity below 1, or choose another feedback`);
  }

  // No bare literals above the reference tier: a value is an alias, the product of a rule,
  // or fixed with a stated reason. Source files are checked the same way before resolution; this
  // catches what a layer did to them.
  for (const token of Object.values(model.tokens)) {
    const tier = token.path[0];
    if (tier === 'sys' && token.path[1] === 'color') {
      if (!token.alias) failures.push(`${token.id}: sys.color roles must alias ref.palette / ref.alpha`);
    } else if ((tier === 'sys' || tier === 'comp') && !token.alias && !token.derive) {
      failures.push(`${token.id}: a literal needs a rule or a stated reason for being fixed; component tokens normally alias a sys token`);
    }
  }

  // A choice of kind is an index into its own list of names; anything else reaches no platform.
  // A component's choice may follow a system's by aliasing it: its value is then the value of the choice
  // at the end of the alias chain, and that choice must offer the same names in the same order, or the index would
  // name something else in the component.
  for (const token of Object.values(model.tokens)) {
    if (!token.enum) continue;
    const names = token.enum.values;
    const list = (values) => (values ?? []).map((name, i) => `${name} (${i})`).join(', ');
    let value = token.value;
    if (token.alias) {
      const targetId = token.aliasFinal ?? token.alias;
      const target = model.tokens[targetId];
      if (!Array.isArray(target?.enum?.values)) {
        failures.push(`${token.id}: aliases ${targetId}, which is not a choice of kind — a choice follows another choice or is one of its own names: ${list(names)}`);
        continue;
      }
      if (!Array.isArray(names) || names.length !== target.enum.values.length || names.some((name, i) => name !== target.enum.values[i])) {
        failures.push(`${token.id}: aliases ${targetId}, whose choices differ — ${list(names)} here, ${list(target.enum.values)} there`);
        continue;
      }
      value = target.value;
    }
    if (!Array.isArray(names) || !Number.isInteger(value) || value < 0 || value >= names.length) failures.push(`${token.id}: ${JSON.stringify(value)} is not one of its choices — ${list(names)}`);
  }

  // Elevation: a shadow is a list of layers, and the list may be EMPTY (level0: nothing is drawn). Every layer that
  // exists takes its color from a role, so a shadow follows the scheme like everything else.
  for (const token of Object.values(model.tokens)) {
    if (token.type !== 'shadow' || token.alias) continue;
    if (!Array.isArray(token.value)) failures.push(`${token.id}: a shadow is a list of layers (an empty list draws nothing)`);
    else token.value.forEach((_, i) => { if (!token.partialAlias?.[i]?.color?.startsWith(`${CONFIG.namespace}.sys.color.`)) failures.push(`${token.id}: shadow layer ${i + 1} must take its color from a sys.color role`); });
  }

  // A control's height must hold what is put inside it: block padding twice plus one line of its label.
  // Platforms treat the height as a minimum, so a height that is too small silently renders as another size.
  for (const token of Object.values(model.tokens)) {
    const [tier, component, part, property, size] = token.path;
    if (tier !== 'comp' || part !== 'container' || property !== 'height') continue;
    const at = (...rest) => model.tokens[[CONFIG.namespace, 'comp', component, ...rest].join('.')];
    const padding = at('container', 'padding-block', size)?.value?.value;
    const label = at('label', 'typescale', size)?.value;
    if (padding === undefined || !label?.fontSize) continue;
    const needed = 2 * padding + Math.round(label.fontSize.value * label.lineHeight * 100) / 100;
    if (token.value.value < needed) failures.push(`${token.id}: ${token.value.value}px cannot hold its content — 2 × padding-block (${padding}px) + one label line = ${needed}px`);
  }

  // A component that names the color of its own focus indicator (the snackbar, one per form) draws it
  // on its own bar, not on a surface the pairs above cover: `<form>.focus-ring.color` is held to the same 3:1 against
  // `<form>.container.color`, the bar of the same form, in every scheme. Where both follow a color role the roles of
  // each scheme are compared, which a partial model has too; a color that is derived or fixed is compared in the
  // schemes whose component colors the model carries. A bar that is not opaque is drawn on something this check
  // cannot know, and is left to the pairs above.
  const role = (token) => {
    for (let at = token, hops = 0; at?.alias && hops < 16; at = model.tokens[at.alias], hops++) {
      if (at.alias.startsWith(`${CONFIG.namespace}.sys.color.`)) return at.alias.slice(`${CONFIG.namespace}.sys.color.`.length);
    }
    return undefined;
  };
  const short = (id) => id.slice(CONFIG.namespace.length + 1);
  for (const ring of Object.values(model.tokens)) {
    if (ring.path[0] !== 'comp' || ring.type !== 'color' || ring.path.at(-2) !== 'focus-ring' || ring.path.at(-1) !== 'color') continue;
    const barId = [CONFIG.namespace, ...ring.path.slice(0, -2), 'container', 'color'].join('.');
    const bar = model.tokens[barId];
    if (!bar) continue;
    const [ringRole, barRole] = [role(ring), role(bar)];
    for (const scheme of model.schemes) {
      const byRole = ringRole && barRole && model.colors[scheme][ringRole] && model.colors[scheme][barRole];
      const fg = byRole ? model.colors[scheme][ringRole].value : model.componentColors?.[scheme]?.[ring.id]?.value;
      const bg = byRole ? model.colors[scheme][barRole].value : model.componentColors?.[scheme]?.[barId]?.value;
      if (!fg || !bg || rgba(bg).a < 1) continue;
      const ratio = measure(scheme, 'componentPairs', fg, bg);
      if (ratio < NON_TEXT) failures.push(`[${scheme}] ${short(ring.id)} on ${short(barId)}: ${ratio.toFixed(2)}:1 < ${NON_TEXT}:1 (focus indicator on the component's own bar, WCAG 2.4.13)`);
    }
  }

  // The snackbar's inverse status forms (SNK-30). In the default system their colors are valued by
  // rule, as the colors the same status's form has in the other theme, so no role pair above holds them. Each is
  // compared from the component colors of the schemes the model carries (a partial model has the light scheme's).
  const snackbar = `${CONFIG.namespace}.comp.snackbar`;
  const inScheme = (scheme, id) => model.componentColors?.[scheme]?.[id]?.value;
  const number = (id) => (typeof model.tokens[id]?.value === 'number' ? model.tokens[id].value : 1);
  const faded = (color, opacity) => ({ ...color, alpha: (color.alpha ?? 1) * opacity });
  const flat = (fg, bg) => {
    const c = over(rgba(fg), rgba(bg));
    return { colorSpace: 'srgb', components: [c.r / 255, c.g / 255, c.b / 255], alpha: 1 };
  };
  const sameColor = (x, y) => ['r', 'g', 'b', 'a'].every((k) => rgba(x)[k] === rgba(y)[k]);
  const hex = (color) => `#${[rgba(color).r, rgba(color).g, rgba(color).b].map((n) => n.toString(16).padStart(2, '0')).join('')}${rgba(color).a < 1 ? ` at ${rgba(color).a}` : ''}`;

  // 1. The mirror itself, in the default system: every color of `inverse-<status>` — the bar, the text, the glyph,
  // the edge, the focus indicator and every state of the action and the close button — equals, in each scheme, the
  // token of the same name without `inverse-` in the scheme of the other theme at the same contrast level. It is
  // what keeps the tones restated in the default layer from drifting from the roles they restate. A preset or a
  // product draws its own inverse status forms and is not held to it.
  if (model.system === CONFIG.namespace) {
    for (const scheme of model.schemes) {
      const other = OTHER_THEME[scheme];
      for (const id of Object.keys(model.componentColors?.[scheme] ?? {})) {
        if (!id.startsWith(`${snackbar}.`) || !STATUSES.some((status) => id.includes(`.inverse-${status}.`))) continue;
        const twin = id.replace('.inverse-', '.');
        const [here, there] = [inScheme(scheme, id), inScheme(other, twin)];
        if (!here || !there || sameColor(here, there)) continue;
        failures.push(`[${scheme}] ${short(id)} is ${hex(here)}, but ${short(twin)} is ${hex(there)} in ${other}: a status's inverse form is that status's form in the other theme (SNK-30)`);
      }
    }
  }

  // 2–4. What is read on an inverse status bar is held against that bar: the title and the message (4.5:1, 7:1 in
  // the high-contrast schemes), the glyph at icon.opacity (3:1) and the description at its opacity under a title
  // (text). A pair whose two colors follow color roles and whose foreground is drawn opaque is a role pair, held above.
  // The proposal's check 5, the action's label on the action as drawn in each state, is not here: it reads state
  // colors of schemes a partial model does not carry, so a system read one scheme at a time and read whole would
  // report differently.
  const STATES = ['', 'hovered.', 'focused.', 'pressed.'];
  for (const status of STATUSES) {
    const form = `inverse-${status}`;
    const barId = `${snackbar}.${form}.container.color`;
    if (!model.tokens[barId]) continue;
    const pairs = [
      [`${form}.title.color`, null, 1, TEXT, 'title on its bar'],
      [`${form}.supporting-text.color`, null, 1, TEXT, 'message on its bar'],
      [`${form}.icon.color`, null, number(`${snackbar}.icon.opacity`), NON_TEXT, 'status glyph at icon.opacity on its bar'],
      [`${form}.supporting-text.color`, null, number(`${snackbar}.supporting-text.under-title.opacity`), TEXT, 'description at its opacity under a title'],
    ];
    for (const [fgName, groundName, opacity, min, why] of pairs) {
      const [fgId, groundId] = [`${snackbar}.${fgName}`, groundName && `${snackbar}.${groundName}`];
      if (!model.tokens[fgId] || (groundId && !model.tokens[groundId])) continue;
      if (!groundId && opacity === 1 && role(model.tokens[fgId]) && role(model.tokens[barId])) continue;
      for (const scheme of model.schemes) {
        const [fg, bar, ground] = [inScheme(scheme, fgId), inScheme(scheme, barId), groundId && inScheme(scheme, groundId)];
        if (!fg || !bar || rgba(bar).a < 1 || (groundId && !ground)) continue;
        const bg = ground ? flat(ground, bar) : bar;
        const required = scheme.endsWith('-high') && min === TEXT ? HIGH_CONTRAST_TEXT : min;
        const ratio = measure(scheme, 'componentPairs', faded(fg, opacity), bg);
        if (ratio < required) failures.push(`[${scheme}] ${short(fgId)} on ${short(groundId ?? barId)}: ${ratio.toFixed(2)}:1 < ${required}:1 (${why})`);
      }
    }
  }

  // 6. The expand and close buttons' glyph on its circle over the bar, in all ten forms (SNK-34, BTN-45): the snackbar
  // gives them its form's message color as their tone, and a Button draws its glyph in it, and its container — where
  // its variant draws one — in it at comp.button.tone.container.opacity over the bar, with each state's layer of it
  // over that at the system's state-layer opacity. The circle is a blend no role pair holds: the glyph is held against
  // it at 3:1 at rest and in each state. A variant that draws no container (outlined, text) leaves the bar under the
  // glyph at rest, which the message's own pair holds; a press answered by a dim or by nothing draws no pressed layer.
  const ns = CONFIG.namespace;
  const toneOpacity = model.tokens[`${ns}.comp.button.tone.container.opacity`]?.value;
  const variant = model.tokens[`${snackbar}.close-button.variant`]?.value;
  const LAYERS = { rest: null, hovered: 'hover', focused: 'focus', pressed: 'pressed' };
  const layerOpacity = Object.fromEntries(Object.entries(LAYERS).map(([state, name]) => [state, name ? model.tokens[`${ns}.sys.state.${name}-state-layer-opacity`]?.value : 0]));
  if (['dim', 'none'].includes(choiceOf(model, 'pressed-feedback'))) delete layerOpacity.pressed;
  if (typeof toneOpacity === 'number' && typeof variant === 'number' && Object.values(layerOpacity).every((value) => typeof value === 'number')) {
    const bare = variant === 3 || variant === 4;
    for (const form of ['', ...STATUSES, 'inverse', ...STATUSES.map((status) => `inverse-${status}`)]) {
      const prefix = form ? `${snackbar}.${form}` : snackbar;
      const [toneId, barId] = [`${prefix}.supporting-text.color`, `${prefix}.container.color`];
      if (!model.tokens[toneId] || !model.tokens[barId]) continue;
      for (const scheme of model.schemes) {
        const [tone, bar] = [inScheme(scheme, toneId), inScheme(scheme, barId)];
        if (!tone || !bar || rgba(bar).a < 1) continue;
        const circle = bare ? bar : flat(faded(tone, toneOpacity), bar);
        for (const [state, opacity] of Object.entries(layerOpacity)) {
          if (bare && state === 'rest') continue;
          const ground = opacity ? flat(faded(tone, opacity), circle) : circle;
          const ratio = measure(scheme, 'componentPairs', tone, ground);
          if (ratio < NON_TEXT) failures.push(`[${scheme}] ${short(toneId)} on ${short(barId)}: ${ratio.toFixed(2)}:1 < ${NON_TEXT}:1 (expand and close glyph on its circle over the bar, ${state})`);
        }
      }
    }
  }

  // Code. What is read in a code block is held against the block's fill and against the bands of a
  // highlighted, an added and a removed line, and inline code's text against its fill: text at 4.5:1 (7:1 in the high-contrast schemes), the
  // bars of marked lines at 3:1. In the shipped systems each of these is a role on a surface, held above; this check
  // is for a layer that re-points a syntax role (or the fill) at a color no role pair holds at that ratio. A pair
  // the role pairs already hold is left to them, so a system is not told the same thing twice.
  const held = new Map();
  for (const scheme of model.schemes) for (const [fg, bg, min] of pairsFor(model.colors[scheme], focusStyle)) held.set(`${fg} ${bg}`, Math.max(min, held.get(`${fg} ${bg}`) ?? 0));
  const codeBlock = `${CONFIG.namespace}.comp.code-block`;
  const inlineCode = `${CONFIG.namespace}.comp.inline-code`;
  // The syntax roles are an axis: every color under syntax.color, the ones a layer added included.
  const SYNTAX = Object.keys(model.tokens).filter((id) => id.startsWith(`${codeBlock}.syntax.color.`)).map((id) => id.slice(codeBlock.length + 1));
  const CODE_TEXT = ['code.color', 'line-number.color', 'prompt.color', ...SYNTAX];
  const CODE_MARKS = ['line.highlighted.mark.color', 'line.added.mark.color', 'line.removed.mark.color'];
  const codePairs = [
    ...CODE_TEXT.flatMap((part) => [
      [`${codeBlock}.${part}`, `${codeBlock}.filled.container.color`, TEXT, 'code on the block\'s fill'],
      [`${codeBlock}.${part}`, `${codeBlock}.line.highlighted.container.color`, TEXT, 'code on a highlighted line\'s band'],
      [`${codeBlock}.${part}`, `${codeBlock}.line.added.container.color`, TEXT, 'code on an added line\'s band'],
      [`${codeBlock}.${part}`, `${codeBlock}.line.removed.container.color`, TEXT, 'code on a removed line\'s band'],
    ]),
    [`${codeBlock}.line.added.mark.color`, `${codeBlock}.line.added.container.color`, NON_TEXT, 'an added line\'s bar and sign on its band'],
    [`${codeBlock}.line.removed.mark.color`, `${codeBlock}.line.removed.container.color`, NON_TEXT, 'a removed line\'s bar and sign on its band'],
    ...CODE_MARKS.map((part) => [`${codeBlock}.${part}`, `${codeBlock}.filled.container.color`, NON_TEXT, 'a marked line\'s bar on the block\'s fill']),
    // An outlined block has no fill: its code is read on the surface it is placed on, so a syntax color is held on
    // every surface role. The other text colors of the block are roles the role pairs hold there.
    ...SYNTAX.flatMap((part) => SURFACES.map((surface) => [`${codeBlock}.${part}`, `${CONFIG.namespace}.sys.color.${surface}`, TEXT, 'code in an outlined block on a surface'])),
    [`${inlineCode}.label.color`, `${inlineCode}.container.color`, TEXT, 'inline code on its fill'],
  ];
  // A match is marked as a search marks one: its text in a color of its own over a fill of its own (and, in an option
  // that is selected, over the fill that stands apart from the selected one). The text is read on that fill.
  const comp = (name) => `${CONFIG.namespace}.comp.${name}`;
  const match = comp('combobox.option.match');
  const markPairs = [
    [comp('search.result.mark.color'), comp('search.result.mark.container.color'), TEXT, 'a match on its fill'],
    [`${match}.color`, `${match}.container.color`, TEXT, 'a matched run of an option on its fill'],
    [`${match}.selected.color`, `${match}.selected.container.color`, TEXT, 'a matched run of an option on the fill a selected one takes'],
  ];
  for (const [fgId, bgId, min, why] of [...codePairs, ...markPairs]) {
    const [fgToken, bgToken] = [model.tokens[fgId], model.tokens[bgId]];
    if (!fgToken || !bgToken) continue;
    // A ground that is a color role itself (a surface an outlined block stands on) is that role.
    const [fgRole, bgRole] = [role(fgToken), bgId.startsWith(`${CONFIG.namespace}.sys.color.`) ? bgId.split('.').at(-1) : role(bgToken)];
    if (fgRole && bgRole && (held.get(`${fgRole} ${bgRole}`) ?? 0) >= min) continue;
    for (const scheme of model.schemes) {
      const fg = fgRole && model.colors[scheme][fgRole] ? model.colors[scheme][fgRole].value : inScheme(scheme, fgId);
      const bg = bgRole && model.colors[scheme][bgRole] ? model.colors[scheme][bgRole].value : inScheme(scheme, bgId);
      if (!fg || !bg || rgba(bg).a < 1) continue;
      const required = scheme.endsWith('-high') && min === TEXT ? HIGH_CONTRAST_TEXT : min;
      const ratio = measure(scheme, 'componentPairs', fg, bg);
      if (ratio < required) failures.push(`[${scheme}] ${short(fgId)} on ${short(bgId)}: ${ratio.toFixed(2)}:1 < ${required}:1 (${why})`);
    }
  }

  // A meter's value is read where its indicator ends against its track (WCAG 1.4.11). The indicator color of each of
  // its statuses — default, info, success, warning and error — is held 3:1 against the track, and against every
  // surface role the meter may stand on (where a gap separation leaves space, the surface shows between them), in
  // every scheme. A non-text ratio is not raised in the high-contrast schemes. A pair the role pairs already hold at
  // 3:1 or more (a status's own color on a surface is held as text there) is left to them.
  const meter = `${CONFIG.namespace}.comp.meter`;
  const meterGrounds = [[`${meter}.track.color`, 'its track'], ...SURFACES.map((surface) => [`${CONFIG.namespace}.sys.color.${surface}`, 'the surface it stands on'])];
  for (const part of ['indicator.color', ...STATUSES.map((status) => `${status}.indicator.color`)]) {
    const fgId = `${meter}.${part}`;
    if (!model.tokens[fgId]) continue;
    for (const [bgId, what] of meterGrounds) {
      const isRole = bgId.startsWith(`${CONFIG.namespace}.sys.color.`);
      if (!isRole && !model.tokens[bgId]) continue;
      const [fgRole, bgRole] = [role(model.tokens[fgId]), isRole ? bgId.split('.').at(-1) : role(model.tokens[bgId])];
      if (fgRole && bgRole && (held.get(`${fgRole} ${bgRole}`) ?? 0) >= NON_TEXT) continue;
      for (const scheme of model.schemes) {
        const fg = fgRole && model.colors[scheme][fgRole] ? model.colors[scheme][fgRole].value : inScheme(scheme, fgId);
        const bg = bgRole && model.colors[scheme][bgRole] ? model.colors[scheme][bgRole].value : inScheme(scheme, bgId);
        if (!fg || !bg || rgba(bg).a < 1) continue;
        const ratio = measure(scheme, 'componentPairs', fg, bg);
        if (ratio < NON_TEXT) failures.push(`[${scheme}] ${short(fgId)} on ${short(bgId)}: ${ratio.toFixed(2)}:1 < ${NON_TEXT}:1 (a meter's indicator against ${what}, where its value is read — WCAG 1.4.11)`);
      }
    }
  }

  // The fill inside a radio's ring (WCAG 1.4.11). The center of a chosen radio is a part of the mark, and it is held
  // 3:1 against the color it meets: the ring itself where the fill meets the ring (an inset of 0, the default system's
  // one shape), or the gap where an inset leaves one (a dot, Material's), which shows what the radio stands on. Each is
  // measured as drawn — the fill at its opacity and the ring over the round state layer of the state, laid over the
  // ground — at rest, hovered, focused and pressed (a disabled control is exempt, as WCAG exempts an inactive one), on
  // every surface role for the radio button and on the menu's sheet for a menu's radio item. A condition whose fill
  // draws nothing (the default system's unselected radio) has no center to hold; the ring against the surface is held
  // by the role pairs above. Compared from the component colors of the schemes the model carries.
  const RADIO_MARKS = [
    {
      component: 'radio-button',
      conditions: ['unselected', 'selected', 'error-unselected', 'error-selected'],
      ring: 'ring', fill: 'fill', opacity: 'fill.opacity', inset: 'fill.inset',
      grounds: SURFACES.map((surface) => `${CONFIG.namespace}.sys.color.${surface}`),
    },
    {
      // A menu draws the radio look only while its radio items are marked as radios (MNU-40), and fills a checked one.
      component: 'menu', when: ['radio-item.mark', 'radio'],
      conditions: ['selected'],
      ring: 'control', fill: 'control', opacity: 'control.fill.opacity', inset: 'control.fill.inset',
      grounds: [`${CONFIG.namespace}.comp.menu.surface.color`],
    },
  ];
  const colorOf = (scheme, id) => {
    const colorRole = id.startsWith(`${CONFIG.namespace}.sys.color.`) ? id.split('.').at(-1) : model.tokens[id] && role(model.tokens[id]);
    return colorRole && model.colors[scheme]?.[colorRole] ? model.colors[scheme][colorRole].value : inScheme(scheme, id);
  };
  for (const mark of RADIO_MARKS) {
    const at = (rest) => `${CONFIG.namespace}.comp.${mark.component}.${rest}`;
    if (!model.tokens[at(`${mark.conditions[0]}.${mark.ring}.color`)]) continue;
    if (mark.when) {
      const choice = model.tokens[at(mark.when[0])];
      const target = choice?.alias ? model.tokens[choice.aliasFinal ?? choice.alias] : choice;
      if (choice?.enum?.values?.[target?.value] !== mark.when[1]) continue;
    }
    const opacity = number(at(mark.opacity));
    const gap = (model.tokens[at(mark.inset)]?.value?.value ?? 0) > 0;
    for (const scheme of model.schemes) {
      for (const condition of mark.conditions) {
        for (const state of STATES) {
          const part = (name) => inScheme(scheme, at(`${condition}.${state}${name}.color`)) ?? inScheme(scheme, at(`${condition}.${name}.color`));
          const [ring, fill, layer] = [part(mark.ring), part(mark.fill), part('container')];
          if (!ring || !fill || rgba(fill).a * opacity === 0) continue;
          let worst;
          for (const groundId of mark.grounds) {
            const surface = colorOf(scheme, groundId);
            if (!surface || rgba(surface).a < 1) continue;
            const ground = layer ? flat(layer, surface) : surface;
            const center = flat(faded(fill, opacity), ground);
            const ratio = contrast(center, gap ? ground : flat(ring, ground));
            if (!worst || ratio < worst.ratio) worst = { ratio, groundId };
          }
          // One pair, the center against what it meets, judged on the ground where it is weakest: counted once.
          if (worst) checked[scheme].componentPairs += 1;
          if (!worst || worst.ratio >= NON_TEXT) continue;
          const [fillId, besideId] = [at(`${condition}.${state}${mark.fill}.color`), gap ? short(worst.groundId) : short(at(`${condition}.${state}${mark.ring}.color`))];
          const why = gap
            ? `the dot of a radio against the gap its fill.inset leaves, which shows ${short(worst.groundId)} through the state layer — WCAG 1.4.11`
            : `the fill of a radio against the ring it meets, at ${short(at(mark.opacity))} ${opacity} over ${short(worst.groundId)} and the state layer — WCAG 1.4.11`;
          failures.push(`[${scheme}] ${short(fillId)} on ${besideId}: ${worst.ratio.toFixed(2)}:1 < ${NON_TEXT}:1 (${why})`);
        }
      }
    }
  }

  // A selected row against a hovered one (`ROW_SELECTION`), and the selected row's text on its fill (4.5:1, 7:1 in the
  // high-contrast schemes). Each fill is laid over each surface role of the scheme (the selection replaces the hover
  // layer's ground, it is not stacked on it) and the worst pair is reported. A fill that is a role is held on its own
  // by the role pairs above. Compared from the component colors of the schemes the model carries.
  if (model.system === CONFIG.namespace) {
    for (const [selectedName, hoveredName, textName] of SELECTED_ROWS) {
      const [selectedId, hoveredId, textId] = [selectedName, hoveredName, textName].map((name) => `${CONFIG.namespace}.comp.${name}`);
      if (!model.tokens[selectedId] || !model.tokens[hoveredId]) continue;
      for (const scheme of model.schemes) {
        const [selected, hovered, text] = [colorOf(scheme, selectedId), colorOf(scheme, hoveredId), model.tokens[textId] && colorOf(scheme, textId)];
        if (!selected || !hovered) continue;
        let apart;
        let read;
        for (const surface of SURFACES) {
          const ground = model.colors[scheme][surface]?.value;
          if (!ground || rgba(ground).a < 1) continue;
          const fill = flat(selected, ground);
          const ratio = contrast(fill, flat(hovered, ground));
          if (!apart || ratio < apart.ratio) apart = { ratio, surface };
          if (text && !role(model.tokens[selectedId])) {
            const textRatio = contrast(text, fill);
            if (!read || textRatio < read.ratio) read = { ratio: textRatio, surface };
          }
        }
        // Each pair is judged on the surface where it is weakest: counted once, as a radio's mark is.
        if (apart) checked[scheme].componentPairs += 1;
        if (read) checked[scheme].componentPairs += 1;
        if (apart && apart.ratio < ROW_SELECTION) failures.push(`[${scheme}] ${short(selectedId)} on ${short(hoveredId)}: ${apart.ratio.toFixed(2)}:1 < ${ROW_SELECTION}:1 (a selected row against a hovered one, each laid over sys.color.${apart.surface}: the two read as one fill — make the selection a layer of the row's content color, as comp.list.selected.container.color is)`);
        const required = scheme.endsWith('-high') ? HIGH_CONTRAST_TEXT : TEXT;
        if (read && read.ratio < required) failures.push(`[${scheme}] ${short(textId)} on ${short(selectedId)}: ${read.ratio.toFixed(2)}:1 < ${required}:1 (a selected row's text on its fill, laid over sys.color.${read.surface})`);
      }
    }
  }

  // Concentric corners. An inner corner annotated `dev.tanrei.concentric` — a row's shape inside a surface's, a
  // control's inside its container's — is the outer corner less the inset between them, and never below zero:
  // larger, its fill bulges past the outer curve where the two meet; smaller, the gap between them is not even. A
  // pill (a corner set by its height) is not annotated. Held in the default system: a preset keeps its original's
  // corners, and says so in its own layer.
  if (model.system === CONFIG.namespace) {
    const px = (id) => model.tokens[id]?.value?.value;
    for (const token of Object.values(model.tokens)) {
      if (!token.concentric) continue;
      const [outerId, insetId] = [token.concentric.outer, token.concentric.inset].map((ref) => (typeof ref === 'string' ? ref.replace(/^\{|\}$/g, '') : undefined));
      const [inner, outer, inset] = [token.value?.value, px(outerId), px(insetId)];
      if (typeof inner !== 'number' || typeof outer !== 'number' || typeof inset !== 'number') {
        failures.push(`${short(token.id)}: dev.tanrei.concentric names ${JSON.stringify(token.concentric)}, which must be two dimension tokens, { "outer": "{id}", "inset": "{id}" }`);
        continue;
      }
      const expected = Math.max(0, outer - inset);
      if (inner !== expected) failures.push(`${short(token.id)}: ${inner}px, but an inner corner is its outer corner less the inset, never below zero — max(0, ${short(outerId)} ${outer}px − ${short(insetId)} ${inset}px) = ${expected}px; derive it with { "fn": "sub", "of": "{${outerId}}", "by": "{${insetId}}" }`);
    }
  }

  // One height per size name. A stacked input box — the box that draws no label inside it, the only look the default
  // system ships — is as tall as a Button of the same size, so that an input and a Button set side by side in one row
  // stand as tall as each other. Held in the default system: a preset keeps its original's fields, and says so in its
  // own layer.
  if (model.system === CONFIG.namespace) {
    for (const size of ['small', 'medium', 'large']) {
      const [boxId, buttonId] = [`${CONFIG.namespace}.comp.input-box.stacked.container.height.${size}`, `${CONFIG.namespace}.comp.button.container.height.${size}`];
      const [box, button] = [model.tokens[boxId]?.value?.value, model.tokens[buttonId]?.value?.value];
      if (typeof box !== 'number' || typeof button !== 'number') failures.push(`${short(boxId)} and ${short(buttonId)} must both be dimensions: a stacked input box is as tall as a Button of the same size`);
      else if (box !== button) failures.push(`${short(boxId)}: ${box}px, but a stacked input box is as tall as a Button of the same size — ${short(buttonId)} is ${button}px; alias it, { "$value": "{${buttonId}}" }`);
    }
  }

  // The target floor. sys.target.minimum is the least height (and width, for an icon-only control) anything a person
  // presses is drawn at, and pointer and touch the least areas a press is taken from: none of them under WCAG 2.5.8's
  // 24px, a hit area never under what is drawn, and a density above zero. Every height the core floors at the minimum
  // (`model.floored`, `targetFloors`, and any rule of this system with that `min`) is held at it, so a layer that pins
  // or re-points one below it is told.
  const px = (id) => model.tokens[`${CONFIG.namespace}.${id}`]?.value?.value;
  const minimum = px('sys.target.minimum');
  for (const name of ['minimum', 'pointer', 'touch']) {
    const value = px(`sys.target.${name}`);
    if (typeof value === 'number' && value < TARGET_THRESHOLDS.minimum) failures.push(`target size: sys.target.${name}: ${value}px < ${TARGET_THRESHOLDS.minimum}px (WCAG 2.5.8: the least target a person presses)`);
    if (name !== 'minimum' && typeof value === 'number' && typeof minimum === 'number' && value < minimum) failures.push(`target floor: sys.target.${name}: ${value}px is under sys.target.minimum (${minimum}px) — the area a press is taken from is never smaller than what is drawn; set it to the minimum or above`);
  }
  const density = model.tokens[`${CONFIG.namespace}.dial.density`]?.value;
  if (typeof density === 'number' && !(density > 0)) failures.push(`target floor: dial.density: ${density} — a density is above zero (1 is the default; below 1 draws closer, above 1 gives more room)`);
  if (typeof minimum === 'number') {
    const MIN = `{${CONFIG.namespace}.sys.target.minimum}`;
    const floored = new Set([...(model.floored ?? []), ...Object.values(model.tokens).filter((token) => token.derive?.min === MIN).map((token) => token.id)]);
    for (const id of [...floored].sort()) {
      const value = model.tokens[id]?.value?.value;
      if (typeof value === 'number' && value < minimum) failures.push(`target size: ${id.slice(CONFIG.namespace.length + 1)}: ${value}px < sys.target.minimum ${minimum}px (a box a person presses is drawn at least the minimum target; derive it with "min": "${MIN}", or lower the minimum)`);
    }
  }

  // A link that is not underlined at rest (WCAG 1.4.1, failure F73, technique G183). A component whose
  // underline choice is `hover` or `never` — its own token, or the system's choice it follows — leaves
  // color alone to tell a link from the text beside it, so its link color is held 3:1 apart from that text's color in
  // every scheme. `always` draws the line at rest and is held to nothing here. The hover and focus cue the technique
  // also asks for is the underline itself under `hover`, and the state layer and the focus ring under `never`.
  const TOLD_APART = [
    ['link', 'standard.label.color', 'sys.color.on-surface', 'a link beside body text'],
    ['link', 'inverse.label.color', 'sys.color.inverse-on-surface', 'a link beside text on an inverse surface'],
    ['breadcrumbs', 'item.content.color', 'comp.breadcrumbs.label.color', 'a level that is a link beside a level that is text'],
  ];
  for (const [component, fgName, besideName, why] of TOLD_APART) {
    const choice = model.tokens[`${CONFIG.namespace}.comp.${component}.underline.visibility`];
    if (!choice?.enum) continue;
    const target = choice.alias ? model.tokens[choice.aliasFinal ?? choice.alias] : choice;
    const named = choice.enum.values?.[target?.value];
    // An index that names nothing is reported above; `always`, the first name, needs no color to carry the difference.
    if (!named || named === 'always') continue;
    const [fgId, besideId] = [`${CONFIG.namespace}.comp.${component}.${fgName}`, `${CONFIG.namespace}.${besideName}`];
    const colorIn = (scheme, id) => {
      const colorRole = id.startsWith(`${CONFIG.namespace}.sys.color.`) ? id.split('.').at(-1) : model.tokens[id] && role(model.tokens[id]);
      return colorRole && model.colors[scheme][colorRole] ? model.colors[scheme][colorRole].value : inScheme(scheme, id);
    };
    for (const scheme of model.schemes) {
      const [fg, beside] = [colorIn(scheme, fgId), colorIn(scheme, besideId)];
      if (!fg || !beside || rgba(fg).a < 1 || rgba(beside).a < 1) continue;
      const ratio = measure(scheme, 'componentPairs', fg, beside);
      if (ratio < NON_TEXT) failures.push(`[${scheme}] ${short(fgId)} against ${short(besideId)}: ${ratio.toFixed(2)}:1 < ${NON_TEXT}:1 (${why}, while ${short(choice.id)} is "${named}": a link not underlined at rest is told from text by color alone — WCAG 1.4.1; underline it always, or move the link color)`);
    }
  }
  return { failures, checked };
}

/** The findings of `auditInvariants` alone: what the build fails on, warns of or records. */
export const checkInvariants = (model) => auditInvariants(model).failures;

/**
 * The count of `auditInvariants` as a report writes it: the totals over every scheme, then each scheme's.
 * @param {Record<string, { rolePairs: number, componentPairs: number }>} checked
 */
export const checkedPairs = (checked) => ({
  rolePairs: Object.values(checked).reduce((sum, each) => sum + each.rolePairs, 0),
  componentPairs: Object.values(checked).reduce((sum, each) => sum + each.componentPairs, 0),
  schemes: checked,
});

/** One line for a build's output: `826 role pairs and 40 component pairs in 6 schemes (light 127 + 8, …)`. */
export const checkedLine = (checked) => {
  const { rolePairs, componentPairs, schemes } = checkedPairs(checked);
  const each = Object.entries(schemes).map(([scheme, n]) => `${scheme} ${n.rolePairs} + ${n.componentPairs}`).join(', ');
  return `${rolePairs} role pairs and ${componentPairs} component pairs checked in ${Object.keys(schemes).length} schemes (${each})`;
};
