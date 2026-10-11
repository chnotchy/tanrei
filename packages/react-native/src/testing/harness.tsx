// The component-independent half of a component's preset, extension and per-scheme tests. A component describes
// itself once (`defineSubject`: its name, its spec, how props become an element, which props select a token axis);
// the harness turns the spec's fixtures into elements and registers the tests every component owes:
//
//   describeFixtureBaselines(subject)                          one baseline per spec fixture (default system, light)
//   describeFixtureBaselines(subject, { systems, fixtures })   …under shipped presets: __snapshots__/<C>/<system id>/<id>.json
//   describeSharedVocabulary(subject)                          every shipped system values the same token names
//   describeAxisExtensions(subject, system)                    values a system ADDS to an axis render; elsewhere they fall back
//
// plus the helpers the component-specific cases use (style readers, `withComponent`, scheme settings, per-scheme paints).
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { Fragment, type ReactElement, type ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, StyleSheet, type TextStyle, type ViewStyle } from 'react-native';
import { cupertino } from '../generated/systems/cupertino';
import { m3ExpressiveLike } from '../generated/systems/m3-expressive-like';
import { m3Like } from '../generated/systems/m3-like';
import { tanrei } from '../generated/systems/tanrei';
import type { TanreiComponents, TanreiPaint, TanreiScheme, TanreiSystem } from '../generated/vocabulary';
import type { InteractionState } from '../primitives/interaction';
import { resetLookupReports } from '../theme/lookup';
import { evaluatePaint, formatColor } from '../theme/paint';
import type { TanreiContrast } from '../theme/scheme';
import { TanreiProvider, type TanreiProviderProps } from '../theme/TanreiProvider';
import { Button } from '../components/Button';
import { IconButton } from '../components/IconButton';
import { loadSpec, type Fixture, type FixtureItem, type SlotFixtureKind, type Spec } from './spec';

const PACKAGE = path.resolve(__dirname, '../..');

/** Every system the package ships, the default first. */
export const SHIPPED_SYSTEMS: readonly TanreiSystem[] = [tanrei, m3Like, m3ExpressiveLike, cupertino];

/** The six schemes, and the provider settings that select each. */
export const SCHEME_SETTINGS: readonly { scheme: TanreiScheme; theme: 'light' | 'dark'; contrast: TanreiContrast }[] = [
  { scheme: 'light', theme: 'light', contrast: 'standard' },
  { scheme: 'lightMedium', theme: 'light', contrast: 'medium' },
  { scheme: 'lightHigh', theme: 'light', contrast: 'high' },
  { scheme: 'dark', theme: 'dark', contrast: 'standard' },
  { scheme: 'darkMedium', theme: 'dark', contrast: 'medium' },
  { scheme: 'darkHigh', theme: 'dark', contrast: 'high' },
];

export type Instance = ReturnType<typeof screen.getByTestId>;
export const viewStyle = (instance: Instance): ViewStyle => StyleSheet.flatten(instance.props.style) ?? {};
export const textStyle = (instance: Instance): TextStyle => StyleSheet.flatten(instance.props.style) ?? {};

/**
 * The host with `testID` and its parts (`<testID>.<name>`, null when absent). Parts are found even when they are hidden
 * from assistive technology — most are decorative by design (rings, a ripple, an icon that the host's label names).
 */
export const byTestID = (testID: string) => ({
  host: () => screen.getByTestId(testID),
  part: (name: string) => screen.queryByTestId(`${testID}.${name}`, { includeHiddenElements: true }),
});

/** What a paint must look like in a scheme of `system`. */
export const painted = (paint: TanreiPaint, scheme: TanreiScheme = 'light', system: TanreiSystem = tanrei) => formatColor(evaluatePaint(paint, system.colors[scheme]));

/**
 * Settled values: reduce-motion is mocked ON before each test (styles are plain values, not interpolations), and every
 * mock is restored after it. Call once at the top level of a test file.
 */
export function settleMotion(): void {
  beforeEach(() => {
    jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockImplementation(() => Promise.resolve(true));
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });
}

/** `base` with some tokens of one component changed — what a preset or a product layer does. */
export function withComponent<Name extends keyof TanreiComponents>(base: TanreiSystem, name: Name, overrides: Partial<TanreiComponents[Name]>): TanreiSystem {
  return { ...base, components: { ...base.components, [name]: { ...base.components[name], ...overrides } } };
}

/** Puts a pressable control's host into an interaction state by the events that do it (`enabled`/`disabled`: nothing). */
export async function enterState(host: Instance, state: InteractionState): Promise<void> {
  if (state === 'hovered') await fireEvent(host, 'hoverIn');
  if (state === 'focused') await fireEvent(host, 'focus');
  if (state === 'pressed') await fireEvent(host, 'pressIn');
}

/** Throws when a generated test fixture (`__fixtures__/*.ts`, scripts/acme-fixture.mjs) is not what the pipeline writes today. */
export function expectFixtureSystemsFresh(): void {
  execFileSync(process.execPath, ['scripts/acme-fixture.mjs', '--check'], { cwd: PACKAGE, stdio: 'pipe' });
}

// ---------------------------------------------------------------------------------------------------------------
// Per-scheme paints

/** The paths (`variant.state.member`, …) of every paint of kind `scheme` under a component's tokens. */
export function schemePaintPaths(tokens: object): string[] {
  const out: string[] = [];
  const walk = (value: unknown, at: string[]) => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return;
    if ('kind' in value) {
      if ((value as TanreiPaint).kind === 'scheme') out.push(at.join('.'));
      return;
    }
    for (const [key, inner] of Object.entries(value)) walk(inner, [...at, key]);
  };
  walk(tokens, []);
  return out.sort();
}

/** The color a `scheme` paint of literals must draw in one scheme (throws for anything else: the fixture changed). */
export function decidedColor(paint: TanreiPaint, scheme: TanreiScheme): string {
  if (paint.kind !== 'scheme') throw new Error(`expected a paint of kind "scheme", got "${paint.kind}"`);
  const inner = paint.by[scheme];
  if (inner.kind !== 'literal') throw new Error(`expected a literal for ${scheme}, got "${inner.kind}"`);
  return formatColor(inner);
}

// ---------------------------------------------------------------------------------------------------------------
// The component under test

export interface Subject<Props extends object> {
  /** PascalCase: `src/components/<component>.tsx`, `__snapshots__/<component>/`. */
  component: string;
  /** The spec (`specs/<name>.spec.json`). */
  spec: Spec;
  /** The key of `system.components` that holds its tokens. */
  tokens: keyof TanreiComponents;
  /** Props (platform names, `children` for the content) → the element. */
  render: (props: Props) => ReactElement;
  /**
   * Each spec prop bound to a token axis (`axis` in the spec), by its React Native name → the holder of that axis in
   * the component tokens (`size` → `sizes`). Written down, not derived: the package never parses token names.
   */
  axes: Readonly<Record<string, string>>;
}

export function defineSubject<Props extends object>(subject: Omit<Subject<Props>, 'spec'> & { spec: string }): Subject<Props> {
  return { ...subject, spec: loadSpec(subject.spec) };
}

/**
 * A fixture's items under their React Native names (`platforms.react-native.items.<kind>.props`), in order:
 * each keeps its `kind`, its `content` as `children`, and a group its own `items`. The subject turns them into what the
 * component takes.
 */
export function fixtureItems(spec: Spec, items: readonly FixtureItem[]): Record<string, unknown>[] {
  const mappings = spec.platforms['react-native'].items ?? {};
  return items.map((item) => {
    const names = mappings[item.kind]?.props ?? {};
    const mapped: Record<string, unknown> = { kind: item.kind, ...mapItemProps(item.props, names) };
    if (item.content !== undefined) mapped.children = item.content;
    if (item.items) mapped.items = fixtureItems(spec, item.items);
    return mapped;
  });
}

/**
 * An item's props under their React Native names. Two spec props may map to one name when the platform nests one of
 * them (a destination's `label` and its `badgeLabel`, which is the `label` of its `badge` object): the first keeps the
 * name, a later one keeps its spec name, so that the subject can nest it.
 */
function mapItemProps(props: Readonly<Record<string, unknown>>, names: Readonly<Record<string, string>>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(props)) {
    const mapped = names[name] ?? name;
    out[mapped in out ? name : mapped] = value;
  }
  return out;
}

/** A slot's name as the React Native prop that fills it (`actions` → `actions`, `leading-icon` → `leadingIcon`). */
export const slotProp = (slot: string) => slot.replace(/-([a-z])/g, (_match, letter: string) => letter.toUpperCase());

/**
 * One fixture string in a slot, by the slot's fixture kind: a glyph is the glyph's name (the component's glyph slot draws it with
 * the icon helper), an icon button a standard `IconButton` showing the glyph and named by it, a button a text `Button`
 * with that label, text the string itself.
 */
function slotElement(kind: SlotFixtureKind, value: string, key?: number): ReactNode {
  switch (kind) {
    case 'glyph':
    case 'text':
      return value;
    case 'icon-only-button':
      return (
        <IconButton key={key} accessibilityLabel={value}>
          {value}
        </IconButton>
      );
    case 'button':
      return (
        <Button key={key} variant="text">
          {value}
        </Button>
      );
  }
}

/** A fixture's filled slots as React Native props: one element, or several in order in a fragment. */
export function fixtureSlots(spec: Spec, slots: Readonly<Record<string, string | string[]>>): Record<string, ReactNode> {
  return Object.fromEntries(
    Object.entries(slots).map(([name, value]) => {
      const kind = spec.slots?.find((slot) => slot.name === name)?.fixture;
      if (!kind) throw new Error(`${spec.name}: a fixture fills the slot "${name}", which declares no fixture kind`);
      const node = Array.isArray(value) ? <Fragment>{value.map((each, index) => slotElement(kind, each, index))}</Fragment> : slotElement(kind, value);
      return [slotProp(name), node];
    }),
  );
}

/**
 * A fixture's props under their React Native names (the spec's `platforms.react-native.props`); `content` → `children`;
 * its items, when it has any, → `items` (`fixtureItems`); its filled slots → the slots' props (`fixtureSlots`).
 */
export function fixtureProps<Props extends object>(subject: Subject<Props>, fixture: Fixture): Props {
  const names = subject.spec.platforms['react-native'].props;
  const props: Record<string, unknown> = Object.fromEntries(Object.entries(fixture.props).map(([name, value]) => [names[name] ?? name, value]));
  if (fixture.content !== undefined) props.children = fixture.content;
  if (fixture.items) props.items = fixtureItems(subject.spec, fixture.items);
  if (fixture.slots) Object.assign(props, fixtureSlots(subject.spec, fixture.slots));
  return props as Props;
}

/** The fixture as an element, under a provider. */
export function fixtureElement<Props extends object>(subject: Subject<Props>, fixture: Fixture, provider: Omit<TanreiProviderProps, 'children'> = { theme: 'light' }, extra: Partial<Props> = {}): ReactElement {
  return <TanreiProvider {...provider}>{subject.render({ ...fixtureProps(subject, fixture), ...extra })}</TanreiProvider>;
}

/**
 * One serialized render baseline per fixture, in the light scheme. Without `systems`: under the default provider, at
 * `__snapshots__/<component>/<fixture id>.json` (the path conventions.js fixes). With `systems`: under each, at
 * `__snapshots__/<component>/<system id>/<fixture id>.json`, for the fixtures named in `fixtures` (all by default).
 */
export function describeFixtureBaselines<Props extends object>(subject: Subject<Props>, options: { systems?: readonly TanreiSystem[]; fixtures?: readonly string[] } = {}): void {
  const { fixtures: ids, systems } = options;
  const fixtures = ids ? subject.spec.fixtures.filter((fixture) => ids.includes(fixture.id)) : subject.spec.fixtures;

  test(`the spec has fixtures, their ids are unique${ids ? ', and it has every fixture recorded here' : ''}`, () => {
    expect(subject.spec.fixtures.length).toBeGreaterThan(0);
    expect(new Set(subject.spec.fixtures.map((f) => f.id)).size).toBe(subject.spec.fixtures.length);
    if (ids) expect(fixtures.map((f) => f.id).sort()).toEqual([...ids].sort());
  });

  if (!systems) {
    test.each(fixtures)('$id matches its serialized render baseline', async (fixture) => {
      const view = await render(fixtureElement(subject, fixture));
      expect(view.toJSON()).toMatchFixtureSnapshot(subject.component, fixture.id);
    });
    return;
  }
  describe.each(systems)('$id', (system) => {
    test.each(fixtures)('$id matches its serialized render baseline', async (fixture) => {
      const view = await render(fixtureElement(subject, fixture, { theme: 'light', system }));
      // Baselines of a preset live beside the default ones, never mixed with them.
      expect(view.toJSON()).toMatchFixtureSnapshot(subject.component, `${system.id}/${fixture.id}`);
    });
  });
}

/** Holders (objects that are not paints) keep their structure; every leaf becomes null. */
const skeleton = (value: unknown): unknown =>
  typeof value === 'object' && value !== null && !Array.isArray(value) && !('kind' in value) ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, skeleton(v)])) : null;

/**
 * "Design systems differ in values, never in tokens": every shipped system has the component's token names, every
 * core value of each axis, and every value of an axis has every member (in every state).
 */
export function describeSharedVocabulary<Props extends object>(subject: Subject<Props>): void {
  test('every spec prop bound to a token axis is declared by the subject', () => {
    const bound = subject.spec.props.filter((prop) => prop.axis).map((prop) => subject.spec.platforms['react-native'].props[prop.name] ?? prop.name);
    expect(Object.keys(subject.axes).sort()).toEqual(bound.sort());
  });

  test.each(SHIPPED_SYSTEMS.map((system) => [system.id, system] as const))(`%s speaks the same ${subject.component} vocabulary as the default system: same token names, only values differ`, (_id, system) => {
    const tokens = system.components[subject.tokens] as unknown as Record<string, object>;
    const reference = tanrei.components[subject.tokens] as unknown as Record<string, object>;
    expect(Object.keys(tokens).sort()).toEqual(Object.keys(reference).sort());
    for (const holder of Object.values(subject.axes)) {
      expect(Object.keys(tokens[holder]!)).toEqual(expect.arrayContaining(Object.keys(reference[holder]!)));
      const expected = skeleton(Object.values(reference[holder]!)[0]);
      for (const value of Object.values(tokens[holder]!)) expect(skeleton(value)).toEqual(expected);
    }
  });
}

/**
 * A system that ADDS values to the component's axes, end to end: each added value is a legal prop value
 * that renders from its own tokens without a fallback report; under the default system the same prop renders exactly
 * as the axis's spec default, and development builds report it. Rendered from the first spec fixture.
 */
export function describeAxisExtensions<Props extends object>(subject: Subject<Props>, system: TanreiSystem): void {
  const [base] = subject.spec.fixtures;
  const added = Object.entries(subject.axes).flatMap(([prop, holder]) => {
    const keys = (of: TanreiSystem) => Object.keys((of.components[subject.tokens] as unknown as Record<string, object>)[holder]!);
    const core = keys(tanrei);
    const specProp = subject.spec.props.find((each) => (subject.spec.platforms['react-native'].props[each.name] ?? each.name) === prop);
    return keys(system)
      .filter((key) => !core.includes(key))
      .map((value) => ({ prop, value, fallback: String(specProp?.default) }));
  });
  const mount = (under: TanreiSystem, extra: Record<string, unknown>) => render(fixtureElement(subject, base!, { theme: 'light', system: under }, extra as Partial<Props>));
  const tree = async (under: TanreiSystem, extra: Record<string, unknown>) => {
    const view = await mount(under, extra);
    const json = JSON.stringify(view.toJSON());
    await view.unmount();
    return json;
  };

  test(`${system.id} adds at least one value to an axis of ${subject.component}`, () => {
    expect(added.length).toBeGreaterThan(0);
  });

  test.each(added)(`${system.id}: ${subject.component} $prop "$value" renders from its own tokens, without a fallback report`, async ({ prop, value, fallback }) => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const drawn = await tree(system, { [prop]: value });
    expect(drawn).not.toBe(await tree(system, { [prop]: fallback }));
    expect(warn).not.toHaveBeenCalled();
  });

  test.each(added)(`the default system: ${subject.component} $prop "$value" renders as the spec default "$fallback", and says so in development`, async ({ prop, value, fallback }) => {
    resetLookupReports();
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const expected = await tree(tanrei, { [prop]: fallback });
    expect(warn).not.toHaveBeenCalled();
    expect(await tree(tanrei, { [prop]: value })).toBe(expected);
    expect(warn.mock.calls.map(([message]) => String(message))).toEqual([expect.stringContaining(`"${value}"; using "${fallback}"`)]);
  });
}
