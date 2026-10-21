// The shipped presets drive the same Slider with other values — "design systems differ in values, never in tokens" —
// with no preset-specific code. Expected values are READ FROM THE SYSTEM INSTANCE;
// a literal appears only where a preset's value is pinned on purpose.
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Dimensions } from 'react-native';
import { cupertino } from '../../generated/systems/cupertino';
import { m3Like } from '../../generated/systems/m3-like';
import { tanrei } from '../../generated/systems/tanrei';
import type { TanreiSystem } from '../../generated/vocabulary';
import { describeFixtureBaselines, describeSharedVocabulary, painted, settleMotion, viewStyle } from '../../testing/harness';
import { TanreiProvider, createTanreiTheme } from '../../theme/TanreiProvider';
import { Slider, type SliderProps } from '../Slider';
import { sliderSubject } from './Slider.subject';

const ID = 'slider';
const part = (name: string) => screen.queryByTestId(`${ID}.${name}`, { includeHiddenElements: true });
const parts = (prefix: string) => screen.queryAllByTestId(new RegExp(`^${ID}\\.${prefix.replace(/\./g, '\\.')}`), { includeHiddenElements: true });
const mount = (system: TanreiSystem, props: Partial<SliderProps> = {}) =>
  render(
    <TanreiProvider theme="light" system={system}>
      <Slider testID={ID} accessibilityLabel="Volume" value={40} {...props} />
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
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

describe('every shipped system values the Slider vocabulary', () => {
  describeSharedVocabulary(sliderSubject);
});

describe('the presets drive the Slider', () => {
  test('m3-like draws the default\'s slider: it takes none of Material\'s values for it — the geometry and roles are the default\'s', () => {
    const { conditions: m3Conditions, valueIndicatorContainerShape: _m3Shape, ...m3 } = m3Like.components.slider;
    const { conditions: _conditions, valueIndicatorContainerShape: _shape, ...base } = tanrei.components.slider;
    expect(m3).toEqual(base);
    // The same roles; only the system's own state-layer opacities differ in the mixes.
    for (const state of ['enabled', 'disabled'] as const) expect(m3Conditions.standard[state]).toEqual(tanrei.components.slider.conditions.standard[state]);
    expect(m3Like.components.slider.valueIndicatorContainerShape).toBe(m3Like.shape.small);
  });

  test('cupertino (UISlider): a 28 white thumb at every size on its own level2 shadow, a surface-container-highest track and a tinted active track, no stop dots', async () => {
    const tokens = cupertino.components.slider;
    const enabled = tokens.conditions.standard.enabled;
    for (const size of ['small', 'medium', 'large'] as const) expect(tokens.sizes[size].handleHeight).toBe(28);
    expect(enabled).toMatchObject({ handleWidth: 28, handleElevation: 'level2', handleColor: { kind: 'literal', r: 255, g: 255, b: 255, a: 1 }, trackColor: { kind: 'role', role: 'surfaceContainerHighest' }, activeTrackColor: { kind: 'role', role: 'primary' } });
    expect(tokens.stopIndicatorSize).toBe(0);
    await mount(cupertino, { step: 10, stops: true });
    expect(viewStyle(part('handle.thumb')!)).toMatchObject({ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgb(255, 255, 255)', boxShadow: createTanreiTheme(cupertino, 'light').elevation('level2').boxShadow });
    expect(viewStyle(part('track.inactive.after')!).backgroundColor).toBe(painted(enabled.trackColor, 'light', cupertino));
    expect(viewStyle(part('track.active.active')!).backgroundColor).toBe(painted(enabled.activeTrackColor, 'light', cupertino));
    expect(parts('track.stop.')).toHaveLength(0);
    // Thicker than the default: the 28 handle is inside the 32 container.
    expect(viewStyle(screen.getByTestId(ID)).height).toBe(Math.max(tokens.containerSize, 28));
  });

  test('cupertino: pressed.opacity is pinned to 1, so that a drag does not dim the slider under its dim feedback; no state layer is drawn', async () => {
    expect(cupertino.behavior.pressedFeedback).toBe('dim');
    expect(cupertino.components.slider.pressedOpacity).toBe(1);
    await mount(cupertino);
    await fireEvent(screen.getByTestId(ID), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 320, height: 32 } } });
    await fireEvent(screen.getByTestId(ID), 'responderGrant', { nativeEvent: { locationX: 100, locationY: 16, pageX: 100, pageY: 16, identifier: 1, changedTouches: [] } });
    expect(viewStyle(screen.getByTestId(ID)).opacity).toBe(1);
    expect(viewStyle(part('handle.container')!).backgroundColor).toBeUndefined();
    await fireEvent(screen.getByTestId(ID), 'responderRelease', { nativeEvent: { locationX: 100, locationY: 16, pageX: 100, pageY: 16, identifier: 1, changedTouches: [] } });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, cupertino.motion.duration.pressHold + 30));
    });
  });
});

describe('preset fixtures (light scheme)', () => {
  // One representative fixture per preset — the discrete slider with stops, where the tracks, the handle,
  // its elevation and the dots (none in cupertino) all show.
  describeFixtureBaselines(sliderSubject, { systems: [m3Like, cupertino], fixtures: ['discrete-stops'] });
});
