// The shipped presets drive the same Tabs with other values — "design systems differ in values, never in tokens" — with
// no preset-specific code. Expected values are READ FROM THE SYSTEM INSTANCE;
// a literal appears only where a preset's value is pinned on purpose.
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Dimensions } from 'react-native';
import { cupertino } from '../../generated/systems/cupertino';
import { m3ExpressiveLike } from '../../generated/systems/m3-expressive-like';
import { m3Like } from '../../generated/systems/m3-like';
import type { TanreiColorRole, TanreiSystem } from '../../generated/vocabulary';
import { describeFixtureBaselines, describeSharedVocabulary, settleMotion, textStyle, viewStyle } from '../../testing/harness';
import { formatColor } from '../../theme/paint';
import { TanreiProvider } from '../../theme/TanreiProvider';
import { Tabs, type Tab, type TabsVariant } from '../Tabs';
import { tabsSubject } from './Tabs.subject';

const ID = 'tabs';
const role = (system: TanreiSystem, name: TanreiColorRole) => formatColor((system.colors as TanreiSystem['colors']).light[name]!);
const tab = (i: number) => screen.getByTestId(`${ID}.tab.${i}`);
const part = (i: number, name: string) => screen.queryByTestId(`${ID}.tab.${i}.${name}`, { includeHiddenElements: true });
const ICONS: Tab[] = [
  { value: 'overview', label: 'Overview', icon: 'dashboard' },
  { value: 'activity', label: 'Activity', icon: 'history' },
];
const mount = (system: TanreiSystem, variant: TabsVariant = 'primary') =>
  render(
    <TanreiProvider theme="light" system={system}>
      <Tabs testID={ID} items={ICONS} value="overview" variant={variant} />
    </TanreiProvider>,
  );

const WINDOW = Dimensions.get('window');
beforeAll(() => {
  // Geometry at the tokens' own sizes (the Jest preset's window has fontScale 2).
  Dimensions.set({ window: { ...WINDOW, fontScale: 1 }, screen: { ...WINDOW, fontScale: 1 } });
});
afterAll(() => {
  Dimensions.set({ window: WINDOW, screen: WINDOW });
});
settleMotion();
beforeEach(() => {
  // Every shipped preset draws a selected icon with the FILL axis of one variable font, which a <Text> cannot set: the
  // icon helper reports it once (README, "Icons"), covered in IconButton.test.tsx.
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

describe('every shipped system values the Tabs vocabulary', () => {
  describeSharedVocabulary(tabsSubject);
});

describe('m3-like drives the Tabs', () => {
  const system: TanreiSystem = m3Like;
  const tokens = system.components.tabs;

  test('primary: the selected text and icon in primary; the indicator 3 thick with a fixed 3 px top radius (not corner.extra-small, which is 4); icons 24', async () => {
    expect(tokens.iconSize).toBe(24);
    expect(tokens.variants.primary.enabled).toMatchObject({ activeIndicatorThickness: 3, activeIndicatorShape: 3 });
    expect(system.shape.extraSmall).toBe(4);
    await mount(system);
    expect(textStyle(part(0, 'label')!).color).toBe(role(system, 'primary'));
    expect(textStyle(part(0, 'icon.glyph')!).color).toBe(role(system, 'primary'));
    expect(textStyle(part(1, 'label')!).color).toBe(role(system, 'onSurfaceVariant'));
    expect(viewStyle(part(0, 'indicator')!)).toMatchObject({ height: 3, borderTopLeftRadius: 3, backgroundColor: role(system, 'primary') });
    expect(viewStyle(part(0, 'icon')!).width).toBe(24);
  });

  test('secondary: the selected text in on-surface; the indicator 2 thick and square, in primary', async () => {
    await mount(system, 'secondary');
    expect(textStyle(part(0, 'label')!).color).toBe(role(system, 'onSurface'));
    expect(viewStyle(part(0, 'indicator')!)).toMatchObject({ height: 2, borderTopLeftRadius: 0, backgroundColor: role(system, 'primary') });
  });

  test('TAB-9: m3-like answers a press with a ripple', () => {
    expect(system.behavior.pressedFeedback).toBe('ripple');
  });
});

describe('m3-expressive-like drives the Tabs', () => {
  test('it inherits m3-like\'s tabs, with no added variant', () => {
    expect(m3ExpressiveLike.components.tabs).toEqual(m3Like.components.tabs);
    expect(Object.keys(m3ExpressiveLike.components.tabs.variants)).toEqual(['primary', 'secondary']);
  });
});

describe('cupertino drives the Tabs', () => {
  const system: TanreiSystem = cupertino;
  const tokens = system.components.tabs;

  test('the selected text and icon of both variants in the tint (primary), as the indicator is', async () => {
    for (const variant of ['primary', 'secondary'] as const) {
      const view = await mount(system, variant);
      expect(textStyle(part(0, 'label')!).color).toBe(role(system, 'primary'));
      expect(textStyle(part(0, 'icon.glyph')!).color).toBe(role(system, 'primary'));
      expect(viewStyle(part(0, 'indicator')!).backgroundColor).toBe(role(system, 'primary'));
      await view.unmount();
    }
  });

  test('hover draws the tab at rest (no state layer); a press dims the tab to its pressed opacity and keeps its colors', async () => {
    await mount(system);
    const resting = viewStyle(tab(1)).backgroundColor;
    await fireEvent(tab(1), 'hoverIn');
    expect(viewStyle(tab(1)).backgroundColor).toBe(resting);
    expect(tokens.pressedOpacity).toBeLessThan(1);
    await fireEvent(tab(1), 'pressIn');
    expect(viewStyle(tab(1))).toMatchObject({ opacity: tokens.pressedOpacity, backgroundColor: resting });
    await fireEvent(tab(1), 'pressOut');
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, system.motion.duration.pressHold + 30));
    });
  });
});

describe('preset fixtures (light scheme)', () => {
  // One representative fixture per preset — the primary row with icons, where the selected look, the
  // stacked icon, the indicator under the content and the divider all show.
  describeFixtureBaselines(tabsSubject, { systems: [m3Like, cupertino], fixtures: ['primary-icons'] });
});
