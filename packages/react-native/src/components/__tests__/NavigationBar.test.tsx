// NavigationBar — behaviour, accessibility, layout, insets, token binding and fixture baselines.
// Cases come from specs/navigation-bar.spec.json; every behaviour id is cited by the test that covers it. The
// destination's own behaviour is shared with the navigation rail (destinations.shared.tsx), cited here by the bar's ids.
import { render, screen } from '@testing-library/react-native';
import { Dimensions } from 'react-native';
import { tanrei } from '../../generated/systems/tanrei';
import type { TanreiNavigationBarTokens, TanreiSystem } from '../../generated/vocabulary';
import { describeFixtureBaselines, fixtureElement, viewStyle, withComponent } from '../../testing/harness';
import { loadSpec } from '../../testing/spec';
import { resetLookupReports } from '../../theme/lookup';
import { TanreiProvider, createTanreiTheme, type TanreiProviderProps } from '../../theme/TanreiProvider';
import { NavigationBar, type NavigationBarProps } from '../NavigationBar';
import { FOUR, ID, cell, describeDestinations, development, painted, part, reduceMotion } from './destinations.shared';
import { destinationOf, navigationBarSubject } from './NavigationBar.subject';

const spec = loadSpec('navigation-bar');
const tokens: TanreiNavigationBarTokens = tanrei.components.navigationBar;
const withBar = (overrides: Partial<TanreiNavigationBarTokens>, base: TanreiSystem = tanrei): TanreiSystem => withComponent(base, 'navigationBar', overrides);
const bar = () => screen.getByTestId(ID);
const barPart = (name: string) => screen.queryByTestId(`${ID}.${name}`, { includeHiddenElements: true });

function mount(props: Partial<NavigationBarProps> = {}, provider: Omit<TanreiProviderProps, 'children'> = { theme: 'light' }) {
  return render(
    <TanreiProvider {...provider}>
      <NavigationBar testID={ID} accessibilityLabel="Main" destinations={FOUR} value="inbox" {...props} />
    </TanreiProvider>,
  );
}

const WINDOW = Dimensions.get('window');
beforeAll(() => {
  // The baselines at the tokens' own sizes (the Jest preset's window has fontScale 2).
  Dimensions.set({ window: { ...WINDOW, fontScale: 1 }, screen: { ...WINDOW, fontScale: 1 } });
});
afterAll(() => {
  Dimensions.set({ window: WINDOW, screen: WINDOW });
});
beforeEach(() => {
  reduceMotion(true);
  resetLookupReports();
});
afterEach(() => {
  jest.restoreAllMocks();
  development(true);
});

describe('spec contract', () => {
  test('the React Native mapping in the spec matches this implementation: NavigationBar and its destinations', () => {
    const platform = spec.platforms['react-native'];
    expect(platform.name).toBe(NavigationBar.name);
    expect(platform.props).toEqual({ value: 'value', labelVisibility: 'labelVisibility', label: 'accessibilityLabel' });
    expect(platform.events).toEqual({ change: 'onValueChange', reselect: 'onReselect' });
    expect(platform.items?.destination).toMatchObject({ name: 'NavigationBarDestination', props: { value: 'value', label: 'label', icon: 'icon', disabled: 'disabled', badge: 'badge', badgeCount: 'count', badgeLabel: 'label' } });
  });

  test('the conditions are unselected (the default) and selected; labelVisibility is closed (always, selected, never)', () => {
    expect(Object.keys(tokens.conditions)).toEqual(['unselected', 'selected']);
    expect(spec.props.find((p) => p.name === 'labelVisibility')?.values).toEqual(['always', 'selected', 'never']);
  });
});

describeDestinations({
  component: 'NavigationBar',
  key: 'navigationBar',
  labelLines: 1,
  ids: {
    activate: 'NVB-1',
    disabled: 'NVB-2',
    selectedParts: 'NVB-3',
    states: 'NVB-4',
    focusRing: 'NVB-5',
    hitArea: 'NVB-6',
    disabledTokens: 'NVB-7',
    pressHold: 'NVB-8',
    feedback: 'NVB-9',
    smoothing: 'NVB-10',
    itemContainer: 'NVB-12',
    labelVisibility: 'NVB-13',
    icon: 'NVB-14',
    selectionMotion: 'NVB-15',
    badge: 'NVB-16',
    semantics: 'NVB-19',
    emptyLabel: 'NVB-20',
    textSize: 'NVB-21',
    duplicates: 'NVB-22',
  },
  element: ({ labelVisibility, ...props }) => <NavigationBar testID={ID} accessibilityLabel="Main" {...props} labelVisibility={labelVisibility as NavigationBarProps['labelVisibility']} />,
});

describe('the bar (NVB-6, NVB-11, NVB-13, NVB-17, NVB-18, NVB-21)', () => {
  test.each(['light', 'dark'] as const)('NVB-11: the parent\'s full width, at least container.height high, in container.color at container.elevation, edged at the top by outline.width of outline.color (%s)', async (theme) => {
    await mount({}, { theme });
    expect(viewStyle(bar())).toMatchObject({ alignSelf: 'stretch', flexDirection: 'row', minHeight: tokens.containerHeight, backgroundColor: painted(tokens.containerColor, theme) });
    expect(viewStyle(bar()).boxShadow).toBeUndefined();
    expect(viewStyle(barPart('outline')!)).toMatchObject({ position: 'absolute', top: 0, start: 0, end: 0, height: tokens.outlineWidth, backgroundColor: painted(tokens.outlineColor, theme) });
    expect(barPart('outline')!.props.accessibilityElementsHidden).toBe(true);
  });

  test('NVB-11: the values drive the bar — a raised, taller bar with no edge', async () => {
    const system = withBar({ containerHeight: 80, containerElevation: 'level2', outlineColor: { kind: 'none' }, containerColor: { kind: 'role', role: 'surfaceContainer' } });
    await mount({}, { theme: 'light', system });
    expect(viewStyle(bar())).toMatchObject({ minHeight: 80, backgroundColor: painted({ kind: 'role', role: 'surfaceContainer' }), boxShadow: createTanreiTheme(system, 'light').elevation('level2').boxShadow });
    expect(barPart('outline')).toBeNull();
    expect(barPart('elevation-ring')).not.toBeNull();
  });

  test('NVB-6 / NVB-11: equal cells, one per destination, in reading order, each the bar\'s full height; a row, which React Native mirrors in right-to-left', async () => {
    await mount();
    const cells = [0, 1, 2, 3].map((i) => viewStyle(cell(i)));
    for (const style of cells) expect(style).toMatchObject({ flexGrow: 1, flexBasis: 0, alignSelf: 'stretch', minWidth: tanrei.measure.target.touch, minHeight: tanrei.measure.target.touch });
    expect((bar().children as { props: { testID?: string } }[]).filter((child) => child.props.testID?.startsWith(`${ID}.destination`)).map((child) => child.props.testID)).toEqual([0, 1, 2, 3].map((i) => `${ID}.destination.${i}`));
    expect(viewStyle(bar())).not.toHaveProperty('paddingStart');
  });

  test('NVB-13: a destination that draws no label centres its item container in its cell', async () => {
    await mount({ labelVisibility: 'never' });
    expect(viewStyle(cell(0))).toMatchObject({ alignItems: 'center', justifyContent: 'center' });
    expect(part(0, 'label-slot')).toBeNull();
    expect(part(0, 'group')!.children).toEqual([part(0, 'container')]);
  });

  test('NVB-17: fewer than three or more than five destinations still render, and development builds report the count', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const view = await mount({ destinations: FOUR.slice(0, 2) });
    expect(screen.getAllByRole('tab')).toHaveLength(2);
    await view.unmount();
    await mount({ destinations: [...FOUR, { value: 'a', label: 'A', icon: 'add' }, { value: 'b', label: 'B', icon: 'add' }] });
    expect(screen.getAllByRole('tab')).toHaveLength(6);
    expect(warn.mock.calls.map(([message]) => String(message))).toEqual([expect.stringContaining('holds 2 destinations; a bar holds three to five'), expect.stringContaining('holds 6 destinations; a bar holds three to five')]);
  });

  test('NVB-18: the bar reaches under the provider\'s bottom and side insets (its color fills them) and keeps its destinations above and inside them; its own insets replace the provider\'s side by side', async () => {
    const view = await mount({}, { theme: 'light', insets: { top: 47, bottom: 34, left: 20, right: 12 } });
    expect(viewStyle(bar())).toMatchObject({ minHeight: tokens.containerHeight + 34, paddingBottom: 34, paddingLeft: 20, paddingRight: 12, backgroundColor: painted(tokens.containerColor) });
    expect(viewStyle(bar())).not.toHaveProperty('paddingTop');
    await view.unmount();
    await mount({ insets: { bottom: 0 } }, { theme: 'light', insets: { bottom: 34, left: 20 } });
    expect(viewStyle(bar())).toMatchObject({ minHeight: tokens.containerHeight, paddingBottom: 0, paddingLeft: 20 });
  });

  test('NVB-21: the bar\'s height is a minimum, so labels at an enlarged text size grow it on one line; React Native has no large-content viewer (README)', async () => {
    await mount();
    expect(viewStyle(bar())).not.toHaveProperty('height');
    expect(part(0, 'label')!.props.numberOfLines).toBe(1);
  });
});

describe('fixtures', () => {
  describeFixtureBaselines(navigationBarSubject);

  test('the fixtures\' badges arrive nested: badgeCount as the badge\'s count, badgeLabel as its label, the destination keeping its own label', async () => {
    const fixture = spec.fixtures.find((each) => each.id === 'badges')!;
    await render(fixtureElement(navigationBarSubject, fixture, { theme: 'light' }, { testID: ID }));
    expect(cell(0).props).toMatchObject({ accessibilityLabel: 'Inbox', accessibilityValue: { text: '1 of 4, 3 unread' } });
    expect(cell(1).props).toMatchObject({ accessibilityLabel: 'Chat', accessibilityValue: { text: '2 of 4, New' } });
    expect(destinationOf({ value: 'a', label: 'A', icon: 'x', badge: false, count: 3 })).toEqual({ value: 'a', label: 'A', icon: 'x' });
  });
});
