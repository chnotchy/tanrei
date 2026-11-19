// The shipped presets drive the same Snackbar with other values — "design systems differ in values, never in tokens"
// — with no preset-specific code. Expected values are READ FROM THE SYSTEM INSTANCE;
// a literal appears only where a preset's value is pinned on purpose.
import { render, screen } from '@testing-library/react-native';
import { Dimensions } from 'react-native';
import { cupertino } from '../../generated/systems/cupertino';
import { m3Like } from '../../generated/systems/m3-like';
import type { TanreiColorRole, TanreiSystem } from '../../generated/vocabulary';
import { describeFixtureBaselines, describeSharedVocabulary, settleMotion, textStyle, viewStyle } from '../../testing/harness';
import { formatColor } from '../../theme/paint';
import { TanreiProvider } from '../../theme/TanreiProvider';
import { Snackbar } from '../Snackbar';
import { snackbarSubject } from './Snackbar.subject';

const ID = 'snk';
const role = (system: TanreiSystem, name: TanreiColorRole) => formatColor((system.colors as TanreiSystem['colors']).light[name]!);
const part = (name: string) => screen.getByTestId(name ? `${ID}.${name}` : ID, { includeHiddenElements: true });
const mount = (system: TanreiSystem) =>
  render(
    <TanreiProvider theme="light" system={system}>
      <Snackbar testID={ID} message="Conversation archived" actionLabel="Undo" closable closeLabel="Close" />
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

describe('every shipped system values the Snackbar vocabulary', () => {
  describeSharedVocabulary(snackbarSubject);
});

describe('m3-like drives the Snackbar', () => {
  const system: TanreiSystem = m3Like;
  const tokens = system.components.snackbar;

  test('corner.extra-small, 344 to 672 wide, on the inverse surface with the action in inverse-primary', async () => {
    expect(tokens).toMatchObject({ containerShape: system.shape.extraSmall, containerMinWidth: 344, containerMaxWidth: 672 });
    await mount(system);
    expect(viewStyle(part(''))).toMatchObject({ borderRadius: system.shape.extraSmall, minWidth: 344, maxWidth: 672, backgroundColor: role(system, 'inverseSurface') });
    expect(textStyle(part('action.label')).color).toBe(role(system, 'inversePrimary'));
  });

  test('SNK-6: m3-like answers a press with a ripple', () => {
    expect(system.behavior.pressedFeedback).toBe('ripple');
  });
});

describe('cupertino drives the Snackbar', () => {
  const system: TanreiSystem = cupertino;
  const tokens = system.components.snackbar;

  test('a light banner — surface-bright at corner.medium with the continuous corner, on-surface text, the action in the tint, the close glyph in on-surface-variant', async () => {
    expect(tokens.containerShape).toBe(system.shape.medium);
    await mount(system);
    expect(viewStyle(part(''))).toMatchObject({ backgroundColor: role(system, 'surfaceBright'), borderRadius: system.shape.medium, borderCurve: 'continuous' });
    expect(textStyle(part('message')).color).toBe(role(system, 'onSurface'));
    expect(textStyle(part('action.label')).color).toBe(role(system, 'primary'));
    expect(textStyle(part('close.glyph')).color).toBe(role(system, 'onSurfaceVariant'));
  });
});

describe('preset fixtures (light scheme)', () => {
  // One representative fixture per preset — the message with the action and the close button, where the
  // bar, both controls and their colors all show.
  describeFixtureBaselines(snackbarSubject, { systems: [m3Like, cupertino], fixtures: ['action-closable'] });
});
