// The shipped presets drive the same Badge with other values — "design systems differ in values, never in tokens" —
// with no preset-specific code. Expected values are READ FROM THE SYSTEM INSTANCE;
// a literal appears only where a preset's value is pinned on purpose.
import { render, screen } from '@testing-library/react-native';
import { cupertino } from '../../generated/systems/cupertino';
import { m3Like } from '../../generated/systems/m3-like';
import { tanrei } from '../../generated/systems/tanrei';
import type { TanreiColorRole, TanreiSystem } from '../../generated/vocabulary';
import { describeFixtureBaselines, describeSharedVocabulary, settleMotion, textStyle, viewStyle } from '../../testing/harness';
import { formatColor } from '../../theme/paint';
import { createTanreiTheme, TanreiProvider } from '../../theme/TanreiProvider';
import { Badge, type BadgeProps } from '../Badge';
import { badgeSubject } from './Badge.subject';

const ID = 'badge';
const part = (name: string) => screen.queryByTestId(`${ID}.${name}`, { includeHiddenElements: true });
const role = (system: TanreiSystem, name: TanreiColorRole) => formatColor(system.colors.light[name]!);
const mount = (system: TanreiSystem, props: Partial<BadgeProps>) =>
  render(
    <TanreiProvider theme="light" system={system}>
      <Badge testID={ID} label="Unread" {...props}>
        notifications
      </Badge>
    </TanreiProvider>,
  );

settleMotion();

describe('every shipped system values the Badge vocabulary', () => {
  describeSharedVocabulary(badgeSubject);
});

describe.each([
  ['m3-like', m3Like],
] as const)('%s drives the Badge', (_id, system) => {
  const tokens = system.components.badge;

  test('Material\'s badge: the error color, on-error numbers in caption, no outline', async () => {
    await mount(system, { count: 3 });
    expect(viewStyle(part('container')!)).toMatchObject({ backgroundColor: role(system, 'error'), minHeight: 16, minWidth: 16 });
    expect(textStyle(part('label')!)).toMatchObject({ ...createTanreiTheme(system, 'light').text('caption'), color: role(system, 'onError') });
    expect(tokens.labelTypescale).toBe('caption');
    // outline.color is transparent: no outline element at all.
    expect(part('outline')).toBeNull();
  });

  test('its dot keeps Tanrei\'s 6, in the error color, with no outline', async () => {
    await mount(system, {});
    expect(viewStyle(part('dot')!)).toMatchObject({ width: 6, height: 6, backgroundColor: role(system, 'error') });
    expect(part('outline')).toBeNull();
  });
});

describe('cupertino drives the Badge', () => {
  const system: TanreiSystem = cupertino;
  const tokens = system.components.badge;

  test('the system red, 18 high with 6 of padding, no outline', async () => {
    await mount(system, { count: 42 });
    expect([tokens.containerHeight, tokens.containerPaddingInline]).toEqual([18, 6]);
    expect(viewStyle(part('container')!)).toMatchObject({ backgroundColor: role(system, 'error'), minHeight: 18, minWidth: 18, paddingStart: 6, paddingEnd: 6 });
    expect(textStyle(part('label')!)).toMatchObject({ ...createTanreiTheme(system, 'light').text('labelSmall'), color: role(system, 'onError') });
    expect(part('outline')).toBeNull();
    // …and those are this system's values, not the default system's.
    expect(tokens.containerHeight).not.toBe(tanrei.components.badge.containerHeight);
  });
});

describe('preset fixtures (light scheme)', () => {
  // One representative fixture per preset — a two-digit count, where the pill, its color and its type show.
  describeFixtureBaselines(badgeSubject, { systems: [m3Like, cupertino], fixtures: ['count-double'] });
});
