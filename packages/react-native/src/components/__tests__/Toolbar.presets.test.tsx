// The shipped presets drive the same Toolbar with other values — "design systems differ in values, never in tokens" —
// with no preset-specific code. Expected values are READ FROM THE SYSTEM INSTANCE;
// a literal appears only where a preset's value is pinned on purpose.
import { render, screen } from '@testing-library/react-native';
import { Dimensions } from 'react-native';
import { cupertino } from '../../generated/systems/cupertino';
import { m3Like } from '../../generated/systems/m3-like';
import { tanrei } from '../../generated/systems/tanrei';
import type { TanreiSystem } from '../../generated/vocabulary';
import { describeFixtureBaselines, describeSharedVocabulary, painted, settleMotion, viewStyle } from '../../testing/harness';
import { TanreiProvider } from '../../theme/TanreiProvider';
import { IconButton } from '../IconButton';
import { Toolbar, type ToolbarProps } from '../Toolbar';
import { toolbarSubject } from './Toolbar.subject';

const ID = 'toolbar';
const part = (name: string) => screen.queryByTestId(`${ID}.${name}`, { includeHiddenElements: true });
const content = () => viewStyle({ props: { style: part('scroll')!.props.contentContainerStyle } } as never);
const mount = (system: TanreiSystem, props: Partial<ToolbarProps> = {}) =>
  render(
    <TanreiProvider theme="light" system={system}>
      <Toolbar testID={ID} accessibilityLabel="Actions" {...props}>
        <IconButton accessibilityLabel="Archive">archive</IconButton>
        <IconButton accessibilityLabel="Delete">delete</IconButton>
      </Toolbar>
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

describe('every shipped system values the Toolbar vocabulary', () => {
  describeSharedVocabulary(toolbarSubject);
});

describe('the presets drive the Toolbar', () => {
  test('m3-like draws the default\'s toolbar: it takes none of Material\'s values for it, and the gaps the default widened for its 48 targets stay where they were', () => {
    const { docked, floating } = tanrei.components.toolbar.variants;
    const gap = m3Like.measure.target.spacing;
    expect(m3Like.components.toolbar).toEqual({ ...tanrei.components.toolbar, variants: { ...tanrei.components.toolbar.variants, docked: { ...docked, containerGap: gap }, floating: { ...floating, containerGap: gap } } });
  });

  test('cupertino (UIToolbar): docked on surface-container-low, 44 tall, with the outline-variant top edge', async () => {
    const docked = cupertino.components.toolbar.variants.docked;
    expect(docked).toMatchObject({ containerColor: { kind: 'role', role: 'surfaceContainerLow' }, containerSize: 44, containerPaddingInline: 8, outlineColor: { kind: 'role', role: 'outlineVariant' } });
    await mount(cupertino);
    expect(viewStyle(screen.getByTestId(ID)).backgroundColor).toBe(painted(docked.containerColor, 'light', cupertino));
    expect(content().minHeight).toBe(44);
    expect(viewStyle(part('outline')!).backgroundColor).toBe(painted(docked.outlineColor, 'light', cupertino));
  });

  test('cupertino: floating on surface-container-lowest at its own level2, a pill with the continuous corner where the OS draws one', async () => {
    const floating = cupertino.components.toolbar.variants.floating;
    expect(floating).toMatchObject({ containerColor: { kind: 'role', role: 'surfaceContainerLowest' }, containerElevation: 'level2', containerShape: cupertino.shape.full, containerSize: 48 });
    await mount(cupertino, { variant: 'floating' });
    const style = viewStyle(screen.getByTestId(ID));
    expect(style).toMatchObject({ backgroundColor: painted(floating.containerColor, 'light', cupertino), borderRadius: floating.containerShape, boxShadow: expect.any(Array) });
    expect(cupertino.shape.cornerSmoothing).toBeGreaterThan(0);
  });

  test('in every shipped system docked and floating differ at rest (elevation and corners at least)', () => {
    for (const system of [tanrei, m3Like, cupertino]) {
      const { docked, floating } = system.components.toolbar.variants;
      expect(docked.containerElevation).not.toBe(floating.containerElevation);
      expect(docked.containerShape).not.toBe(floating.containerShape);
    }
  });
});

describe('preset fixtures (light scheme)', () => {
  // One representative fixture per preset — the floating toolbar, where the fill, the elevation, the pill
  // corners and a selected toggle all show.
  describeFixtureBaselines(toolbarSubject, { systems: [m3Like, cupertino], fixtures: ['floating'] });
});
