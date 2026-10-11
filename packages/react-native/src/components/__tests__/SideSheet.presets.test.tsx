// The shipped presets drive the same SideSheet with other values — "design systems differ in values, never in tokens" —
// with no preset-specific code. Expected values are READ FROM THE SYSTEM INSTANCE;
// a literal appears only where a preset's value is pinned on purpose.
import { render, screen } from '@testing-library/react-native';
import { Dimensions, View } from 'react-native';
import { cupertino } from '../../generated/systems/cupertino';
import { m3ExpressiveLike } from '../../generated/systems/m3-expressive-like';
import { m3Like } from '../../generated/systems/m3-like';
import { tanrei } from '../../generated/systems/tanrei';
import type { TanreiColorRole, TanreiSystem } from '../../generated/vocabulary';
import { describeFixtureBaselines, describeSharedVocabulary, settleMotion, textStyle, viewStyle } from '../../testing/harness';
import { formatColor } from '../../theme/paint';
import { TanreiProvider, createTanreiTheme } from '../../theme/TanreiProvider';
import { SideSheetSurface } from '../SideSheet';
import { sideSheetSubject } from './SideSheet.subject';

const ID = 'side';
const role = (system: TanreiSystem, name: TanreiColorRole) => formatColor((system.colors as TanreiSystem['colors']).light[name]!);
const part = (name: string) => screen.getByTestId(name ? `${ID}.${name}` : ID, { includeHiddenElements: true });
const mount = (system: TanreiSystem, variant: 'standard' | 'modal' = 'modal') =>
  render(
    <TanreiProvider theme="light" system={system}>
      <View style={{ width: 720, height: 480 }}>
        <SideSheetSurface testID={ID} variant={variant} headline="Filters" closable closeLabel="Close filters">
          Show results from the last 30 days.
        </SideSheetSurface>
      </View>
    </TanreiProvider>,
  );

const WINDOW = Dimensions.get('window');
beforeAll(() => {
  Dimensions.set({ window: { ...WINDOW, width: 720, height: 480, fontScale: 1 }, screen: { ...WINDOW, width: 720, height: 480, fontScale: 1 } });
});
afterAll(() => {
  Dimensions.set({ window: WINDOW, screen: WINDOW });
});
settleMotion();

describe('every shipped system values the SideSheet vocabulary', () => {
  describeSharedVocabulary(sideSheetSubject);
});

describe('m3-like drives the SideSheet', () => {
  const system: TanreiSystem = m3Like;
  const tokens = system.components.sideSheet;

  test('the modal sheet at its level1 (a real shadow), the headline in heading-4 and on-surface-variant; the width and the standard sheet\'s edge as the default', async () => {
    expect(tokens.variants.modal.containerElevation).toBe('level1');
    expect(tokens).toMatchObject({ headlineTypescale: 'heading4', containerWidth: tanrei.components.sideSheet.containerWidth });
    await mount(system);
    const theme = createTanreiTheme(system, 'light');
    expect(theme.elevation('level1').boxShadow.length).toBeGreaterThan(0);
    expect(viewStyle(part(''))).toMatchObject({ boxShadow: theme.elevation('level1').boxShadow, borderTopStartRadius: tokens.variants.modal.containerShape });
    expect(textStyle(part('headline'))).toMatchObject({ color: role(system, 'onSurfaceVariant'), fontSize: theme.text('heading4').fontSize });
  });
});

describe('m3-expressive-like drives the SideSheet', () => {
  test('it inherits m3-like\'s side sheet', () => {
    expect(m3ExpressiveLike.components.sideSheet).toEqual(m3Like.components.sideSheet);
  });
});

describe('cupertino drives the SideSheet', () => {
  const system: TanreiSystem = cupertino;

  test('no change of its own: the standard sheet is the inspector column the defaults draw (the surface, a hairline edge); the modal corners are continuous', async () => {
    const own = system.components.sideSheet;
    expect(own.variants.standard).toEqual(tanrei.components.sideSheet.variants.standard);
    const view = await mount(system, 'standard');
    expect(viewStyle(part(''))).toMatchObject({ backgroundColor: role(system, 'surface') });
    expect(viewStyle(part('outline')).backgroundColor).toBe(role(system, 'outlineVariant'));
    await view.unmount();
    await mount(system);
    expect(viewStyle(part(''))).toMatchObject({ borderCurve: 'continuous', borderTopStartRadius: own.variants.modal.containerShape });
  });
});

describe('preset fixtures (light scheme)', () => {
  // One representative fixture per preset — the modal sheet, where the scrim, the container, its corners and
  // elevation, the header with the close button, the divider and the actions all show.
  describeFixtureBaselines(sideSheetSubject, { systems: [m3Like, cupertino], fixtures: ['modal'] });
});
