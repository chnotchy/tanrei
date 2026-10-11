// The shipped presets drive the same Chip with other values — "design systems differ in values, never in tokens" — with
// no preset-specific code. Expected values are READ FROM THE SYSTEM INSTANCE;
// a literal appears only where a preset's value is pinned on purpose.
import { act, fireEvent, render } from '@testing-library/react-native';
import { Dimensions } from 'react-native';
import { cupertino } from '../../generated/systems/cupertino';
import { m3ExpressiveLike } from '../../generated/systems/m3-expressive-like';
import { m3Like } from '../../generated/systems/m3-like';
import type { TanreiColorRole, TanreiCoreChipVariant, TanreiSystem } from '../../generated/vocabulary';
import { byTestID, describeFixtureBaselines, describeSharedVocabulary, settleMotion, textStyle, viewStyle } from '../../testing/harness';
import { resolveElevation } from '../../theme/elevation';
import { formatColor } from '../../theme/paint';
import { TanreiProvider, createTanreiTheme } from '../../theme/TanreiProvider';
import { Chip, type ChipProps } from '../Chip';
import { chipSubject } from './Chip.subject';

const ID = 'chip';
const variants: TanreiCoreChipVariant[] = ['outlined', 'elevated'];
const sizes = ['small', 'medium'] as const;
const { host, part } = byTestID(ID);
const container = () => part('container')!;

const role = (system: TanreiSystem, name: TanreiColorRole) => formatColor((system.colors as TanreiSystem['colors']).light[name]!);

const mount = (system: TanreiSystem, props: Partial<ChipProps> = {}) =>
  render(
    <TanreiProvider theme="light" system={system}>
      <Chip testID={ID} label="Vegetarian" icon="event" {...props} />
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
  // Every shipped preset draws the selected check with the FILL axis of one variable font, which a <Text> cannot set:
  // the icon helper reports it once (README, "Icons"), covered in IconButton.test.tsx.
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

describe('every shipped system values the Chip vocabulary', () => {
  describeSharedVocabulary(chipSubject);
});

describe('m3-like drives the Chip', () => {
  const system: TanreiSystem = m3Like;
  const tokens = system.components.chip;

  test('corners of 8; the medium chip pads 16 beside its label and draws 18 px icons', async () => {
    expect(tokens.containerShape).toBe(8);
    expect(tokens.sizes.medium).toMatchObject({ containerHeight: 32, containerPaddingInline: 16, iconSize: 18 });
    await mount(system, { icon: undefined });
    expect(viewStyle(container())).toMatchObject({ borderRadius: 8, minHeight: 32 });
    expect(viewStyle(host())).toMatchObject({ paddingStart: 16, paddingEnd: 16 });
  });

  test('Material\'s flat chip: an outline-variant edge, an on-surface-variant label and a primary icon', async () => {
    await mount(system);
    expect(viewStyle(part('outline')!).borderColor).toBe(role(system, 'outlineVariant'));
    expect(textStyle(part('label')!).color).toBe(role(system, 'onSurfaceVariant'));
    expect(textStyle(part('glyph')!)).toMatchObject({ color: role(system, 'primary'), fontSize: 18 });
  });

  test('the elevated chip is surface-container-low at the preset\'s level1, rising to level2 on hover', async () => {
    const elevated = tokens.variants.elevated;
    expect([elevated.enabled.containerElevation, elevated.hovered.containerElevation, elevated.enabled.selectedContainerElevation, elevated.hovered.selectedContainerElevation]).toEqual(['level1', 'level2', 'level1', 'level2']);
    await mount(system, { variant: 'elevated' });
    expect(viewStyle(container()).backgroundColor).toBe(role(system, 'surfaceContainerLow'));
    await fireEvent(host(), 'hoverIn');
    expect(viewStyle(container()).boxShadow).toEqual(resolveElevation(system.elevation.level2, (name) => role(system, name)).boxShadow);
  });

  test('CHP-9: m3-like answers a press with a ripple', () => {
    expect(system.behavior.pressedFeedback).toBe('ripple');
  });
});

describe('m3-expressive-like drives the Chip', () => {
  test('it inherits m3-like\'s chip, with no added axis values', () => {
    const tokens = m3ExpressiveLike.components.chip;
    expect(tokens).toEqual(m3Like.components.chip);
    expect(Object.keys(tokens.sizes).sort()).toEqual([...sizes].sort());
    expect(Object.keys(tokens.variants).sort()).toEqual([...variants].sort());
  });
});

describe('cupertino drives the Chip', () => {
  const system: TanreiSystem = cupertino;
  const tokens = system.components.chip;

  test('a capsule with the continuous corner; the small label is caption', async () => {
    expect(tokens.containerShape).toBe(system.shape.full);
    expect(tokens.sizes.small.labelTypescale).toBe('caption');
    await mount(system, { size: 'small' });
    expect(viewStyle(container())).toMatchObject({ borderRadius: system.shape.full, borderCurve: 'continuous' });
    expect(textStyle(part('label')!).fontSize).toBe(createTanreiTheme(system, 'light').text('caption').fontSize);
  });

  test.each(variants)('a selected %s chip takes the tint: primary with on-primary label and check', async (variant) => {
    await mount(system, { variant, kind: 'filter', selected: true });
    expect(viewStyle(container()).backgroundColor).toBe(role(system, 'primary'));
    expect(textStyle(part('label')!).color).toBe(role(system, 'onPrimary'));
    expect(textStyle(part('check.glyph')!).color).toBe(role(system, 'onPrimary'));
  });

  test.each(variants)('%s: hover and keyboard focus draw exactly like the resting state (no state layer, no hover lift)', async (variant) => {
    await mount(system, { variant });
    const resting = { ...viewStyle(container()) };
    await fireEvent(host(), 'hoverIn');
    expect(viewStyle(container())).toEqual(resting);
    await fireEvent(host(), 'hoverOut');
    await fireEvent(host(), 'focus');
    expect(viewStyle(container()).backgroundColor).toBe(resting.backgroundColor);
  });

  test('CHP-9 dim: pressed dims the whole chip to 0.7 and keeps its colors', async () => {
    await mount(system, { variant: 'elevated' });
    const resting = viewStyle(container()).backgroundColor;
    await fireEvent(host(), 'pressIn');
    expect(tokens.pressedOpacity).toBe(0.7);
    expect(viewStyle(container())).toMatchObject({ opacity: 0.7, backgroundColor: resting });
    await fireEvent(host(), 'pressOut');
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, system.motion.duration.pressHold + 30));
    });
    expect(viewStyle(container()).opacity).toBe(1);
  });
});

describe('preset fixtures (light scheme)', () => {
  // One representative fixture per preset — the default outlined action chip — plus a filter chip that is
  // on, where the presets differ most (m3-like: secondary-container; cupertino: the tint).
  describeFixtureBaselines(chipSubject, { systems: [m3Like, cupertino], fixtures: ['action-outlined', 'filter-selected'] });
});
