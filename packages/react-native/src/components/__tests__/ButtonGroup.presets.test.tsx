// The shipped presets drive the same ButtonGroup with other values — "design systems differ in values, never in
// tokens" — with no preset-specific code. Expected values are READ FROM THE SYSTEM INSTANCE;
// a literal appears only where a preset's value is pinned on purpose.
import { render, screen } from '@testing-library/react-native';
import { Dimensions } from 'react-native';
import { cupertino } from '../../generated/systems/cupertino';
import { m3Like } from '../../generated/systems/m3-like';
import { tanrei } from '../../generated/systems/tanrei';
import type { TanreiSystem } from '../../generated/vocabulary';
import { describeFixtureBaselines, describeSharedVocabulary, settleMotion, viewStyle } from '../../testing/harness';
import { TanreiProvider } from '../../theme/TanreiProvider';
import { Button } from '../Button';
import { ButtonGroup } from '../ButtonGroup';
import { buttonGroupSubject } from './ButtonGroup.subject';

const mount = (system: TanreiSystem) =>
  render(
    <TanreiProvider theme="light" system={system}>
      <ButtonGroup testID="group" variant="connected">
        {['Cut', 'Copy', 'Paste'].map((label, i) => (
          <Button key={label} testID={`item.${i}`} variant="outlined">
            {label}
          </Button>
        ))}
      </ButtonGroup>
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

describe('every shipped system values the ButtonGroup vocabulary', () => {
  describeSharedVocabulary(buttonGroupSubject);
});

describe('the presets drive the ButtonGroup', () => {
  // Material 3's pressed widening, its round selected button and its per-size inner corners are the mimicry gap
  // button-group-press-expand.
  test('m3-like: inner corners of corner.small (8) against its full buttons; the gaps stay 8 and 2', async () => {
    const tokens = m3Like.components.buttonGroup;
    expect(tokens).toEqual({ standardGap: 8, connectedGap: 2, connectedInnerShape: m3Like.shape.small });
    expect(m3Like.shape.small).toBe(8);
    await mount(m3Like);
    expect(viewStyle(screen.getByTestId('item.0'))).toMatchObject({ borderTopStartRadius: m3Like.components.button.containerShape, borderTopEndRadius: 8 });
  });

  test('cupertino: no change — the default\'s connected gap and extra-small inner corners under its own buttons, and the standard gap the default widened for its 48 targets where it was', async () => {
    expect(cupertino.components.buttonGroup).toEqual({ ...tanrei.components.buttonGroup, standardGap: cupertino.measure.target.spacing, connectedInnerShape: cupertino.shape.extraSmall });
    await mount(cupertino);
    expect(viewStyle(screen.getByTestId('item.1'))).toMatchObject({ borderTopStartRadius: cupertino.shape.extraSmall, borderCurve: 'continuous' });
  });

  test('the inner corner is tighter than the buttons\' own corners in every shipped system', () => {
    for (const system of [tanrei, m3Like, cupertino]) {
      expect(system.components.buttonGroup.connectedInnerShape).toBeLessThan(system.components.button.containerShape);
      expect(system.components.buttonGroup.connectedGap).toBeLessThan(system.components.buttonGroup.standardGap);
    }
  });
});

describe('preset fixtures (light scheme)', () => {
  // One representative fixture per preset — the connected icon buttons, where the joined shape, the inner
  // corners, the target width and a selected toggle all show.
  describeFixtureBaselines(buttonGroupSubject, { systems: [m3Like, cupertino], fixtures: ['connected-icon-buttons'] });
});
