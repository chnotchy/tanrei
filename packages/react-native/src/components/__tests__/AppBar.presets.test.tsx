// The shipped presets drive the same AppBar with other values — "design systems differ in values, never in tokens" —
// with no preset-specific code. Expected values are READ FROM THE SYSTEM INSTANCE;
// a literal appears only where a preset's value is pinned on purpose.
import { render, screen } from '@testing-library/react-native';
import { Dimensions } from 'react-native';
import { cupertino } from '../../generated/systems/cupertino';
import { m3ExpressiveLike } from '../../generated/systems/m3-expressive-like';
import { m3Like } from '../../generated/systems/m3-like';
import type { TanreiColorRole, TanreiSystem } from '../../generated/vocabulary';
import { describeFixtureBaselines, describeSharedVocabulary, settleMotion, textStyle, viewStyle } from '../../testing/harness';
import { formatColor } from '../../theme/paint';
import { TanreiProvider, createTanreiTheme } from '../../theme/TanreiProvider';
import { AppBar, type AppBarProps } from '../AppBar';
import { IconButton } from '../IconButton';
import { appBarSubject } from './AppBar.subject';

const ID = 'bar';
const role = (system: TanreiSystem, name: TanreiColorRole) => formatColor((system.colors as TanreiSystem['colors']).light[name]!);
const part = (name: string) => screen.queryByTestId(`${ID}.${name}`, { includeHiddenElements: true });
const mount = (system: TanreiSystem, props: Partial<AppBarProps> = {}) =>
  render(
    <TanreiProvider theme="light" system={system}>
      <AppBar testID={ID} title="Inbox" navigation={<IconButton accessibilityLabel="Back">arrow_back</IconButton>} {...props} />
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

describe('every shipped system values the AppBar vocabulary', () => {
  describeSharedVocabulary(appBarSubject);
});

describe('m3-like drives the AppBar', () => {
  const system: TanreiSystem = m3Like;
  const tokens = system.components.appBar;

  test('64 and 152 high with 4 inline padding; titles heading-4 and heading-2 (title-large and headline-medium in its fidelity map)', async () => {
    expect(tokens.sizes.small).toMatchObject({ containerHeight: 64, titleTypescale: 'heading4' });
    expect(tokens.sizes.large).toMatchObject({ containerHeight: 152, titleTypescale: 'heading2' });
    expect(tokens.containerPaddingInline).toBe(4);
    const view = await mount(system, { size: 'large' });
    expect(viewStyle(part('top-row')!)).toMatchObject({ minHeight: 64, paddingStart: 4 });
    expect(viewStyle(part('expanded-block')!).minHeight).toBe(152 - 64);
    expect(textStyle(part('expanded-title')!).fontSize).toBe(createTanreiTheme(system, 'light').text('heading2').fontSize);
    await view.unmount();
  });

  test('APB-2: the scrolled bar is set apart by tone — surface-container — with no edge', async () => {
    const view = await mount(system);
    expect(viewStyle(screen.getByTestId(ID)).backgroundColor).toBe(role(system, 'surface'));
    await view.unmount();
    await mount(system, { scrolled: true });
    expect(viewStyle(screen.getByTestId(ID)).backgroundColor).toBe(role(system, 'surfaceContainer'));
    expect(part('outline')).toBeNull();
  });
});

describe('m3-expressive-like drives the AppBar', () => {
  test('it inherits m3-like\'s app bar, with no added size', () => {
    expect(m3ExpressiveLike.components.appBar).toEqual(m3Like.components.appBar);
    expect(Object.keys(m3ExpressiveLike.components.appBar.sizes)).toEqual(['small', 'large']);
  });
});

describe('cupertino drives the AppBar', () => {
  const system: TanreiSystem = cupertino;
  const tokens = system.components.appBar;

  test('44 and 96 high; titles heading-4 and display (Apple\'s 17 pt semibold and 34 pt bold)', async () => {
    expect(tokens.sizes.small).toMatchObject({ containerHeight: 44, titleTypescale: 'heading4' });
    expect(tokens.sizes.large).toMatchObject({ containerHeight: 96, titleTypescale: 'display' });
    await mount(system, { size: 'large' });
    expect(viewStyle(part('top-row')!).minHeight).toBe(44);
    expect(viewStyle(part('expanded-block')!).minHeight).toBe(96 - 44);
    expect(textStyle(part('expanded-title')!).fontSize).toBe(createTanreiTheme(system, 'light').text('display').fontSize);
  });

  test('APB-1 / APB-2: the flat bar is transparent (no fill at all: the page shows through); the scrolled one is surface-container-low with the outline-variant edge', async () => {
    const view = await mount(system);
    expect(viewStyle(screen.getByTestId(ID)).backgroundColor).toBeUndefined();
    expect(part('outline')).toBeNull();
    await view.unmount();
    await mount(system, { scrolled: true });
    expect(viewStyle(screen.getByTestId(ID)).backgroundColor).toBe(role(system, 'surfaceContainerLow'));
    expect(viewStyle(part('outline')!).backgroundColor).toBe(role(system, 'outlineVariant'));
  });
});

describe('preset fixtures (light scheme)', () => {
  describeFixtureBaselines(appBarSubject, { systems: [m3Like, cupertino], fixtures: ['small-scrolled', 'large'] });
});
