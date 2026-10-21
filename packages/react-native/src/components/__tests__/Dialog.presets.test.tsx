// The shipped presets drive the same Dialog with other values — "design systems differ in values, never in tokens" —
// with no preset-specific code. Expected values are READ FROM THE SYSTEM INSTANCE;
// a literal appears only where a preset's value is pinned on purpose.
import { render, screen } from '@testing-library/react-native';
import { Dimensions, View } from 'react-native';
import { cupertino } from '../../generated/systems/cupertino';
import { m3Like } from '../../generated/systems/m3-like';
import type { TanreiColorRole, TanreiSystem } from '../../generated/vocabulary';
import { describeFixtureBaselines, describeSharedVocabulary, settleMotion, textStyle, viewStyle } from '../../testing/harness';
import { formatColor } from '../../theme/paint';
import { TanreiProvider, createTanreiTheme } from '../../theme/TanreiProvider';
import { DialogSurface } from '../Dialog';
import { dialogSubject } from './Dialog.subject';

const ID = 'dlg';
const role = (system: TanreiSystem, name: TanreiColorRole) => formatColor((system.colors as TanreiSystem['colors']).light[name]!);
const part = (name: string) => screen.getByTestId(name ? `${ID}.${name}` : ID, { includeHiddenElements: true });
const mount = (system: TanreiSystem) =>
  render(
    <TanreiProvider theme="light" system={system}>
      <View style={{ width: 480, height: 640 }}>
        <DialogSurface testID={ID} headline="Discard draft?" supportingText="The message will be deleted." />
      </View>
    </TanreiProvider>,
  );

const WINDOW = Dimensions.get('window');
beforeAll(() => {
  Dimensions.set({ window: { ...WINDOW, fontScale: 1 }, screen: { ...WINDOW, fontScale: 1 } });
});
afterAll(() => {
  Dimensions.set({ window: WINDOW, screen: WINDOW });
});
settleMotion();

describe('every shipped system values the Dialog vocabulary', () => {
  describeSharedVocabulary(dialogSubject);
});

describe('m3-like drives the Dialog', () => {
  const system: TanreiSystem = m3Like;
  const tokens = system.components.dialog;

  test('surface-container-high at corner.extra-large (28), the headline in heading-3, over the scrim role', async () => {
    expect(tokens).toMatchObject({ containerShape: system.shape.extraLarge, headlineTypescale: 'heading3' });
    expect(system.shape.extraLarge).toBe(28);
    await mount(system);
    expect(viewStyle(part(''))).toMatchObject({ backgroundColor: role(system, 'surfaceContainerHigh'), borderRadius: 28 });
    expect(textStyle(part('headline')).fontSize).toBe(createTanreiTheme(system, 'light').text('heading3').fontSize);
    expect(viewStyle(part('scrim')).backgroundColor).toBe(role(system, 'scrim'));
  });
});

describe('cupertino drives the Dialog', () => {
  const system: TanreiSystem = cupertino;
  const tokens = system.components.dialog;

  test('surface-container-high, 270 wide (its minimum is its maximum), the message in on-surface, the continuous corner', async () => {
    expect(tokens).toMatchObject({ containerMinWidth: 270, containerMaxWidth: 270 });
    await mount(system);
    expect(viewStyle(part(''))).toMatchObject({ backgroundColor: role(system, 'surfaceContainerHigh'), minWidth: 270, maxWidth: 270, borderCurve: 'continuous' });
    expect(textStyle(part('supporting-text')).color).toBe(role(system, 'onSurface'));
  });
});

describe('preset fixtures (light scheme)', () => {
  // One representative fixture per preset — the basic dialog, where the scrim, the container, the headline
  // and the supporting text all show.
  describeFixtureBaselines(dialogSubject, { systems: [m3Like, cupertino], fixtures: ['basic'] });
});
