// The shipped presets drive the same Search with other values — "design systems differ in values, never in tokens" —
// with no preset-specific code. Expected values are READ FROM THE SYSTEM INSTANCE;
// a literal appears only where a preset's value is pinned on purpose.
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Dimensions } from 'react-native';
import { cupertino } from '../../generated/systems/cupertino';
import { m3ExpressiveLike } from '../../generated/systems/m3-expressive-like';
import { m3Like } from '../../generated/systems/m3-like';
import { tanrei } from '../../generated/systems/tanrei';
import type { TanreiSystem } from '../../generated/vocabulary';
import { describeFixtureBaselines, describeSharedVocabulary, painted, settleMotion, viewStyle } from '../../testing/harness';
import { TanreiProvider } from '../../theme/TanreiProvider';
import { Search, type SearchProps } from '../Search';
import { searchSubject } from './Search.subject';

const ID = 'search';
const q = (name: string) => screen.queryByTestId(`${ID}.${name}`, { includeHiddenElements: true });
const mount = (system: TanreiSystem, props: Partial<SearchProps> = {}) =>
  render(
    <TanreiProvider theme="light" system={system}>
      <Search testID={ID} accessibilityLabel="Search mail" placeholder="Search mail" {...props} />
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

describe('every shipped system values the Search vocabulary', () => {
  describeSharedVocabulary(searchSubject);
});

describe('the presets drive the Search', () => {
  test('m3-like and m3-expressive-like draw the default\'s search: it takes none of Material\'s values for it — only the system\'s own corners and state-layer opacities differ, and the gaps the default widened for its 48 targets stay where they were', () => {
    const { conditions: _m3Conditions, suggestionContainerShape, viewContainerShape, ...m3 } = m3Like.components.search;
    const { conditions: _conditions, suggestionContainerShape: _s, viewContainerShape: _v, ...base } = tanrei.components.search;
    expect(m3).toEqual({ ...base, containerGap: m3Like.space.space100, containerPaddingInlineWithButton: m3Like.space.space50 });
    expect([suggestionContainerShape, viewContainerShape]).toEqual([m3Like.shape.small, m3Like.shape.medium]);
    expect(m3ExpressiveLike.components.search).toEqual(m3Like.components.search);
  });

  test('cupertino (UISearchBar): a 36 field at corner.medium on surface-container-high with 8 padding', async () => {
    const tokens = cupertino.components.search;
    expect(tokens).toMatchObject({ containerHeight: 36, containerPaddingInline: 8, containerShape: cupertino.shape.medium });
    expect(tokens.conditions.standard.enabled.containerColor).toEqual({ kind: 'role', role: 'surfaceContainerHigh' });
    await mount(cupertino);
    expect(viewStyle(q('bar')!)).toMatchObject({ minHeight: 36, paddingStart: 8, borderRadius: tokens.containerShape, backgroundColor: painted(tokens.conditions.standard.enabled.containerColor, 'light', cupertino) });
  });

  test('cupertino: focus draws no edge (an iOS field shows focus by its caret and the keyboard) and the container stays at rest', async () => {
    const tokens = cupertino.components.search;
    expect(tokens.conditions.standard.focused.outlineColor).toEqual({ kind: 'none' });
    await mount(cupertino);
    await fireEvent(q('input')!, 'focus');
    expect(q('outline')).toBeNull();
    expect(viewStyle(q('bar')!).backgroundColor).toBe(painted(tokens.conditions.standard.enabled.containerColor, 'light', cupertino));
  });

  test('cupertino: a press on the bar dims it (its dim feedback and its own pressed opacity), with no state layer', async () => {
    expect(cupertino.behavior.pressedFeedback).toBe('dim');
    await mount(cupertino);
    await fireEvent(q('bar')!, 'pressIn');
    expect(viewStyle(q('bar')!)).toMatchObject({ opacity: cupertino.components.search.pressedOpacity, backgroundColor: painted(cupertino.components.search.conditions.standard.enabled.containerColor, 'light', cupertino) });
    await fireEvent(q('bar')!, 'pressOut');
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, cupertino.motion.duration.pressHold + 30));
    });
  });
});

describe('preset fixtures (light scheme)', () => {
  // One representative fixture per preset — the docked search, where the bar, the clear button, the view's
  // surface and elevation and the suggestion rows all show.
  describeFixtureBaselines(searchSubject, { systems: [m3Like, cupertino], fixtures: ['docked'] });
});
