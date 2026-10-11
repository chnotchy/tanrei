// A design system that EXTENDS the vocabulary, end to end: the fixture layer
// packages/tokens-build/test/fixtures/acme.system.json adds a space step, a color role, a Button size (`3x`), a
// Button variant (`danger`) and tokens of its own namespace. `__fixtures__/acme.ts` is what `tanrei build` writes
// for a product (it imports and augments '@tanrei/react-native' by name); regenerate it with
// `pnpm --filter @tanrei/react-native generate:fixtures`.
import fs from 'node:fs';
import path from 'node:path';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { tanrei } from '../../generated/systems/tanrei';
import type { TanreiColorRole, TanreiPaint, TanreiScheme, TanreiSpace, TanreiSystem } from '../../generated/vocabulary';
import { lookupValue } from '../../theme/lookup';
import { evaluatePaint, formatColor, roleColor } from '../../theme/paint';
import { TanreiProvider, useTanrei } from '../../theme/TanreiProvider';
import { byTestID, describeAxisExtensions, expectFixtureSystemsFresh, settleMotion, textStyle, viewStyle } from '../../testing/harness';
import { schemesOf, unknownRoles } from '../../testing/systemRoles';
import { Button, type ButtonProps, type ButtonSize, type ButtonVariant } from '../Button';
import { acme, acmeTokens, type AcmeTokens } from './__fixtures__/acme';
import { buttonSubject } from './Button.subject';

const PACKAGE = path.resolve(__dirname, '../../..');
const ID = 'button';
const SCHEMES = schemesOf(acme);

const { host } = byTestID(ID);
const label = () => screen.getByTestId(`${ID}.label`);
const painted = (paint: TanreiPaint, scheme: TanreiScheme = 'light', system: TanreiSystem = acme) => formatColor(evaluatePaint(paint, system.colors[scheme]));
const role = (name: TanreiColorRole, scheme: TanreiScheme = 'light') => formatColor(roleColor(acme.colors[scheme], name));

const mount = (system: TanreiSystem, props: Partial<ButtonProps> = {}, theme: 'light' | 'dark' = 'light') =>
  render(
    <TanreiProvider theme={theme} system={system}>
      <Button testID={ID} {...props}>
        Delete
      </Button>
    </TanreiProvider>,
  );

settleMotion();

describe('the generated files', () => {
  test('the acme fixture is what the emitter produces today', () => {
    // Throws when __fixtures__/acme.ts is stale.
    expectFixtureSystemsFresh();
  });

  // Every shipped preset extends the type scale with the roles its source has and the core lacks; m3-like
  // also adds the roles its reference publishes (`primaryFixed` …), and m3-expressive-like (which extends m3-like) two
  // Button sizes on top. They pay; the default system does not.
  test('the default system extends nothing, so its values file carries no trace of extensions', () => {
    const source = fs.readFileSync(path.join(PACKAGE, 'src/generated/systems/tanrei.ts'), 'utf8');
    // (`extraLarge`, `extraLong1`… are core step NAMES, and `extendedFab` a component's: the guard is about the word.)
    expect(source).not.toMatch(/\bextra\b/i);
    expect(source).not.toMatch(/extension|\bextends?\b|\bextended\b|acme|added|ButtonSizeRegistry|ButtonVariantRegistry/i);
    // The only augmentation is the pre-existing one for the roles of the system's own palettes.
    expect(source.match(/declare module/g)?.length ?? 0).toBeLessThanOrEqual(1);
    expect(source.match(/^export /gm)).toHaveLength(1);
  });

  test.each([
    ['m3-like', ['displayLarge', 'displaySmall'], false],
    ['m3-expressive-like', ['displayLarge', 'displaySmall'], true],
    ['cupertino', ['bodyCallout', 'bodySubhead', 'captionSmall'], false],
  ] as const)('%s extends the vocabulary: ONE marked section in its values file (type roles %s; Button sizes: %s)', (id, roles, addsSizes) => {
    const source = fs.readFileSync(path.join(PACKAGE, 'src/generated/systems', `${id}.ts`), 'utf8');
    expect(source.match(/Vocabulary "[^"]+" ADDS to the core/g)).toHaveLength(1);
    expect(source).toMatch(new RegExp(`interface TanreiTypescale \\{\\s+${roles.map((role) => `readonly ${role}\\?: TanreiTypography;`).join('\\s+')}\\s+\\}`));
    expect(/interface TanreiButtonSizeRegistry \{\s+xsmall: true;\s+xlarge: true;\s+\}/.test(source)).toBe(addsSizes);
    expect(source).not.toMatch(/ButtonVariantRegistry/);
  });

  test('a system with extensions gains ONE marked section of typed keys, and its own tokens as a separate object', () => {
    const source = fs.readFileSync(path.join(__dirname, '__fixtures__/acme.ts'), 'utf8');
    expect(source.match(/Vocabulary "[^"]+" ADDS to the core/g)).toHaveLength(1);
    // Augmentation targets the package by name — what a product can resolve.
    expect(source.match(/declare module '@tanrei\/react-native'/g)).toHaveLength(2);
    expect(source).not.toContain('../vocabulary');
    expect(source.match(/^export (const|interface) \w+/gm)).toEqual(['export const acme', 'export const acmeSteps', 'export interface AcmeTokens', 'export const acmeTokens']);
  });

  test('series steps a system added come with total accessors, and only such a system imports any runtime', () => {
    const source = fs.readFileSync(path.join(PACKAGE, 'src/components/__tests__/__fixtures__/acme.ts'), 'utf8');
    expect(source).toContain("import { seriesStep } from '@tanrei/react-native';");
    expect(source).toMatch(/space1200: \(system: TanreiSystem\): number => seriesStep<number>\(system\.space, "space1200", 96, "space"\)/);
    // A spring a layer added is an optional key of the (open) spring set, declared once although two schemes have it.
    expect(source.match(/readonly bouncy\?: TanreiSpring;/g)).toHaveLength(1);
    expect(source).toMatch(/interface TanreiSpringSet \{/);
    // The default system added no step: no accessor, no runtime import. The presets added type roles: each exports
    // `<id>Steps.typescale.<role>` and imports `seriesStep` — nothing else.
    const plain = fs.readFileSync(path.join(PACKAGE, 'src/generated/systems/tanrei.ts'), 'utf8');
    expect(plain).not.toMatch(/seriesStep|Steps = /);
    expect(plain.match(/^import .*$/gm)).toEqual([expect.stringMatching(/^import type /)]);
    for (const [id, name] of [['cupertino', 'cupertinoSteps'], ['m3-like', 'm3LikeSteps'], ['m3-expressive-like', 'm3ExpressiveLikeSteps']]) {
      const system = fs.readFileSync(path.join(PACKAGE, 'src/generated/systems', `${id}.ts`), 'utf8');
      expect(system).toContain("import { seriesStep } from '../../theme/lookup';");
      expect(system.match(/^import .*$/gm)).toHaveLength(2);
      expect(system.match(/^export const \w+/gm)).toEqual([`export const ${id === 'm3-like' ? 'm3Like' : id === 'm3-expressive-like' ? 'm3ExpressiveLike' : id}`, `export const ${name}`]);
      expect(system).toMatch(/Steps = \{\s+typescale: \{/);
    }
    // The merge anchor names every open interface, the spring set included (augmentation must not depend on file order).
    const vocabulary = fs.readFileSync(path.join(PACKAGE, 'src/generated/vocabulary.ts'), 'utf8');
    expect(vocabulary.slice(vocabulary.indexOf("declare module './vocabulary'"))).toContain('interface TanreiSpringSet {}');
  });

  test('the default system has none of the added values', () => {
    expect(Object.keys(tanrei.components.button.sizes)).toEqual(['small', 'medium', 'large']);
    expect(Object.keys(tanrei.components.button.variants)).toEqual(['filled', 'tonal', 'elevated', 'outlined', 'text']);
    expect(Object.keys(tanrei.space)).not.toContain('space1200');
    expect(Object.keys(tanrei.colors.light)).not.toContain('brandGlow');
  });
});

describe('a value added to a component axis', () => {
  const button = acme.components.button;

  test('size 3x: cloned from large and scaled ×1.5 — height 60, inline padding 24 — with the overridden block padding 16', () => {
    const size = button.sizes['3x'];
    expect(size.containerHeight).toBe(60);
    expect(size.containerPaddingInlineStart).toBe(24);
    expect(size.containerPaddingInlineEnd).toBe(24);
    expect(size.containerPaddingInlineStartWithIcon).toBe(24);
    expect(size.containerPaddingBlock).toBe(16);
    expect(size.containerPaddingBlock).toBe(acme.space.space200);
    expect(size.labelTypescale).toBe(button.sizes.large.labelTypescale);
    // The core sizes are untouched.
    expect(button.sizes.large).toEqual(tanrei.components.button.sizes.large);
  });

  test('variant danger: the container is the system error role, and the pattern rules valued every state', () => {
    const danger = button.variants.danger;
    expect(danger.enabled.containerColor).toEqual({ kind: 'role', role: 'error' });
    expect(danger.enabled.labelColor).toEqual({ kind: 'role', role: 'onError' });
    expect(Object.keys(danger)).toEqual(Object.keys(button.variants.filled));
    for (const scheme of SCHEMES) {
      expect(painted(danger.enabled.containerColor, scheme)).toBe(role('error', scheme));
      const rest = painted(danger.enabled.containerColor, scheme);
      for (const state of ['hovered', 'pressed', 'disabled'] as const) {
        expect(painted(danger[state].containerColor, scheme)).toMatch(/^rgba?\(/);
        expect(painted(danger[state].containerColor, scheme)).not.toBe(rest);
      }
    }
    // Same rules as the variant it was cloned from: a state is the container mixed with the label.
    expect(danger.hovered.containerColor).toEqual({ kind: 'mix', base: danger.enabled.containerColor, with: danger.enabled.labelColor, amount: acme.state.hoverStateLayerOpacity });
  });

  test('the added keys are typed: they are legal prop values once the system file is part of the program', () => {
    const size: ButtonSize = '3x';
    const variant: ButtonVariant = 'danger';
    expect(lookupValue(button.sizes, size, 'medium', 'Button size')).toBe(button.sizes['3x']);
    expect(lookupValue(button.variants, variant, 'filled', 'Button variant')).toBe(button.variants.danger);
  });

  test('a Button with size 3x and variant danger renders with those values, without a fallback report', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await mount(acme, { size: '3x', variant: 'danger' });
    expect(viewStyle(host())).toMatchObject({ minHeight: 60, paddingStart: 24, paddingEnd: 24, paddingVertical: 16, backgroundColor: role('error') });
    expect(textStyle(label()).color).toBe(role('onError'));
    expect(textStyle(label())).toMatchObject({ fontSize: acme.typescale[button.sizes['3x'].labelTypescale].size });

    await fireEvent(host(), 'hoverIn');
    expect(viewStyle(host()).backgroundColor).toBe(painted(button.variants.danger.hovered.containerColor));
    expect(viewStyle(host()).backgroundColor).not.toBe(role('error'));
    await fireEvent(host(), 'pressIn');
    expect(viewStyle(host()).backgroundColor).toBe(painted(button.variants.danger.pressed.containerColor));
    expect(warn).not.toHaveBeenCalled();
  });

  test('…with an icon: the 3x icon size and with-icon padding; disabled and dark come from the danger tokens too', async () => {
    const icon = jest.fn(() => null);
    await mount(acme, { size: '3x', variant: 'danger', disabled: true, icon }, 'dark');
    expect(icon).toHaveBeenCalledWith({ color: painted(button.variants.danger.disabled.labelColor, 'dark'), size: button.sizes['3x'].iconSize });
    expect(viewStyle(host()).backgroundColor).toBe(painted(button.variants.danger.disabled.containerColor, 'dark'));
    expect(viewStyle(host()).paddingStart).toBe(button.sizes['3x'].containerPaddingInlineStartWithIcon);
  });

  test('BTN-7: the same props under a system that does not have the values render as the default, and say so in development', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const reference = await mount(tanrei);
    const expected = JSON.stringify(reference.toJSON());
    await reference.unmount();
    const view = await mount(tanrei, { size: '3x', variant: 'danger' });
    expect(JSON.stringify(view.toJSON())).toBe(expected);
    expect(warn.mock.calls.map(([message]) => String(message))).toEqual([
      'Tanrei: the active system has no Button size "3x"; using "medium".',
      'Tanrei: the active system has no Button variant "danger"; using "filled".',
    ]);
  });
});

describe('every value acme adds to a Button axis, through the harness (the checks every component gets)', () => {
  describeAxisExtensions(buttonSubject, acme);
});

describe('a step added to a series', () => {
  test('space1200 is 96 through the typed member and through a keyed lookup', () => {
    expect(acme.space.space1200).toBe(96);
    expect(acme.space.space1200).toBe(acme.dials.spaceUnit * 12);
    const step: keyof TanreiSpace = 'space1200';
    const space: TanreiSpace = acme.space;
    expect(space[step]).toBe(96);
    expect(lookupValue(space, 'space1200', 'space0', 'space step')).toBe(96);
  });

  test('on TanreiSystem the step is optional — only acme is known to have it — and the keyed lookup is total', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    function Probe() {
      const { system } = useTanrei();
      return <Text testID="probe">{`${system.space.space1200 ?? 'none'}|${lookupValue(system.space, 'space1200', 'space900', 'space step')}`}</Text>;
    }
    const probe = () => screen.getByTestId('probe').children.join('');
    const withAcme = await render(<TanreiProvider system={acme}><Probe /></TanreiProvider>);
    expect(probe()).toBe('96|96');
    expect(warn).not.toHaveBeenCalled();
    await withAcme.unmount();
    await render(<TanreiProvider system={tanrei}><Probe /></TanreiProvider>);
    expect(probe()).toBe(`none|${tanrei.space.space900}`);
    expect(warn).toHaveBeenCalledWith('Tanrei: the active system has no space step "space1200"; using "space900".');
  });
});

describe('an added color role', () => {
  test('brandGlow resolves in all six schemes, without a fallback', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(SCHEMES).toHaveLength(6);
    for (const scheme of SCHEMES) {
      const color = acme.colors[scheme].brandGlow;
      expect(color.a).toBe(1);
      expect(roleColor(acme.colors[scheme], 'brandGlow')).toBe(color);
      expect(painted({ kind: 'role', role: 'brandGlow' }, scheme)).toBe(formatColor(color));
    }
    expect(acme.colors.light.brandGlow).not.toEqual(acme.colors.dark.brandGlow);
    expect(unknownRoles(acme, ['brandGlow'])).toEqual([]);
    expect(unknownRoles(acme)).toEqual([]);
    expect(warn).not.toHaveBeenCalled();
  });
});

describe("the layer's own tokens", () => {
  test('are a typed object of their own, not part of the system', () => {
    const own: AcmeTokens = acmeTokens;
    expect(own.comp.rating.star.size).toBe(20);
    expect(own.comp.rating.star.size).toBe(acme.dials.sizeUnit * 5);
    expect(own.comp.rating.gap).toBe(acme.space.space50);
    expect(JSON.stringify(acme)).not.toContain('rating');
  });

  test('a color of theirs is a paint: it follows the scheme', async () => {
    const star = acmeTokens.comp.rating.star.color;
    expect(star).toEqual({ kind: 'role', role: 'warning' });
    for (const scheme of SCHEMES) expect(painted(star, scheme)).toBe(role('warning', scheme));
    expect(painted(star, 'light')).not.toBe(painted(star, 'dark'));

    function Star() {
      const theme = useTanrei();
      return <Text testID="star">{theme.paint(acmeTokens.comp.rating.star.color)}</Text>;
    }
    const view = await render(<TanreiProvider theme="dark" system={acme}><Star /></TanreiProvider>);
    expect(screen.getByTestId('star').children.join('')).toBe(role('warning', 'dark'));
    await view.rerender(<TanreiProvider theme="light" contrast="high" system={acme}><Star /></TanreiProvider>);
    expect(screen.getByTestId('star').children.join('')).toBe(role('warning', 'lightHigh'));
  });
});
