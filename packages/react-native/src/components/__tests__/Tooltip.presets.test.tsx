// The shipped presets drive the same Tooltip with other values — "design systems differ in values, never in tokens" —
// with no preset-specific code. Expected values are READ FROM THE SYSTEM INSTANCE;
// a literal appears only where a preset's value is pinned on purpose.
import { render, screen } from '@testing-library/react-native';
import { Dimensions } from 'react-native';
import { cupertino } from '../../generated/systems/cupertino';
import { m3Like } from '../../generated/systems/m3-like';
import type { TanreiColorRole, TanreiSystem } from '../../generated/vocabulary';
import { describeFixtureBaselines, describeSharedVocabulary, settleMotion, textStyle, viewStyle } from '../../testing/harness';
import { formatColor } from '../../theme/paint';
import { TanreiProvider } from '../../theme/TanreiProvider';
import { IconButton } from '../IconButton';
import { Tooltip, type TooltipVariant } from '../Tooltip';
import { tooltipSubject } from './Tooltip.subject';

const ID = 'tip';
const role = (system: TanreiSystem, name: TanreiColorRole) => formatColor((system.colors as TanreiSystem['colors']).light[name]!);
const part = (name: string) => screen.getByTestId(`${ID}.${name}`, { includeHiddenElements: true });
const mount = (system: TanreiSystem, variant: TooltipVariant = 'plain') =>
  render(
    <TanreiProvider theme="light" system={system}>
      <Tooltip testID={ID} variant={variant} title="Storage" text="Files in the trash still count." open inline>
        <IconButton accessibilityLabel="Info">info</IconButton>
      </Tooltip>
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
beforeEach(() => {
  // The anchor icon button's selected-fill report and the plain tooltip's ignored title are tested elsewhere.
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

describe('every shipped system values the Tooltip vocabulary', () => {
  describeSharedVocabulary(tooltipSubject);
});

describe('m3-like drives the Tooltip', () => {
  const system: TanreiSystem = m3Like;
  const tokens = system.components.tooltip;

  test('the plain tooltip at corner.extra-small (4) on the inverse surface', async () => {
    expect(tokens.plainContainerShape).toBe(system.shape.extraSmall);
    expect(system.shape.extraSmall).toBe(4);
    await mount(system);
    expect(viewStyle(part('container'))).toMatchObject({ borderRadius: 4, backgroundColor: role(system, 'inverseSurface') });
  });

  test('the rich tooltip on surface-container with its title and text in on-surface-variant', async () => {
    await mount(system, 'rich');
    expect(viewStyle(part('container')).backgroundColor).toBe(role(system, 'surfaceContainer'));
    expect(textStyle(part('title')).color).toBe(role(system, 'onSurfaceVariant'));
    expect(textStyle(part('text')).color).toBe(role(system, 'onSurfaceVariant'));
  });
});

describe('cupertino drives the Tooltip', () => {
  const system: TanreiSystem = cupertino;
  const tokens = system.components.tooltip;

  test('it waits extra-long4 (1000 ms) before showing, as Apple\'s help tags wait', () => {
    expect(tokens.motionShowDelay).toBe(system.motion.duration.extraLong4);
    expect(tokens.motionShowDelay).toBe(1000);
  });

  test('the plain tooltip at corner.small (8 there) with the continuous corner', async () => {
    expect(tokens.plainContainerShape).toBe(system.shape.small);
    await mount(system);
    expect(viewStyle(part('container'))).toMatchObject({ borderRadius: system.shape.small, borderCurve: 'continuous' });
  });
});

describe('preset fixtures (light scheme)', () => {
  // One representative fixture per preset — the rich tooltip, where the title, the text, the raised
  // surface and its elevation all show.
  describeFixtureBaselines(tooltipSubject, { systems: [m3Like, cupertino], fixtures: ['rich'] });
});
