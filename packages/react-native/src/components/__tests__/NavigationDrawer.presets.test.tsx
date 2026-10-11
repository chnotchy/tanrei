// The shipped presets drive the same NavigationDrawer with other values — "design systems differ in values, never in
// tokens" — with no preset-specific code. Expected values are READ FROM THE SYSTEM INSTANCE;
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
import { NavigationDrawer, type NavigationDrawerProps } from '../NavigationDrawer';
import { navigationDrawerSubject } from './NavigationDrawer.subject';

const ID = 'drawer';
const role = (system: TanreiSystem, name: TanreiColorRole) => formatColor((system.colors as TanreiSystem['colors']).light[name]!);
const part = (name: string) => screen.queryByTestId(`${ID}.${name}`, { includeHiddenElements: true });
const mount = (system: TanreiSystem, props: Partial<NavigationDrawerProps> = {}) =>
  render(
    <TanreiProvider theme="light" system={system}>
      <NavigationDrawer
        testID={ID}
        accessibilityLabel="Mail"
        open
        value="inbox"
        items={[{ heading: 'Mail', items: [{ value: 'inbox', label: 'Inbox', icon: 'inbox', badge: '24' }, { value: 'sent', label: 'Sent', icon: 'send' }] }]}
        {...props}
      />
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

describe('every shipped system values the NavigationDrawer vocabulary', () => {
  describeSharedVocabulary(navigationDrawerSubject);
});

describe('m3-like drives the NavigationDrawer', () => {
  const system: TanreiSystem = m3Like;
  const tokens = system.components.navigationDrawer;

  test('360 wide, both forms on surface-container-low with no edge; 56-high rows with full corners and no gap, 16 padding, 24 icons; badges in label and headings in heading-6', async () => {
    expect(tokens).toMatchObject({ containerWidth: 360, itemContainerHeight: 56, containerGap: 0, itemPaddingInline: 16, itemIconSize: 24, itemBadgeTypescale: 'label', headingTypescale: 'heading6' });
    await mount(system);
    const theme = createTanreiTheme(system, 'light');
    expect(viewStyle(part('panel')!)).toMatchObject({ width: 360, backgroundColor: role(system, 'surfaceContainerLow') });
    expect(part('outline')).toBeNull();
    expect(viewStyle(part('destination.0')!)).toMatchObject({ minHeight: 56, borderRadius: system.shape.full, paddingStart: 16 });
    expect(textStyle(part('destination.0.badge')!).fontSize).toBe(theme.text('label').fontSize);
    expect(textStyle(part('section.0.heading.text')!).fontSize).toBe(theme.text('heading6').fontSize);
  });

  test('NVD-11: the modal drawer at level1, which is a real shadow there, with Material\'s 16 end corners', async () => {
    await mount(system, { variant: 'modal', inline: true });
    expect(viewStyle(part('panel')!)).toMatchObject({ borderTopEndRadius: 16, boxShadow: createTanreiTheme(system, 'light').elevation('level1').boxShadow });
    expect((viewStyle(part('panel')!).boxShadow as unknown[]).length).toBeGreaterThan(0);
  });
});

describe('m3-expressive-like drives the NavigationDrawer', () => {
  test('it inherits m3-like\'s drawer', () => {
    expect(m3ExpressiveLike.components.navigationDrawer).toEqual(m3Like.components.navigationDrawer);
  });
});

describe('cupertino drives the NavigationDrawer (an iPadOS sidebar)', () => {
  const system: TanreiSystem = cupertino;
  const tokens = system.components.navigationDrawer;

  test('rows at corner.medium in body-large; the selected row filled with the tint and its content on-primary; unselected icons in the tint and labels in on-surface', async () => {
    expect(tokens.itemContainerShape).toBe(system.shape.medium);
    expect(tokens.itemLabelTypescale).toBe('bodyLarge');
    await mount(system);
    expect(viewStyle(part('destination.0')!)).toMatchObject({ backgroundColor: role(system, 'primary'), borderRadius: system.shape.medium, borderCurve: 'continuous' });
    for (const name of ['label', 'badge', 'icon.glyph']) expect(textStyle(part(`destination.0.${name}`)!).color).toBe(role(system, 'onPrimary'));
    expect(textStyle(part('destination.1.icon.glyph')!).color).toBe(role(system, 'primary'));
    expect(textStyle(part('destination.1.label')!).color).toBe(role(system, 'onSurface'));
  });
});

describe('preset fixtures (light scheme)', () => {
  describeFixtureBaselines(navigationDrawerSubject, { systems: [m3Like, cupertino], fixtures: ['standard', 'modal'] });
});
