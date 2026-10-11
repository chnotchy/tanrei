// The gallery screen is the app: this test renders it, so the example cannot rot while nobody opens a simulator.
import fs from 'node:fs';
import path from 'node:path';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, StyleSheet } from 'react-native';
import { TanreiProvider, evaluatePaint, formatColor, resolveScheme, type TanreiSystem } from '@tanrei/react-native';
import { CONTRASTS, GalleryScreen, SYSTEMS, THEMES } from '../src/GalleryScreen';
import { COMPONENTS, fixtureTestID, renderFixture } from '../src/registry';

const REPO = path.resolve(__dirname, '../../../..');
const pascal = (name: string) => name.split('-').map((word) => word[0]!.toUpperCase() + word.slice(1)).join('');
const specs = fs
  .readdirSync(path.join(REPO, 'specs'))
  .filter((file) => file.endsWith('.spec.json'))
  .map((file) => JSON.parse(fs.readFileSync(path.join(REPO, 'specs', file), 'utf8')) as { name: string; fixtures: { id: string }[] });
/** Every spec whose React Native implementation exists (the path packages/tools/src/conventions.js fixes). */
const implemented = specs.filter((spec) => fs.existsSync(path.join(REPO, `packages/react-native/src/components/${pascal(spec.name)}.tsx`)));
/** Every fixture of every registered component, as `[component, fixture]`. */
const FIXTURES = Object.entries(COMPONENTS).flatMap(([component, { spec }]) => spec.fixtures.map((fixture) => [component, fixture] as const));

// A fixture may be hidden from assistive technology by design (a decorative divider): find it anyway.
const fixture = (testID: string) => screen.getByTestId(testID, { includeHiddenElements: true });
const style = (testID: string) => StyleSheet.flatten(fixture(testID).props.style) ?? {};
const filledColor = (system: TanreiSystem, brightness: 'light' | 'dark', contrast: (typeof CONTRASTS)[number] = 'standard') =>
  formatColor(evaluatePaint(system.components.button.variants.filled.enabled.containerColor, system.colors[resolveScheme(brightness, contrast)], resolveScheme(brightness, contrast)));
const FILLED = fixtureTestID('button', 'filled-medium');

// The first render of the whole gallery (every fixture × the first system) transforms and mounts cold; when every
// package's suite runs at once (`pnpm check`) that alone has taken longer than Jest's 5 s default.
jest.setTimeout(60_000);

beforeEach(() => {
  jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockImplementation(() => Promise.resolve(true));
});
afterEach(() => {
  jest.restoreAllMocks();
});

test('the gallery knows every shipped system', () => {
  const shipped = fs.readdirSync(path.join(REPO, 'packages/react-native/src/generated/systems')).map((file) => file.replace(/\.ts$/, '')).sort();
  expect(SYSTEMS.map((system) => system.id).sort()).toEqual(shipped);
});

test('the registration table has one entry per implemented component, and each entry is that component\'s spec', () => {
  expect(implemented.length).toBeGreaterThan(0);
  expect(Object.keys(COMPONENTS).sort()).toEqual(implemented.map((spec) => spec.name).sort());
  for (const spec of implemented) {
    const registered = COMPONENTS[spec.name]!.spec;
    expect(registered.name).toBe(spec.name);
    expect(registered.fixtures.map((fixture) => fixture.id)).toEqual(spec.fixtures.map((fixture) => fixture.id));
    expect(registered.fixtures.length).toBeGreaterThan(0);
  }
});

test('fixture testIDs are unique across components', () => {
  const ids = FIXTURES.map(([component, fixture]) => fixtureTestID(component, fixture.id));
  expect(new Set(ids).size).toBe(ids.length);
});

test('renders every fixture of every component, first under the default system in the light scheme', async () => {
  await render(<GalleryScreen />);
  await fireEvent.press(screen.getByTestId('gallery.theme.light'));
  for (const component of Object.keys(COMPONENTS)) expect(screen.getByTestId(`gallery.component.${component}`)).toBeTruthy();
  for (const [component, each] of FIXTURES) expect(fixture(fixtureTestID(component, each.id))).toBeTruthy();
  expect(screen.getByTestId('gallery.title').props.children).toBe('Tanrei — tanrei · light');
  expect(style(FILLED).backgroundColor).toBe(filledColor(SYSTEMS[0]!, 'light'));
  expect(screen.getByTestId(fixtureTestID('button', 'filled-disabled'))).toBeDisabled();
});

test.each(SYSTEMS.map((system) => [system.id, system] as const))('the system switch: %s draws every fixture from its own tokens, exactly as the component under that provider', async (_id, system) => {
  await render(<GalleryScreen />);
  await fireEvent.press(screen.getByTestId('gallery.theme.light'));
  await fireEvent.press(screen.getByTestId(`gallery.system.${system.id}`));
  expect(screen.getByTestId(`gallery.system.${system.id}`).props.accessibilityState).toMatchObject({ selected: true });
  const drawn = Object.fromEntries(FIXTURES.map(([component, fixture]) => [fixtureTestID(component, fixture.id), style(fixtureTestID(component, fixture.id))]));
  await screen.unmount();

  for (const [component, fixture] of FIXTURES) {
    await render(
      <TanreiProvider system={system} theme="light">
        {renderFixture(component, fixture, 'alone')}
      </TanreiProvider>,
    );
    expect(drawn[fixtureTestID(component, fixture.id)]).toEqual(style('alone'));
    await screen.unmount();
  }
});

test('the theme and contrast switches select the scheme', async () => {
  await render(<GalleryScreen />);
  for (const theme of THEMES.filter((each) => each !== 'system') as ('light' | 'dark')[]) {
    await fireEvent.press(screen.getByTestId(`gallery.theme.${theme}`));
    for (const contrast of CONTRASTS) {
      await fireEvent.press(screen.getByTestId(`gallery.contrast.${contrast}`));
      expect(screen.getByTestId('gallery.title').props.children).toBe(`Tanrei — tanrei · ${resolveScheme(theme, contrast)}`);
      expect(style(FILLED).backgroundColor).toBe(filledColor(SYSTEMS[0]!, theme, contrast));
    }
  }
});
