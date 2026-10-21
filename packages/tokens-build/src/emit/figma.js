// A sync plan for Figma variables, one per design system (`tokens-build figma-plans <dir>` writes <dir>/<id>.json).
// Figma is a rendering of tokens/, never a source: the plan is applied BY NAME and in place, so bindings in
// the library and in consumers' files survive. Nothing in a Figma file is typed by hand.
import { fontStack } from '../ir.js';
import { CONFIG } from '../model.js';

const NS = CONFIG.namespace;
const PREFIX = CONFIG.web.cssPrefix;
// A Professional plan allows four modes per collection; medium contrast stays code-only.
export const FIGMA_MODES = ['light', 'dark', 'light-high', 'dark-high'];

const web = (path) => `var(${PREFIX}-${path.join('-')})`;
const round = (n) => Math.round(n * 1e4) / 1e4;
const rgba = (value) => ({ r: round(value.components[0]), g: round(value.components[1]), b: round(value.components[2]), a: round(value.alpha ?? 1) });

function colorScopes(role) {
  if (/^elevation-shadow/.test(role) || role === 'shadow') return ['EFFECT_COLOR'];
  if (role === 'scrim') return ['FRAME_FILL', 'SHAPE_FILL', 'EFFECT_COLOR'];
  if (/^(outline|focus-ring|elevation-ring)/.test(role)) return ['STROKE_COLOR'];
  if (role === 'link') return ['TEXT_FILL'];
  if (/^(on-|inverse-on-|inverse-primary)/.test(role)) return ['SHAPE_FILL', 'TEXT_FILL'];
  if (/(container|^surface|^inverse-surface)/.test(role)) return ['FRAME_FILL', 'SHAPE_FILL'];
  return ['FRAME_FILL', 'SHAPE_FILL', 'TEXT_FILL'];
}

function numberScopes(path) {
  const name = path.join('.');
  // A choice of kind is an index into a list of names. It documents the system; binding it to a corner
  // radius or a stroke would be nonsense, so it has no scope and cannot be applied.
  if (/^sys\.behavior\./.test(name)) return [];
  // An amount of corner smoothing and a weight step are applied by the sync (cornerSmoothing, a text style's weight), not bound to a property.
  if (/^sys\.shape\.corner-smoothing$/.test(name) || /^sys\.typescale\.emphasis\./.test(name)) return [];
  if (/^sys\.icon\.weight$/.test(name)) return ['FONT_WEIGHT'];
  if (/^sys\.icon\.fill\./.test(name)) return []; // a font axis; Figma has no scope for it — documented, not applied
  if (/opacity/.test(name)) return ['OPACITY'];
  if (/shape|corner/.test(name)) return ['CORNER_RADIUS'];
  if (/padding|gap|space/.test(name)) return ['GAP'];
  if (/height|target|icon|size/.test(name)) return ['WIDTH_HEIGHT'];
  if (/width|border|focus|outline/.test(name)) return ['STROKE_FLOAT'];
  return ['GAP'];
}

function componentColorScopes(path) {
  const part = path.at(-2);
  if (part === 'label') return ['TEXT_FILL', 'SHAPE_FILL'];
  if (part === 'outline') return ['STROKE_COLOR'];
  return ['FRAME_FILL', 'SHAPE_FILL'];
}

/** Figma reads a number bound to layer opacity as 0–100. */
const isProportion = (token) => token.type === 'number' && /opacity/.test(token.id);

export function emitFigmaPlan(model) {
  const tokens = Object.values(model.tokens).filter((t) => t.namespace === NS);
  const collectionOf = (id) => {
    const [, tier, group] = id.split('.');
    if (tier === 'sys' && group === 'color') return `${NS}/sys.color`;
    if (tier === 'comp' && model.tokens[id]?.type === 'color') return `${NS}/comp.color`;
    return `${NS}/${tier}`;
  };
  const nameOf = (id) => {
    const parts = id.split('.').slice(1);
    return (parts[0] === 'sys' && parts[1] === 'color' ? parts.slice(2) : parts.slice(1)).join('/');
  };
  const reference = (id) => ({ alias: { collection: collectionOf(id), name: nameOf(id) } });
  const numeric = (token) => (token.type === 'duration' ? round(token.value.value * (token.value.unit === 's' ? 1000 : 1)) : token.type === 'dimension' ? token.value.value : token.value);
  // Typefaces reach Figma as STRING variables: the system's typefaces (hidden, in ref) and the icon family per
  // selection state, which the `Icon / …` components bind their font family to.
  const isFamily = (t) => t.type === 'fontFamily' && ((t.path[0] === 'ref' && t.path[1] === 'typeface') || (t.path[0] === 'sys' && t.path[1] === 'icon'));
  // Durations reach Figma as FLOAT variables in milliseconds: the system's duration steps, its durations by role
  // (`sys.motion.role.*`) and what a component does with them (`comp.button.motion.feedback-duration`). Figma cannot bind a variable to a prototype's timing, so they
  // have no scope — they document the system, like the dials and the choices of kind. Easings and springs are not
  // numbers; they stay code-only.
  const isDuration = (t) => t.type === 'duration' && (t.path[0] === 'comp' || (t.path[0] === 'sys' && t.path[1] === 'motion' && (t.path[2] === 'duration' || t.path[2] === 'role')));
  // Where a surface that appears starts from (`sys.motion.appear.*`: an opacity, a scale, a distance, a blur, an origin)
  // is numbers too, documented the same way: a prototype's transition cannot be bound to a variable.
  const isAppear = (t) => t.path[0] === 'sys' && t.path[1] === 'motion' && t.path[2] === 'appear' && (t.type === 'dimension' || t.type === 'number');
  const isMotion = (t) => isDuration(t) || isAppear(t);
  const inPlan = (id) => {
    const target = model.tokens[id];
    return target && (target.type === 'color' || target.type === 'dimension' || target.type === 'number' || isFamily(target) || isDuration(target)) && !(target.path[0] === 'sys' && target.path[1] === 'motion' && !isMotion(target));
  };
  // A Figma variable holds ONE family name: the first named family of the stack (or the generic class when the
  // stack names none). The whole stack stays in the description.
  const family = (token) => {
    const stack = fontStack(token.value);
    return {
      name: nameOf(token.id),
      type: 'STRING',
      scopes: token.path[0] === 'ref' ? [] : ['FONT_FAMILY'],
      web: web(token.path),
      description: `${token.description ?? ''} Stack: ${stack.stack.join(', ')}. Fonts are referenced by name; install the family to see it in Figma.`.trim(),
      values: { value: token.alias && inPlan(token.alias) ? reference(token.alias) : (stack.families[0] ?? stack.generic) },
    };
  };

  const float = (token) => {
    const value = isProportion(token) ? round(numeric(token) * 100) : numeric(token);
    const choice = token.enum?.values ? ` Choice: "${token.enum.values[token.value]}" — index ${token.value} of ${token.enum.values.join(' | ')}. Behaviour, not a value: nothing in Figma is bound to it.` : '';
    const timing = token.type === 'duration' ? ' Milliseconds. Motion is not drawn in Figma: documented, not applied.' : isAppear(token) ? ' Motion is not drawn in Figma: documented, not applied.' : '';
    const note = isProportion(token) ? ` Code value: ${numeric(token)} (Figma stores opacity as 0–100).` : choice || timing;
    return {
      name: nameOf(token.id),
      type: 'FLOAT',
      scopes: token.path[0] === 'dial' || token.type === 'duration' || isAppear(token) ? [] : numberScopes(token.path),
      web: web(token.path),
      // A dial has no description of its own; what it is for is the rationale its vocabulary entry gives.
      description: `${token.description ?? (token.path[0] === 'dial' && token.vocabulary?.rationale ? `A dial: every token derived from it follows. ${token.vocabulary.rationale}` : '')}${note}`.trim(),
      // A scaled alias (`scale: 2`) is a computed value in Figma: variables cannot multiply.
      values: { value: token.alias && inPlan(token.alias) && !token.derive ? reference(token.alias) : value },
    };
  };

  const ref = [
    ...tokens.filter((t) => t.path[0] === 'ref' && t.type === 'color').map((t) => ({
      name: nameOf(t.id), type: 'COLOR', scopes: [], web: web(t.path), description: t.description ?? '', values: { value: rgba(t.value) },
    })),
    ...tokens.filter((t) => t.path[0] === 'ref' && isFamily(t)).map(family),
  ];
  const dial = tokens.filter((t) => t.path[0] === 'dial').map(float);
  // Of motion, only the durations and where a surface appears from are numbers a variable can hold (`isMotion`).
  const sys = tokens.filter((t) => t.path[0] === 'sys' && t.path[1] !== 'color' && ((t.path[1] !== 'motion' && (t.type === 'dimension' || t.type === 'number')) || isMotion(t))).map(float);
  sys.push(...tokens.filter((t) => t.path[0] === 'sys' && isFamily(t)).map(family));
  const comp = tokens.filter((t) => t.path[0] === 'comp' && (t.type === 'dimension' || t.type === 'number' || isDuration(t))).map(float);

  const roles = Object.keys(model.colors.light).map((role) => ({
    name: role,
    type: 'COLOR',
    scopes: colorScopes(role),
    web: web(['sys', 'color', role]),
    description: model.colors.light[role].description ?? '',
    values: Object.fromEntries(FIGMA_MODES.map((mode) => {
      const token = model.colors[mode][role];
      return [mode, token.alias && inPlan(token.alias) ? reference(token.alias) : rgba(token.value)];
    })),
  }));

  const componentColors = Object.values(model.componentColors.light).map((light) => ({
    name: nameOf(light.id),
    type: 'COLOR',
    scopes: componentColorScopes(light.path),
    web: web(light.path),
    description: light.description ?? (light.state ? `The ${light.path.at(-2)} color while ${light.state}. Computed per scheme by the design system's rule; Figma holds the result.` : ''),
    values: Object.fromEntries(FIGMA_MODES.map((mode) => {
      const token = model.componentColors[mode][light.id];
      return [mode, token.alias && inPlan(token.alias) ? reference(token.alias) : rgba(token.value)];
    })),
  }));

  const typescale = tokens.filter((t) => t.type === 'typography' && t.path[0] === 'sys').map((t) => ({
    name: `${NS}/typescale/${t.path.slice(2).join('/')}`,
    fontFamilies: t.value.fontFamily,
    fontSize: t.value.fontSize.value,
    fontWeight: t.value.fontWeight,
    lineHeightPx: round(t.value.fontSize.value * t.value.lineHeight),
    letterSpacingPx: t.value.letterSpacing.value,
    description: t.description ?? '',
  }));
  // An empty list of layers is a real effect style with no effects (level0): it draws nothing, and a component bound
  // to it keeps following the system when a preset gives level0 a shadow.
  const elevation = tokens.filter((t) => t.type === 'shadow' && t.path[0] === 'sys').map((t) => ({
    name: `${NS}/elevation/${t.path.at(-1)}`,
    layers: (Array.isArray(t.value) ? t.value : [t.value]).map((layer, i) => ({
      x: layer.offsetX.value, y: layer.offsetY.value, blur: layer.blur.value, spread: layer.spread.value,
      color: t.partialAlias?.[i]?.color ? reference(t.partialAlias[i].color) : rgba(layer.color),
    })),
  }));

  const one = (name, variables, hidden = false) => ({ name, modes: ['value'], hidden, variables });
  return {
    $comment: 'GENERATED — do not edit. A by-name sync plan for Figma variables and styles; see design/figma/README.md.',
    system: model.system,
    collections: [
      one(`${NS}/ref`, ref, true),
      one(`${NS}/dial`, dial),
      { name: `${NS}/sys.color`, modes: FIGMA_MODES, hidden: false, variables: roles },
      one(`${NS}/sys`, sys),
      one(`${NS}/comp`, comp),
      { name: `${NS}/comp.color`, modes: FIGMA_MODES, hidden: false, variables: componentColors },
    ],
    textStyles: typescale,
    effectStyles: elevation,
  };
}
