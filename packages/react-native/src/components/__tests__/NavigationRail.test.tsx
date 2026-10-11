// NavigationRail — behaviour, accessibility, layout, insets, token binding and fixture baselines.
// Cases come from specs/navigation-rail.spec.json; every behaviour id is cited by the test that covers it. The
// destination's own behaviour is shared with the navigation bar (destinations.shared.tsx), cited here by the rail's ids.
import { render, screen } from '@testing-library/react-native';
import { Dimensions, I18nManager } from 'react-native';
import { tanrei } from '../../generated/systems/tanrei';
import type { TanreiNavigationRailTokens, TanreiSystem } from '../../generated/vocabulary';
import { describeFixtureBaselines, fixtureElement, viewStyle, withComponent, type Instance } from '../../testing/harness';
import { loadSpec } from '../../testing/spec';
import { resetLookupReports } from '../../theme/lookup';
import { TanreiProvider, createTanreiTheme, type TanreiProviderProps } from '../../theme/TanreiProvider';
import { IconButton } from '../IconButton';
import { NavigationRail, type NavigationRailProps } from '../NavigationRail';
import { FOUR, ID, cell, describeDestinations, development, painted, part, reduceMotion } from './destinations.shared';
import { navigationRailSubject } from './NavigationRail.subject';

const spec = loadSpec('navigation-rail');
const tokens: TanreiNavigationRailTokens = tanrei.components.navigationRail;
const withRail = (overrides: Partial<TanreiNavigationRailTokens>, base: TanreiSystem = tanrei): TanreiSystem => withComponent(base, 'navigationRail', overrides);
const rail = () => screen.getByTestId(ID);
const railPart = (name: string) => screen.queryByTestId(`${ID}.${name}`, { includeHiddenElements: true });
const MENU = (
  <IconButton accessibilityLabel="Menu" testID="menu">
    menu
  </IconButton>
);

function mount(props: Partial<NavigationRailProps> = {}, provider: Omit<TanreiProviderProps, 'children'> = { theme: 'light' }) {
  return render(
    <TanreiProvider {...provider}>
      <NavigationRail testID={ID} accessibilityLabel="Main" destinations={FOUR} value="inbox" header={MENU} {...props} />
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
  test('the React Native mapping in the spec matches this implementation: NavigationRail, its destinations and its header buttons', () => {
    const platform = spec.platforms['react-native'];
    expect(platform.name).toBe(NavigationRail.name);
    expect(platform.props).toEqual({ value: 'value', labelVisibility: 'labelVisibility', label: 'accessibilityLabel' });
    expect(platform.events).toEqual({ change: 'onValueChange', reselect: 'onReselect' });
    expect(platform.items?.destination).toMatchObject({ name: 'NavigationRailDestination', props: { value: 'value', label: 'label', icon: 'icon', disabled: 'disabled', badge: 'badge', badgeCount: 'count', badgeLabel: 'label' } });
    expect(platform.items?.['header-button']).toMatchObject({ name: IconButton.name, props: { label: 'accessibilityLabel' }, events: { click: 'onPress' } });
  });

  test('the conditions are unselected (the default) and selected; labelVisibility is closed (always, selected, never)', () => {
    expect(Object.keys(tokens.conditions)).toEqual(['unselected', 'selected']);
    expect(spec.props.find((p) => p.name === 'labelVisibility')?.values).toEqual(['always', 'selected', 'never']);
  });
});

describeDestinations({
  component: 'NavigationRail',
  key: 'navigationRail',
  labelLines: 2,
  ids: {
    activate: 'NVR-1',
    disabled: 'NVR-2',
    selectedParts: 'NVR-3',
    states: 'NVR-4',
    focusRing: 'NVR-5',
    hitArea: 'NVR-6',
    disabledTokens: 'NVR-7',
    pressHold: 'NVR-8',
    feedback: 'NVR-9',
    smoothing: 'NVR-10',
    itemContainer: 'NVR-13',
    labelVisibility: 'NVR-14',
    icon: 'NVR-15',
    selectionMotion: 'NVR-16',
    badge: 'NVR-17',
    semantics: 'NVR-20',
    emptyLabel: 'NVR-21',
    textSize: 'NVR-22',
    duplicates: 'NVR-23',
  },
  element: ({ labelVisibility, ...props }) => <NavigationRail testID={ID} accessibilityLabel="Main" {...props} labelVisibility={labelVisibility as NavigationRailProps['labelVisibility']} />,
});

describe('the rail (NVR-6, NVR-11, NVR-12, NVR-18 … NVR-20)', () => {
  test.each(['light', 'dark'] as const)('NVR-11: the parent\'s full height at the start edge, container.width wide, in container.color at container.elevation, edged at its end by outline.width of outline.color (%s)', async (theme) => {
    await mount({}, { theme });
    expect(viewStyle(rail())).toMatchObject({ alignSelf: 'stretch', width: tokens.containerWidth, backgroundColor: painted(tokens.containerColor, theme) });
    expect(viewStyle(rail()).boxShadow).toBeUndefined();
    expect(viewStyle(railPart('outline')!)).toMatchObject({ position: 'absolute', top: 0, bottom: 0, end: 0, width: tokens.outlineWidth, backgroundColor: painted(tokens.outlineColor, theme) });
    expect(railPart('outline')!.props.accessibilityElementsHidden).toBe(true);
  });

  test('NVR-11: right-to-left puts the rail at the right edge with the edge on its left — the edge is placed by its logical end, the start inset by the layout direction', async () => {
    const rtl = jest.replaceProperty(I18nManager, 'isRTL', true);
    await mount({ insets: { left: 20, right: 30 } });
    expect(viewStyle(rail())).toMatchObject({ width: tokens.containerWidth + 30, paddingStart: 30 });
    expect(viewStyle(railPart('outline')!)).not.toHaveProperty('left');
    rtl.restore();
  });

  test('NVR-11: the values drive the rail — a wider, raised rail with no edge', async () => {
    const system = withRail({ containerWidth: 96, containerElevation: 'level2', outlineColor: { kind: 'none' } });
    await mount({}, { theme: 'light', system });
    expect(viewStyle(rail())).toMatchObject({ width: 96, boxShadow: createTanreiTheme(system, 'light').elevation('level2').boxShadow });
    expect(railPart('outline')).toBeNull();
  });

  test('NVR-12: the header centred and stacked container.padding-block below the top; the destinations header.gap below it (less the half gap each cell carries), container.gap apart; without a header container.padding-block below the top', async () => {
    const view = await mount({ header: <><IconButton accessibilityLabel="Menu">menu</IconButton><IconButton accessibilityLabel="Compose">edit</IconButton></> });
    const header = railPart('header')!;
    expect(viewStyle(header)).toMatchObject({ paddingTop: tokens.containerPaddingBlock, gap: tokens.containerGap });
    expect(header.children).toHaveLength(2);
    for (const row of header.children as Instance[]) expect(viewStyle(row)).toEqual({ flexDirection: 'row', justifyContent: 'center' });
    expect(railPart('scroll')!.props.contentContainerStyle).toMatchObject({ paddingTop: tokens.headerGap - tokens.containerGap / 2 });
    expect(viewStyle(cell(0)).paddingVertical).toBe(tokens.containerGap / 2);
    await view.unmount();
    await mount({ header: undefined });
    expect(railPart('header')).toBeNull();
    expect(railPart('scroll')!.props.contentContainerStyle).toMatchObject({ paddingTop: tokens.containerPaddingBlock - tokens.containerGap / 2 });
  });

  test('NVR-6: a cell is the rail\'s full width, the destination with half of container.gap above and below it, at least sys.target.touch high even without a label', async () => {
    await mount({ labelVisibility: 'never' });
    expect(viewStyle(cell(1))).toMatchObject({ alignSelf: 'stretch', paddingVertical: tokens.containerGap / 2, minHeight: tanrei.measure.target.touch });
    expect(tokens.itemContainerHeight + tokens.containerGap).toBeLessThan(tanrei.measure.target.touch);
  });

  test('NVR-18: the destinations scroll when they do not fit, the header stays outside the scroll; fewer than three or more than seven still render, reported in development builds', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const many = Array.from({ length: 8 }, (_, i) => ({ value: `d${i}`, label: `D${i}`, icon: 'star' }));
    const view = await mount({ destinations: many, value: 'd0' });
    expect(railPart('scroll')!.children.flatMap((child) => (typeof child === 'string' ? [] : (child as Instance).children)).length).toBe(8);
    expect(rail().children).toContain(railPart('header'));
    expect(railPart('scroll')!.children).not.toContain(railPart('header'));
    expect(screen.getAllByRole('tab')).toHaveLength(8);
    await view.unmount();
    await mount({ destinations: FOUR.slice(0, 2) });
    expect(warn.mock.calls.map(([message]) => String(message))).toEqual([expect.stringContaining('holds 8 destinations; a rail holds three to seven'), expect.stringContaining('holds 2 destinations; a rail holds three to seven')]);
  });

  test('NVR-19: the rail reaches under the provider\'s top, bottom and start insets and keeps its content inside them; its own insets replace the provider\'s side by side', async () => {
    const view = await mount({}, { theme: 'light', insets: { top: 24, bottom: 20, left: 44, right: 12 } });
    expect(viewStyle(rail())).toMatchObject({ width: tokens.containerWidth + 44, paddingStart: 44, paddingTop: 24, paddingBottom: 20, backgroundColor: painted(tokens.containerColor) });
    await view.unmount();
    await mount({ insets: { top: 0 } }, { theme: 'light', insets: { top: 24, left: 44 } });
    expect(viewStyle(rail())).toMatchObject({ paddingTop: 0, paddingStart: 44 });
  });

  test('NVR-20: the header\'s content comes first in reading and focus order and keeps its own semantics', async () => {
    await mount();
    const order = screen.getAllByRole(/button|tab/).map((each) => each.props.accessibilityLabel);
    expect(order).toEqual(['Menu', 'Inbox', 'Sent', 'Starred', 'Settings']);
    expect(screen.getByTestId('menu').props).toMatchObject({ accessibilityRole: 'button', focusable: true });
    expect(rail().props).toMatchObject({ role: 'tablist', accessibilityLabel: 'Main' });
  });

  test('NVR-13 / NVR-22: a label takes at most two lines and grows its destination; the rail keeps its width', async () => {
    await mount({ destinations: [{ value: 'shared', label: 'Shared with me and my whole team', icon: 'group' }, ...FOUR.slice(1)] });
    expect(part(0, 'label')!.props.numberOfLines).toBe(2);
    expect(viewStyle(rail()).width).toBe(tokens.containerWidth);
    expect(viewStyle(cell(0))).not.toHaveProperty('height');
  });
});

describe('fixtures', () => {
  describeFixtureBaselines(navigationRailSubject);

  test('a header-button item goes to the header wherever it stands among the items (NVR-12)', async () => {
    const fixture = spec.fixtures.find((each) => each.id === 'four-destinations')!;
    await render(fixtureElement(navigationRailSubject, { ...fixture, items: [...fixture.items!.slice(1), fixture.items![0]!] }, { theme: 'light' }, { testID: ID }));
    expect(railPart('header')!.children).toHaveLength(1);
    expect(screen.getAllByRole(/button|tab/)[0]!.props.accessibilityLabel).toBe('Menu');
  });
});
