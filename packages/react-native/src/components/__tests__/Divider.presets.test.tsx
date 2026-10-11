// The shipped presets drive the same Divider with other values — "design systems differ in values, never in tokens" —
// with no preset-specific code. Expected values are READ FROM THE SYSTEM INSTANCE;
// a literal appears only where a preset's value is pinned on purpose.
import { render, screen } from '@testing-library/react-native';
import { View } from 'react-native';
import { cupertino } from '../../generated/systems/cupertino';
import { m3ExpressiveLike } from '../../generated/systems/m3-expressive-like';
import { m3Like } from '../../generated/systems/m3-like';
import type { TanreiSystem } from '../../generated/vocabulary';
import { SHIPPED_SYSTEMS, describeFixtureBaselines, describeSharedVocabulary, painted, settleMotion, viewStyle } from '../../testing/harness';
import { TanreiProvider } from '../../theme/TanreiProvider';
import { Divider } from '../Divider';
import { dividerSubject } from './Divider.subject';

const ID = 'divider';
const line = () => screen.getByTestId(`${ID}.line`, { includeHiddenElements: true });
const host = () => screen.getByTestId(ID, { includeHiddenElements: true });

settleMotion();

describe('every shipped system values the Divider vocabulary', () => {
  describeSharedVocabulary(dividerSubject);
});

describe.each(SHIPPED_SYSTEMS.map((system) => [system.id, system] as const))('%s drives the Divider', (_id, system: TanreiSystem) => {
  const tokens = system.components.divider;

  test('its own line color, thickness and inset reach the line', async () => {
    await render(
      <TanreiProvider theme="light" system={system}>
        <View>
          <Divider testID={ID} inset="both" />
        </View>
      </TanreiProvider>,
    );
    expect(viewStyle(host()).height).toBe(tokens.lineThickness);
    expect(viewStyle(line())).toMatchObject({ start: tokens.lineInset, end: tokens.lineInset, backgroundColor: painted(tokens.lineColor, 'light', system) });
  });
});

describe('the presets\' dividers', () => {
  test('m3-like: a 1 dp line in outline-variant with a 16 dp inset — the defaults', () => {
    expect(m3Like.components.divider).toEqual({ lineColor: { kind: 'role', role: 'outlineVariant' }, lineThickness: 1, lineInset: 16 });
  });

  test('m3-expressive-like inherits m3-like', () => {
    expect(m3ExpressiveLike.components.divider).toEqual(m3Like.components.divider);
  });

  test('cupertino: the separator gray (outline-variant), a 16 pt inset, 1 pt thick (the device-pixel hairline is a recorded mimicry gap)', () => {
    expect(cupertino.components.divider).toEqual({ lineColor: { kind: 'role', role: 'outlineVariant' }, lineThickness: 1, lineInset: 16 });
  });
});

describe('preset fixtures (light scheme)', () => {
  // One representative fixture per preset — the inset list divider, where the line's color and inset show.
  describeFixtureBaselines(dividerSubject, { systems: [m3Like, cupertino], fixtures: ['horizontal-inset-start'] });
});
