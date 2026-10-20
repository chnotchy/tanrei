import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { emitCss } from '../src/emit/css.js';
import { emitDart } from '../src/emit/dart.js';
import { emitKotlin } from '../src/emit/kotlin.js';
import { emitSwift } from '../src/emit/swift.js';
import { emitTs } from '../src/emit/ts.js';
import { CONTRAST_THRESHOLDS, checkInvariants, contrast } from '../src/invariants.js';
import { buildIR } from '../src/ir.js';
import { REPO_ROOT, TOKENS_DIR, buildModel } from '../src/model.js';
import { SCHEMES, generateSchemeFiles, loadDefaultSystem } from '../src/scheme.js';

const system = loadDefaultSystem(REPO_ROOT);
const model = await buildModel();
// A model a test may break: every entry (a token, a role of a scheme, a component color of a scheme) is a copy of its
// own, so setting or deleting a field of one entry — all these tests do — touches nothing else. The values the entries
// hold are the model's own. (A structured clone of the whole model, thirteen times, would leave 1.3 GB resident in this
// file's process.)
const entries = (map) => Object.fromEntries(Object.entries(map).map(([key, entry]) => [key, { ...entry }]));
const perScheme = (maps) => Object.fromEntries(Object.entries(maps).map(([scheme, map]) => [scheme, entries(map)]));
const breakable = (from) => ({ ...from, tokens: entries(from.tokens), colors: perScheme(from.colors), componentColors: perScheme(from.componentColors) });
const ir = buildIR(model);
const srgb = (hex) => ({ colorSpace: 'srgb', components: [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255) });

test('contrast() matches WCAG reference values', () => {
  assert.equal(Math.round(contrast(srgb('#000000'), srgb('#ffffff')) * 100) / 100, 21);
  assert.equal(Math.round(contrast(srgb('#767676'), srgb('#ffffff')) * 100) / 100, 4.54);
});

test('contrast() composites a translucent foreground before measuring', () => {
  const hairline = { ...srgb('#000000'), alpha: 0.08 };
  const ratio = contrast(hairline, srgb('#ffffff'));
  assert.ok(ratio > 1.1 && ratio < 1.3, `8% black on white should be ≈1.2:1, got ${ratio}`);
});

test('scheme generation is deterministic and matches the committed files', () => {
  const a = generateSchemeFiles(system, REPO_ROOT);
  const b = generateSchemeFiles(system, REPO_ROOT);
  assert.deepEqual(a, b);
  for (const [name, doc] of Object.entries(a)) {
    const committed = fs.readFileSync(path.join(TOKENS_DIR, 'generated', name), 'utf8');
    assert.equal(committed, `${JSON.stringify(doc, null, 2)}\n`, `${name} is stale — run pnpm generate`);
  }
});

test('resolved values still equal the oracle, except where they differ on purpose', () => {
  for (const scheme of SCHEMES) {
    const oracle = JSON.parse(fs.readFileSync(new URL(`./oracle/tanrei.${scheme}.tokens.json`, import.meta.url), 'utf8'));
    const current = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, `design/tokens/tanrei.${scheme}.tokens.json`), 'utf8'));
    const flatten = (node, prefix, out) => { for (const [k, v] of Object.entries(node)) { if (k.startsWith('$')) continue; if (v && typeof v === 'object' && '$value' in v) out[`${prefix}${k}`] = v.$value; else if (v && typeof v === 'object') flatten(v, `${prefix}${k}.`, out); } return out; };
    const before = flatten(oracle, '', {}), after = flatten(current, '', {});
    // The color vocabulary differs from the oracle on purpose: roles were removed, and the accent palette has a
    // new seed. Everything else — every numeric token, and every color role that kept its rule — must
    // still equal the oracle.
    const intended = (id) =>
      // The export wrote the light value of every component color into every scheme's file, and the oracle captured
      // that: outside light, component colors now take their own scheme.
      (scheme !== 'light' && /\.comp\..*color$/.test(id)) ||
      /\.sys\.color\.(focus-ring|.*tertiary.*|.*fixed.*|background|on-background)$/.test(id) ||
      id.includes('.ref.palette.accent.') ||
      // The default typefaces changed on purpose (Inter, Noto Sans JP, Roboto Mono): every text style carries the family.
      /\.ref\.typeface\.(brand|plain|mono)$/.test(id) ||
      // Renamed or replaced by per-state tokens once every platform had migrated (see their changesets).
      /\.comp\.button\.(disabled\.(container|label)\.|[a-z]+\.state-layer\.|container\.padding-inline\.)/.test(id) ||
      /\.sys\.focus\.ring-(width|gap)$/.test(id) ||
      // No elevation is an empty list of shadow layers, not one invisible layer.
      /\.sys\.elevation\.level0$/.test(id) ||
      // The emphasis roles are gone (filled binds primary; same color, checked by the baselines).
      /\.sys\.color\.(on-)?emphasis(-container)?$/.test(id) ||
      // The emphasized twins are gone (a weight step now); two display sizes and corner-style are gone.
      /\.sys\.typescale\.emphasized\./.test(id) || /\.sys\.typescale\.display-(large|small)$/.test(id) || /\.sys\.behavior\.corner-style$/.test(id) ||
      // Every button is fully rounded, a pill with a label and a circle without.
      /\.comp\.button\.container\.shape$/.test(id) ||
      // The icon scale moved up (medium 24; extra-small 16, small 20, large 32), and a button's glyph with it.
      /\.sys\.icon\.(extra-small|small|medium|large)$/.test(id) || /\.comp\.button\.icon\.size$/.test(id) ||
      // The default button sizes are Material 3 Expressive's three smallest, 32 / 40 / 56.
      /\.comp\.button\.container\.height\.(medium|large)$/.test(id) ||
      // The outlined button's edge is the hairline role.
      /\.comp\.button\.outlined\.outline\.color$/.test(id) ||
      // The four status container pairs are quiet, valued from
      // palettes of their own, so the tones of the status palettes that only those roles read are no longer written.
      /\.sys\.color\.(on-)?(info|warning|error|success)-container$/.test(id) ||
      (/\.ref\.palette\.(info|warning|error|success)\.(15|22|88|89|91|92|93|96)$/.test(id) && !(id in after)) ||
      // The hairline is raised in the raised-contrast schemes: 3:1 at medium, 4.5:1 at high, against every surface.
      (/-(medium|high)$/.test(scheme) && /\.sys\.color\.outline-variant$/.test(id)) ||
      false;
    // The text styles are named by level. The VALUE of each must not have moved: the new role resolves to
    // what the old one did (family aside — eyebrow moved from mono to plain on purpose).
    const RENAMED = { 'display-medium': 'display', 'headline-large': 'heading-1', 'headline-medium': 'heading-2', 'headline-small': 'heading-3', 'title-large': 'heading-4', 'title-medium': 'heading-5', 'title-small': 'heading-6', 'body-medium': 'body', 'label-large': 'label', 'label-medium': 'label-small', 'label-small': 'caption', 'code-medium': 'code' };
    const renamed = (id) => { const m = /^(.*\.sys\.typescale\.)([a-z-]+)$/.exec(id); return m && RENAMED[m[2]] ? `${m[1]}${RENAMED[m[2]]}` : id; };
    // These are per-size members of Button's size axis. The VALUE must not have moved: each size
    // still resolves to what the single token resolved to.
    const perSize = /\.comp\.button\.(label\.typescale|container\.gap|outline\.width)$/;
    let compared = 0;
    for (const [id, value] of Object.entries(before)) {
      if (intended(id)) continue;
      if (perSize.test(id)) {
        const family = (v) => (v && typeof v === 'object' && 'fontFamily' in v ? { ...v, fontFamily: undefined } : v);
        for (const size of ['small', 'medium', 'large']) assert.deepEqual(family(after[`${id}.${size}`]), family(value), `${scheme}: ${id}.${size} differs from the former ${id}`);
        compared++;
        continue;
      }
      // …so a text style is compared without its family: size, weight, line height and tracking must not have moved.
      const sansFamily = (v) => (v && typeof v === 'object' && 'fontFamily' in v ? { ...v, fontFamily: undefined } : v);
      assert.deepEqual(sansFamily(after[renamed(id)]), sansFamily(value), `${scheme}: ${id} changed${renamed(id) !== id ? ` (now ${renamed(id)})` : ''}`);
      compared++;
    }
    // A floor so this test cannot pass vacuously. It drops only when tokens are removed or changed
    // on purpose; every remaining value still equals the oracle's. (245 in the raised-contrast schemes, whose hairline
    // was raised on purpose.)
    assert.ok(compared >= 245, `compared ${compared}`);
  }
});

test('every scheme defines the same color roles', () => {
  const roles = Object.keys(model.colors.light).sort();
  for (const scheme of SCHEMES) assert.deepEqual(Object.keys(model.colors[scheme]).sort(), roles, scheme);
});

test('all accessibility and structure invariants hold', () => {
  assert.deepEqual(checkInvariants(model), []);
});

test('invariants catch a functional boundary that is only a hairline', () => {
  const broken = breakable(model);
  broken.colors.light.outline = broken.colors.light['outline-variant'];
  const failures = checkInvariants(broken);
  assert.ok(failures.some((f) => f.includes('outline on surface') && f.includes('[light]')), failures.join('\n'));
});

test('invariants hold a status color against its own tonal container, as a mark', () => {
  // The tag's mark and the snackbar's glyph are the status's color on the status's container: 3:1, in every scheme.
  const broken = breakable(model);
  broken.colors.light.error.value = broken.colors.light['error-container'].value;
  const failures = checkInvariants(broken);
  assert.ok(failures.some((f) => f.startsWith('[light] error on error-container: 1.00:1 < 3:1 (status mark on its tonal container')), failures.join('\n'));
  for (const scheme of model.schemes) {
    for (const status of ['info', 'warning', 'error', 'success']) {
      assert.ok(contrast(model.colors[scheme][status].value, model.colors[scheme][`${status}-container`].value) >= 3, `${scheme} ${status}`);
    }
  }
});

test('the snackbar\'s inverse status forms are the other theme\'s status forms, value for value (SNK-30)', () => {
  const OTHER = { light: 'dark', 'light-medium': 'dark-medium', 'light-high': 'dark-high', dark: 'light', 'dark-medium': 'light-medium', 'dark-high': 'light-high' };
  const inverse = (id) => id.startsWith('tanrei.comp.snackbar.') && /\.inverse-(info|warning|error|success)\./.test(id);
  let compared = 0;
  for (const scheme of SCHEMES) {
    for (const id of Object.keys(model.componentColors[scheme]).filter(inverse)) {
      const twin = model.componentColors[OTHER[scheme]][id.replace('.inverse-', '.')];
      assert.ok(twin, `${id} has a status form of the same name`);
      assert.deepEqual(model.componentColors[scheme][id].value, twin.value, `${scheme} ${id}`);
      compared++;
    }
  }
  // 18 color tokens of each of four forms (the bar, the title, the message, the glyph, the edge, the focus indicator,
  // and the action's three colors at rest and in three states), in six schemes. The expand and close buttons have no
  // colors of their own: their tone is the form's message and focus colors (SNK-34).
  assert.equal(compared, 432);

  // The build holds it: a restated tone that drifts from the role it restates is named, with both values.
  const drifted = breakable(model);
  drifted.componentColors.dark['tanrei.comp.snackbar.inverse-info.icon.color'].value = drifted.componentColors.dark['tanrei.comp.snackbar.inverse-info.supporting-text.color'].value;
  const failures = checkInvariants(drifted);
  assert.deepEqual(failures.filter((f) => f.includes('SNK-30')), [
    '[dark] comp.snackbar.inverse-info.icon.color is #212839, but comp.snackbar.info.icon.color is #3066cb in light: a status\'s inverse form is that status\'s form in the other theme (SNK-30)',
  ]);
  // Only the default system is held to the mirror: a preset or a product draws its own inverse status forms.
  const elsewhere = breakable(drifted);
  elsewhere.system = 'acme';
  assert.deepEqual(checkInvariants(elsewhere).filter((f) => f.includes('SNK-30')), []);
});

test('invariants hold what is read on an inverse status bar against that bar, opacities applied', () => {
  const id = (name) => `tanrei.comp.snackbar.${name}`;
  const breakIt = (scheme, fg, as) => {
    const broken = breakable(model);
    broken.system = 'acme'; // the mirror is not what is tested here
    broken.componentColors[scheme][id(fg)].value = broken.componentColors[scheme][id(as)].value;
    return checkInvariants(broken);
  };
  // The message and the title, as text; in a high-contrast scheme at 7:1.
  let failures = breakIt('light', 'inverse-warning.supporting-text.color', 'inverse-warning.container.color');
  assert.ok(failures.includes('[light] comp.snackbar.inverse-warning.supporting-text.color on comp.snackbar.inverse-warning.container.color: 1.00:1 < 4.5:1 (message on its bar)'), failures.join('\n'));
  assert.ok(failures.some((f) => f.includes('(description at its opacity under a title)')), failures.join('\n'));
  failures = breakIt('dark-high', 'inverse-info.title.color', 'inverse-info.container.color');
  assert.ok(failures.includes('[dark-high] comp.snackbar.inverse-info.title.color on comp.snackbar.inverse-info.container.color: 1.00:1 < 7:1 (title on its bar)'), failures.join('\n'));
  // The glyph at icon.opacity, as a mark.
  failures = breakIt('dark', 'inverse-error.icon.color', 'inverse-error.container.color');
  assert.ok(failures.includes('[dark] comp.snackbar.inverse-error.icon.color on comp.snackbar.inverse-error.container.color: 1.00:1 < 3:1 (status glyph at icon.opacity on its bar)'), failures.join('\n'));
  // The expand and close buttons' glyph, the form's message color given as their tone, on its circle over the bar,
  // at rest and in a state (SNK-34).
  failures = breakIt('light', 'inverse-info.supporting-text.color', 'inverse-info.container.color');
  for (const state of ['rest', 'hovered', 'focused', 'pressed']) {
    assert.ok(failures.includes(`[light] comp.snackbar.inverse-info.supporting-text.color on comp.snackbar.inverse-info.container.color: 1.00:1 < 3:1 (expand and close glyph on its circle over the bar, ${state})`), failures.join('\n'));
  }
  // The default system holds it in all ten forms and six schemes, with room: the weakest is a focused or pressed glyph
  // on an inverse status bar.
  const ground = (scheme, form, layer) => {
    const name = (part) => id(form ? `${form}.${part}` : part);
    const tone = model.componentColors[scheme][name('supporting-text.color')].value;
    const bar = model.componentColors[scheme][name('container.color')].value;
    const mixed = (top, under, amount) => {
      const [t, u] = [top.components, under.components];
      return { colorSpace: 'srgb', components: [0, 1, 2].map((i) => t[i] * amount + u[i] * (1 - amount)), alpha: 1 };
    };
    const circle = mixed(tone, bar, model.tokens['tanrei.comp.button.tone.container.opacity'].value);
    return contrast(tone, layer ? mixed(tone, circle, model.tokens[`tanrei.sys.state.${layer}-state-layer-opacity`].value) : circle);
  };
  const FORMS = ['', 'info', 'warning', 'error', 'success', 'inverse', 'inverse-info', 'inverse-warning', 'inverse-error', 'inverse-success'];
  const weakest = Math.min(...SCHEMES.flatMap((scheme) => FORMS.flatMap((form) => [null, 'hover', 'focus', 'pressed'].map((layer) => ground(scheme, form, layer)))));
  assert.equal(weakest.toFixed(2), '6.21');

  // The floors the default system holds, at the least over the four statuses: the glyph is the one that is near its floor.
  const drawn = (scheme, name, opacity) => {
    const color = model.componentColors[scheme][id(name)].value;
    return { ...color, alpha: (color.alpha ?? 1) * opacity };
  };
  const least = (scheme, part, opacity) => Math.min(...['info', 'warning', 'error', 'success'].map((status) => contrast(drawn(scheme, `inverse-${status}.${part}.color`, opacity), model.componentColors[scheme][id(`inverse-${status}.container.color`)].value)));
  const glyph = model.tokens[id('icon.opacity')].value;
  for (const scheme of SCHEMES) assert.ok(least(scheme, 'icon', glyph) >= 3, `${scheme}: ${least(scheme, 'icon', glyph)}`);
  assert.equal(least('dark', 'icon', glyph).toFixed(2), '3.61');
});

test('invariants hold the link color and the focus color on the tonal containers', () => {
  // A callout's body holds the product's links and controls on secondary-container or on a status's container.
  const CONTAINERS = ['secondary-container', 'info-container', 'warning-container', 'error-container', 'success-container'];
  let broken = breakable(model);
  broken.colors.light.link.value = broken.colors.light['info-container'].value;
  let failures = checkInvariants(broken);
  assert.ok(failures.includes('[light] link on info-container: 1.00:1 < 4.5:1 (inline link on a tonal container)'), failures.join('\n'));
  broken = breakable(model);
  broken.colors['dark-high']['focus-ring'].value = broken.colors['dark-high']['secondary-container'].value;
  failures = checkInvariants(broken);
  assert.ok(failures.includes('[dark-high] focus-ring on secondary-container: 1.00:1 < 3:1 (focus indicator on a tonal container (WCAG 2.4.13))'), failures.join('\n'));
  // Only the default system is held to it: a preset's or a product's link on its own tonal containers is its own.
  broken.system = 'acme';
  assert.deepEqual(checkInvariants(broken).filter((f) => f.includes('tonal container (WCAG 2.4.13)') || f.includes('inline link on a tonal container')), []);
  // The default system holds both on all five, in all six schemes: a link as text, the focus color as a mark.
  for (const scheme of SCHEMES) {
    for (const container of CONTAINERS) {
      const on = model.colors[scheme][container].value;
      assert.ok(contrast(model.colors[scheme].link.value, on) >= (scheme.endsWith('-high') ? 7 : 4.5), `${scheme} link on ${container}`);
      assert.ok(contrast(model.colors[scheme]['focus-ring'].value, on) >= 3, `${scheme} focus-ring on ${container}`);
    }
  }
});

// What the code check reports: a code block's or inline code's color, measured on one of its grounds.
const CODE_FAILURE = /^\[[a-z-]+\] comp\.(?:code-block|inline-code)\./;

test('invariants hold what is read in code against its grounds, where no role pair does', () => {
  const id = (name) => `tanrei.comp.${name}`;
  const mine = (failures) => failures.filter((f) => CODE_FAILURE.test(f));
  // The shipped default system holds: its neutral code colors are roles on surfaces, held by the role pairs, and its
  // syntax hues are tones of palettes of their own, held here in all six schemes.
  assert.deepEqual(mine(checkInvariants(model)), []);
  const repoint = (token, to) => {
    const broken = breakable(model);
    broken.tokens[id(token)].alias = `tanrei.sys.color.${to}`;
    delete broken.tokens[id(token)].aliasFinal;
    return mine(checkInvariants(broken));
  };
  // A layer re-points a syntax role at a color that is held on surfaces as a boundary only (3:1): comments would be unreadable.
  let failures = repoint('code-block.syntax.color.comment', 'outline');
  assert.ok(failures.some((f) => f.startsWith('[light] comp.code-block.syntax.color.comment on comp.code-block.filled.container.color: ') && f.endsWith("< 4.5:1 (code on the block's fill)")), failures.join('\n'));
  assert.ok(failures.some((f) => f.startsWith('[light] comp.code-block.syntax.color.comment on comp.code-block.line.highlighted.container.color: ') && f.endsWith("< 4.5:1 (code on a highlighted line's band)")), failures.join('\n'));
  // An outlined block has no fill: a syntax color is held on every surface it may stand on.
  for (const surface of ['surface', 'surface-dim', 'surface-bright', 'surface-container-lowest', 'surface-container-low', 'surface-container', 'surface-container-high', 'surface-container-highest']) {
    assert.ok(failures.some((f) => f.startsWith(`[light] comp.code-block.syntax.color.comment on sys.color.${surface}: `) && f.endsWith('< 4.5:1 (code in an outlined block on a surface)')), `${surface}\n${failures.join('\n')}`);
  }
  // In a high-contrast scheme text is held at 7:1: the hairline's color there is far from it.
  failures = repoint('code-block.syntax.color.property', 'outline-variant');
  assert.ok(failures.some((f) => f.startsWith('[dark-high] comp.code-block.syntax.color.property on comp.code-block.filled.container.color: ') && f.endsWith("< 7:1 (code on the block's fill)")), failures.join('\n'));
  // A bar is a mark: the hairline's color is not one.
  failures = repoint('code-block.line.added.mark.color', 'outline-variant');
  assert.ok(failures.some((f) => f.startsWith('[light] comp.code-block.line.added.mark.color on comp.code-block.filled.container.color: ') && f.endsWith("< 3:1 (a marked line's bar on the block's fill)")), failures.join('\n'));
  // Inline code's text on its own fill.
  failures = repoint('inline-code.label.color', 'outline');
  assert.ok(failures.some((f) => f.startsWith('[light] comp.inline-code.label.color on comp.inline-code.container.color: ') && f.endsWith('< 4.5:1 (inline code on its fill)')), failures.join('\n'));
});

// The syntax roles are an axis, and the check reads its colors from the model — a role a layer adds is
// held like the core nine. The default system's hues are tones of six palettes that are not roles.
test('the syntax colors are read from the axis, and the default system tones seven of them from its six syntax palettes', () => {
  const id = (name) => `tanrei.comp.code-block.${name}`;
  const ROLES = ['comment', 'keyword', 'string', 'constant', 'function', 'type', 'tag', 'property', 'punctuation'];
  const inScheme = (scheme, token) => JSON.stringify(model.componentColors[scheme][token].value);
  assert.deepEqual(Object.keys(model.tokens).filter((t) => t.startsWith(id('syntax.color.'))).map((t) => t.split('.').at(-1)).sort(), [...ROLES].sort());
  assert.deepEqual(Object.keys(model.tokens).filter((t) => t.startsWith(id('syntax.emphasis.'))).map((t) => t.split('.').at(-1)).sort(), [...ROLES].sort());
  // What the component's own file says is a system whose code has no hue: the floor a layer starts from.
  assert.equal(model.tokens[id('code.color')].alias, 'tanrei.sys.color.on-surface');
  // (In the default system the two syntax roles that keep a role's color are the quiet ones; a property is toned.)
  for (const role of ['comment', 'punctuation']) assert.equal(model.tokens[id(`syntax.color.${role}`)].alias, 'tanrei.sys.color.on-surface-variant', role);
  // The seven chromatic roles: a tone of a syntax palette per scheme, never a status color, the link or the focus ring.
  // The default system's colors are valued by the root layer it extends.
  const system = JSON.parse(fs.readFileSync(path.join(TOKENS_DIR, 'systems/core.system.json'), 'utf8'));
  const PALETTE = { keyword: 'syntax-keyword', constant: 'syntax-constant', tag: 'syntax-tag', string: 'syntax-string', function: 'syntax-function', property: 'syntax-function', type: 'syntax-type' };
  for (const [role, palette] of Object.entries(PALETTE)) {
    const rule = system.tokens[id(`syntax.color.${role}`)];
    assert.deepEqual([rule.derive.fn, rule.derive.palette], ['tone', palette], role);
    assert.ok(system.palettes[palette] && !('roles' in system.palettes[palette]), `${palette} is declared without roles`);
    const values = new Set(model.schemes.map((scheme) => inScheme(scheme, id(`syntax.color.${role}`))));
    assert.equal(values.size, model.schemes.length, `${role} has a value of its own in each scheme`);
    for (const scheme of model.schemes) {
      for (const other of ['error', 'success', 'warning', 'info', 'link', 'focus-ring', 'on-surface']) assert.notEqual(inScheme(scheme, id(`syntax.color.${role}`)), JSON.stringify(model.colors[scheme][other].value), `${scheme} ${role} is not ${other}`);
    }
  }
  // The value held is the tone in force in that scheme, not the alias the component's file authors: a string as pale
  // as the hairline fails on the fill, on the three bands (a highlighted, an added and a removed line) and on the eight surfaces, in the one scheme where it is.
  const pale = breakable(model);
  pale.componentColors.light[id('syntax.color.string')].value = model.colors.light['outline-variant'].value;
  const paleFailures = checkInvariants(pale).filter((f) => CODE_FAILURE.test(f));
  assert.equal(paleFailures.length, 12, paleFailures.join('\n'));
  assert.ok(paleFailures.every((f) => f.startsWith('[light] comp.code-block.syntax.color.string on ')), paleFailures.join('\n'));
  // A role a layer adds to the axis is held without a line of code naming it: an `operator` in the hairline's color fails.
  const extended = breakable(model);
  extended.tokens[id('syntax.color.operator')] = { ...structuredClone(model.tokens[id('syntax.color.comment')]), alias: 'tanrei.sys.color.outline-variant' };
  delete extended.tokens[id('syntax.color.operator')].aliasFinal;
  const failures = checkInvariants(extended).filter((f) => CODE_FAILURE.test(f));
  assert.ok(failures.some((f) => f.startsWith('[light] comp.code-block.syntax.color.operator on comp.code-block.filled.container.color: ')), failures.join('\n'));
  assert.ok(failures.some((f) => f.startsWith('[light] comp.code-block.syntax.color.operator on sys.color.surface: ')), failures.join('\n'));
  assert.ok(failures.every((f) => f.includes('syntax.color.operator')), failures.join('\n'));
});

test('invariants reject literal values in component tokens', () => {
  const broken = breakable(model);
  delete broken.tokens['tanrei.comp.button.filled.container.color'].alias;
  assert.ok(checkInvariants(broken).some((f) => f.includes('a literal needs a rule')));
  // …while a derived literal (a layer scaled an aliased padding) is legitimate.
  const scaled = breakable(model);
  const padding = scaled.tokens['tanrei.comp.button.container.padding-inline-start.medium'];
  delete padding.alias;
  padding.derive = { fn: 'mul', of: '{tanrei.sys.space.space175}', by: 2 };
  assert.deepEqual(checkInvariants(scaled), []);
});

test('high contrast is strictly stronger than standard for body text', () => {
  for (const mode of ['light', 'dark']) {
    const at = (s) => contrast(model.colors[s]['on-surface-variant'].value, model.colors[s].surface.value);
    assert.ok(at(`${mode}-high`) > at(`${mode}-medium`) && at(`${mode}-medium`) > at(mode), mode);
  }
});

test('the exported thresholds are the ones the checks hold, scheme by scheme (the docs state them from there)', () => {
  // Each pair is drawn in its ground's own color, so it fails in every scheme, and its message names what it was held to.
  const broken = breakable(model);
  for (const scheme of model.schemes) {
    const roles = broken.colors[scheme];
    for (const [fg, bg] of [['on-surface', 'surface'], ['outline', 'surface'], ['focus-ring', 'surface'], ['outline-variant', 'surface']]) {
      roles[fg] = { ...roles[fg], value: roles[bg].value };
    }
  }
  const failures = checkInvariants(broken);
  const heldTo = (scheme, pair, why) => {
    const found = failures.find((f) => f.startsWith(`[${scheme}] ${pair}: `) && f.endsWith(`(${why})`));
    assert.ok(found, `${scheme} ${pair}\n${failures.join('\n')}`);
    return Number(found.match(/< ([\d.]+):1/)[1]);
  };
  const { text, highContrastText, nonText, hairline } = CONTRAST_THRESHOLDS;
  assert.ok(highContrastText > text && text > nonText);
  for (const scheme of model.schemes) {
    const level = scheme.endsWith('-high') ? 'high' : scheme.endsWith('-medium') ? 'medium' : 'standard';
    assert.equal(heldTo(scheme, 'on-surface on surface', 'body text'), level === 'high' ? highContrastText : text, scheme);
    assert.equal(heldTo(scheme, 'outline on surface', 'functional boundary (WCAG 1.4.11)'), nonText, scheme);
    assert.equal(heldTo(scheme, 'focus-ring on surface', 'focus indicator (WCAG 2.4.13)'), nonText, scheme);
    const edge = failures.find((f) => f.startsWith(`[${scheme}] outline-variant on surface: `));
    if (level === 'standard') assert.equal(edge, undefined, scheme);
    else assert.equal(heldTo(scheme, 'outline-variant on surface', 'the hairline in a raised-contrast scheme'), hairline[level], scheme);
  }
  assert.throws(() => { CONTRAST_THRESHOLDS.text = 3; }, TypeError);
});

test('CSS keeps the alias chain and switches schemes with light-dark()', () => {
  const css = emitCss(model);
  // comp → primary (no intermediate emphasis role).
  assert.match(css, /--tanrei-comp-button-filled-container-color: var\(--tanrei-sys-color-primary\);/);
  assert.match(css, /--tanrei-sys-color-primary: light-dark\(var\(--tanrei-ref-palette-neutral-\d+\), var\(--tanrei-ref-palette-neutral-\d+\)\);/);
  assert.match(css, /@media \(prefers-contrast: more\)/);
  assert.ok(!/undefined|NaN|\[object/.test(css));
});

test('every emitter is deterministic and free of unresolved values', () => {
  // An emitter returns one file's text, or a map of paths → text when a platform splits its output.
  const text = (output) => (typeof output === 'string' ? output : Object.entries(output).sort(([a], [b]) => a.localeCompare(b)).map(([name, body]) => `// ${name}\n${body}`).join('\n'));
  for (const [name, emit] of Object.entries({ ts: emitTs, swift: emitSwift, kotlin: emitKotlin, dart: emitDart })) {
    const out = text(emit(ir));
    assert.equal(out, text(emit(buildIR(model))), `${name} is not deterministic`);
    assert.ok(!/undefined|NaN|\[object/.test(out), `${name} contains an unresolved value`);
    // Core roles are named constants (camelCase); a role declared by a palette is an open key, written as is.
    for (const role of ir.coreRoles) assert.ok(out.toLowerCase().includes(role.replaceAll('-', '').toLowerCase()), `${name} is missing core role ${role}`);
    for (const role of ir.declaredRoles) assert.ok(out.includes(`"${role}"`) || out.includes(`'${role}'`) || out.toLowerCase().includes(role.replaceAll('-', '').toLowerCase()), `${name} is missing declared role ${role}`);
    assert.deepEqual(ir.declaredRoles, ['accent', 'accent-container', 'on-accent', 'on-accent-container'].sort((x, y) => ir.roles.indexOf(x) - ir.roles.indexOf(y)), 'the default system declares exactly the accent palette');
  }
});

test('React Native: the type scale is by level with emphasis as four weight steps, and corner smoothing is an amount', () => {
  const files = emitTs(ir);
  const vocabulary = files['packages/react-native/src/generated/vocabulary.ts'];
  const system = files['packages/react-native/src/generated/systems/tanrei.ts'];
  // Sixteen roles + `emphasis`, and the role type excludes `emphasis`.
  const roles = ['display', 'heading1', 'heading2', 'heading3', 'heading4', 'heading5', 'heading6', 'bodyLarge', 'body', 'bodySmall', 'label', 'labelSmall', 'caption', 'code', 'codeSmall', 'eyebrow'];
  const typescale = /export interface TanreiTypescale \{([\s\S]*?)\n\}/.exec(vocabulary)[1];
  assert.deepEqual([...typescale.matchAll(/readonly (\w+): TanreiTypography;/g)].map((m) => m[1]).sort(), [...roles].sort());
  assert.match(typescale, /readonly emphasis: TanreiTypeEmphasis;/);
  assert.match(vocabulary, /export interface TanreiTypeEmphasis \{\s+readonly display: number;\s+readonly heading: number;\s+readonly body: number;\s+readonly label: number;\s+\}/);
  assert.match(vocabulary, /export type TanreiTypescaleRole = Exclude<keyof TanreiTypescale, "emphasis">;/);
  assert.match(vocabulary, /export interface TanreiShape \{[\s\S]*?readonly cornerSmoothing: number;/);
  // (`emphasized` the modifier stays — it is the API — and so do the `emphasizedAccelerate` / `emphasizedDecelerate` easings; the
  // `emphasized<Role>` twins, `cornerStyle` and the emphasis color roles are gone.)
  assert.ok(!/cornerStyle|TanreiCornerStyle|emphasized(?!Accelerate|Decelerate)[A-Z]|onEmphasis|emphasisContainer|role: "emphasis"/.test(vocabulary + system), 'no retired name survives in the generated TypeScript');
  // Values: the default system's steps and amount, as the IR has them.
  assert.match(system, new RegExp(`emphasis: \\{ display: ${ir.typeEmphasis.display}, heading: ${ir.typeEmphasis.heading}, body: ${ir.typeEmphasis.body}, label: ${ir.typeEmphasis.label} \\}`));
  assert.match(system, new RegExp(`shape: \\{ cornerSmoothing: ${ir.cornerSmoothing}, `));
  // A system that lacks a step or an amount does not emit.
  assert.throws(() => emitTs({ ...ir, typeEmphasis: { display: 100, heading: 100, body: 100 } }), /lacks the emphasis step of label/);
  assert.throws(() => emitTs({ ...ir, cornerSmoothing: 1.5 }), /corner-smoothing in \[0, 1\]/);
  assert.throws(() => emitTs({ ...ir, extensions: { ...ir.extensions, series: { typescale: [{ key: 'emphasis', id: 'x', value: ir.typescale.body }] } } }), /a member that is not a step/);
});

test('a control height that cannot hold its padding and one label line is reported', () => {
  const id = 'tanrei.comp.button.container.height.small';
  const squeezed = { ...model, tokens: { ...model.tokens, [id]: { ...model.tokens[id], value: { value: 20, unit: 'px' } } } };
  assert.deepEqual(checkInvariants(model).filter((f) => f.includes('cannot hold')), []);
  assert.match(checkInvariants(squeezed).join('\n'), /height\.small: 20px cannot hold its content/);
});

test('the Figma sync plan covers the vocabulary and only aliases what it contains', async () => {
  const { emitFigmaPlan, FIGMA_MODES } = await import('../src/emit/figma.js');
  const plan = emitFigmaPlan(model);
  const names = new Set(plan.collections.flatMap((c) => c.variables.map((v) => `${c.name}::${v.name}`)));
  for (const collection of plan.collections) {
    for (const variable of collection.variables) {
      assert.deepEqual(Object.keys(variable.values), collection.modes, `${variable.name}: one value per mode`);
      assert.match(variable.web, /^var\(--tanrei-/);
      assert.ok(!variable.scopes.includes('ALL_SCOPES'));
      for (const value of Object.values(variable.values)) if (value?.alias) assert.ok(names.has(`${value.alias.collection}::${value.alias.name}`), `${variable.name} aliases ${value.alias.name}, which is not in the plan`);
    }
  }
  const roles = plan.collections.find((c) => c.name === 'tanrei/sys.color');
  assert.deepEqual(roles.modes, FIGMA_MODES);
  assert.deepEqual(roles.variables.map((v) => v.name).sort(), Object.keys(model.colors.light).sort());
  const hovered = plan.collections.find((c) => c.name === 'tanrei/comp.color').variables.find((v) => v.name === 'button/filled/hovered/container/color');
  assert.notDeepEqual(hovered.values.light, hovered.values.dark, 'a state color is computed per scheme');
  assert.equal(plan.collections.find((c) => c.name === 'tanrei/sys').variables.find((v) => v.name === 'state/hover-state-layer-opacity').values.value, 8, 'Figma stores opacity as 0–100');
});

test('every authored group carries usage guidance for agents, and it reaches the generated roles', async () => {
  const { checkGuidance, LLM } = await import('@tanrei/token-engine');
  const bare = { tanrei: { sys: { widgets: { $type: 'number', knob: { $value: 1, $extensions: { 'dev.tanrei.vocabulary': { rationale: 'x' }, 'dev.tanrei.derive': { fixed: 'A test value.' } } } } } } };
  assert.match(checkGuidance([bare]).join('\n'), /tanrei\.sys\.widgets: no usage guidance/);
  bare.tanrei.sys.widgets.$extensions = { [LLM]: { usage: 'Knobs for the test widget: bind one per widget, never a literal.' } };
  assert.deepEqual(checkGuidance([bare]), []);
  const roles = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'tokens/generated/sys.color.light.tokens.json'), 'utf8')).tanrei.sys.color;
  assert.match(roles.$extensions[LLM].usage, /bind to a role/);
});

test('the design-tool exports give each scheme its own component colors', () => {
  const read = (scheme) => JSON.parse(fs.readFileSync(path.join(REPO_ROOT, `design/tokens/tanrei.${scheme}.tokens.json`), 'utf8'));
  const [light, dark] = [read('light'), read('dark')];
  const at = (doc) => doc.tanrei.comp.button.filled.container.color.$value;
  assert.notDeepEqual(at(light), at(dark), 'comp.button.filled.container.color is the same in light and dark');
  const engine = model.componentColors.dark['tanrei.comp.button.filled.container.color'].value;
  assert.deepEqual(at(dark), engine, 'the dark export is what the engine resolves for dark');
});
