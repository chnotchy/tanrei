// Adapters for ecosystems that have their own theme variables: Tailwind CSS v4 (`@theme`) and shadcn/ui.
// Both are MAPPINGS onto Tanrei's custom properties, not copies of values — so the runtime dials, the
// light/dark schemes, the contrast levels and `data-tanrei-system` scopes keep working underneath them.
import { CONFIG, GENERATED_HEADER } from '../model.js';

const NS = CONFIG.web.cssPrefix;
const v = (...path) => `var(${NS}-${path.join('-')})`;
const banner = (notes) => `/* ${[...GENERATED_HEADER, ...notes].join('\n   ')} */`;

/**
 * Tailwind CSS v4. `@import` this after Tailwind and after the Tanrei stylesheet:
 * `bg-primary`, `text-on-primary`, `rounded-medium`, `p-200`, `text-body-large`, `shadow-level2`, `duration-short3`…
 */
export function emitTailwindTheme(model) {
  const sys = (group) => Object.values(model.tokens).filter((t) => t.path[0] === 'sys' && t.path[1] === group);
  const lines = [];
  const section = (title, entries) => lines.push('', `  /* ${title} */`, ...entries.map(([name, value]) => `  ${name}: ${value};`));

  section('Tanrei owns the scales: Tailwind’s defaults are cleared so nothing off-system is reachable.', [
    ['--color-*', 'initial'], ['--radius-*', 'initial'], ['--text-*', 'initial'], ['--shadow-*', 'initial'], ['--ease-*', 'initial'],
  ]);
  section('sys.color — every role of the system, including the ones its palettes declare', Object.keys(model.colors.light).sort().map((role) => [`--color-${role}`, v('sys', 'color', role)]));
  section('sys.shape.corner', sys('shape').filter((t) => t.type === 'dimension').map((t) => [`--radius-${t.path.at(-1)}`, v(...t.path)]));
  section('sys.shape.corner-smoothing — 0 is a quarter circle, 0.6 the iOS corner; apply with `corner-shape: superellipse(…)` where the browser has it', [['--corner-smoothing', v('sys', 'shape', 'corner-smoothing')]]);
  section('sys.space — `p-200` is space200; the numeric scale (`p-4`) follows the spacing dial', [
    ['--spacing', `calc(${v('dial', 'space', 'unit')} / 2)`],
    ...sys('space').map((t) => [`--spacing-${t.path.at(-1).replace('space', '')}`, v(...t.path)]),
  ]);
  const roles = sys('typescale').filter((t) => t.type === 'typography').map((t) => t.path.slice(2));
  section('sys.typescale — `text-heading-2` sets size, line height, tracking and weight together; `--text-emphasis-*` is the weight step of `emphasized` text', roles.flatMap((path) => {
    const name = path[0];
    const at = (field) => v('sys', 'typescale', ...path, field);
    return [
      [`--text-${name}`, at('font-size')],
      [`--text-${name}--line-height`, at('line-height')],
      [`--text-${name}--letter-spacing`, at('letter-spacing')],
      [`--text-${name}--font-weight`, at('font-weight')],
    ];
  }).concat(sys('typescale').filter((t) => t.type === 'number').map((t) => [`--text-emphasis-${t.path[3]}`, v(...t.path)])));
  section('ref.typeface — the CSS stacks as they are; the families a product must load are listed by `tanrei build`', [['--font-sans', v('ref', 'typeface', 'plain')], ['--font-display', v('ref', 'typeface', 'brand')], ['--font-mono', v('ref', 'typeface', 'mono')]]);
  section('sys.icon.family — `font-icon` draws an unselected icon, `font-icon-selected` a selected one (a static set has two families)', [
    ['--font-icon', v('sys', 'icon', 'family', 'unselected')],
    ['--font-icon-selected', v('sys', 'icon', 'family', 'selected')],
  ]);
  section('sys.elevation', sys('elevation').map((t) => [`--shadow-${t.path.at(-1)}`, v(...t.path)]));
  section('sys.motion', [
    ...sys('motion').filter((t) => t.path[2] === 'easing').map((t) => [`--ease-${t.path.at(-1)}`, v(...t.path)]),
    ...sys('motion').filter((t) => t.path[2] === 'duration').map((t) => [`--transition-duration-${t.path.at(-1)}`, v(...t.path)]),
  ]);

  // Choices of kind are not a scale, so they are variants: `pressed-feedback-ripple:[…]`
  // applies where the active system — the page's, or a `data-${CONFIG.namespace}-system` scope's — names that value.
  const choices = Object.values(model.tokens)
    .filter((t) => t.path[0] === 'sys' && t.path[1] === 'behavior' && t.enum?.values)
    .flatMap((t) => t.enum.values.map((name) => `@custom-variant ${t.path.at(-1)}-${name} {\n  @container style(${NS}-${t.path.join('-')}: ${name}) {\n    @slot;\n  }\n}`));

  return [
    banner([`Tailwind CSS v4 theme for the "${model.system}" design system. Load the Tanrei stylesheet first; this file only maps names.`]),
    '@theme inline {',
    ...lines.slice(1),
    '}',
    '',
    `/* Tailwind's dark: variant follows Tanrei's theme attribute, and the OS when none is set. */`,
    `@custom-variant dark (&:where([data-${CONFIG.namespace}-theme="dark"], [data-${CONFIG.namespace}-theme="dark"] *));`,
    '',
    ...(choices.length ? [`/* sys.behavior — what the active design system chose, as variants (style container queries). */`, ...choices, ''] : []),
  ].join('\n');
}

/**
 * shadcn/ui. Replaces the `:root` / `.dark` variable blocks of a shadcn `globals.css`. There is one block:
 * Tanrei's roles already switch with the scheme, so `.dark` only has to say which scheme is wanted.
 */
export function emitShadcnTheme(model) {
  const color = (role) => v('sys', 'color', role);
  const map = [
    ['background', 'surface'], ['foreground', 'on-surface'],
    ['card', 'surface-container-low'], ['card-foreground', 'on-surface'],
    ['popover', 'surface-container'], ['popover-foreground', 'on-surface'],
    ['primary', 'primary'], ['primary-foreground', 'on-primary'],
    ['secondary', 'secondary-container'], ['secondary-foreground', 'on-secondary-container'],
    ['muted', 'surface-container-high'], ['muted-foreground', 'on-surface-variant'],
    ['accent', 'surface-container-highest'], ['accent-foreground', 'on-surface'],
    ['destructive', 'error'], ['destructive-foreground', 'on-error'],
    ['border', 'outline-variant'], ['input', 'outline'], ['ring', 'focus-ring'],
    ['sidebar', 'surface-container-low'], ['sidebar-foreground', 'on-surface'],
    ['sidebar-primary', 'primary'], ['sidebar-primary-foreground', 'on-primary'],
    ['sidebar-accent', 'surface-container-high'], ['sidebar-accent-foreground', 'on-surface'],
    ['sidebar-border', 'outline-variant'], ['sidebar-ring', 'focus-ring'],
  ];
  const missing = map.filter(([, role]) => !(role in model.colors.light)).map(([, role]) => role);
  if (missing.length) throw new Error(`shadcn export: the vocabulary has no role ${missing.join(', ')}`);
  // shadcn's `accent` is a hover surface, not a brand color: it maps to a surface step, never to a declared palette.
  const charts = ['primary', 'info', 'success', 'warning', 'error'];
  return [
    banner([`shadcn/ui variables for the "${model.system}" design system. Load the Tanrei stylesheet first; this file only maps names.`]),
    ':root {',
    `  --radius: ${v('sys', 'shape', 'corner', 'medium')};`,
    ...map.map(([name, role]) => `  --${name}: ${color(role)};`),
    ...charts.map((role, i) => `  --chart-${i + 1}: ${color(role)};`),
    '}',
    '',
    `/* shadcn toggles a class; Tanrei's roles follow color-scheme. */`,
    '.dark { color-scheme: dark; }',
    '.light { color-scheme: light; }',
    '',
  ].join('\n');
}
