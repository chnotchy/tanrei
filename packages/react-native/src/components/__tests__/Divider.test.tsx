// Divider — behaviour, accessibility, token binding and fixture baselines.
// Cases come from specs/divider.spec.json; every behaviour id is cited by the test that covers it.
import { render, screen } from '@testing-library/react-native';
import { PixelRatio, View } from 'react-native';
import { tanrei } from '../../generated/systems/tanrei';
import type { TanreiDividerTokens, TanreiPaint, TanreiScheme, TanreiSystem } from '../../generated/vocabulary';
import { describeFixtureBaselines, painted, settleMotion, viewStyle, withComponent, type Instance } from '../../testing/harness';
import { loadSpec } from '../../testing/spec';
import { resetLookupReports } from '../../theme/lookup';
import { TanreiProvider, type TanreiProviderProps } from '../../theme/TanreiProvider';
import { Divider, type DividerInset, type DividerOrientation, type DividerProps } from '../Divider';
import { dividerSubject } from './Divider.subject';

const spec = loadSpec('divider');
const tokens: TanreiDividerTokens = tanrei.components.divider;
const ID = 'divider';

/** The host, whether or not it is hidden from assistive technology (decorative is the default). */
const host = (): Instance => screen.getByTestId(ID, { includeHiddenElements: true });
const line = (): Instance => screen.getByTestId(`${ID}.line`, { includeHiddenElements: true });
const literal = (r: number, g: number, b: number, a = 1): TanreiPaint => ({ kind: 'literal', r, g, b, a });
const withDivider = (overrides: Partial<TanreiDividerTokens>, base: TanreiSystem = tanrei) => withComponent(base, 'divider', overrides);

function mount(props: Partial<DividerProps> = {}, provider: Omit<TanreiProviderProps, 'children'> = { theme: 'light' }) {
  return render(
    <TanreiProvider {...provider}>
      <View>
        <Divider testID={ID} {...props} />
      </View>
    </TanreiProvider>,
  );
}

/** Style keys of the line that name a physical left or right edge: there must be none (DIV-4). */
const physicalEdges = (style: object) => Object.keys(style).filter((key) => ['left', 'right', 'marginLeft', 'marginRight', 'paddingLeft', 'paddingRight'].includes(key));

settleMotion();
beforeEach(() => {
  resetLookupReports();
});

describe('spec contract', () => {
  test('the React Native mapping in the spec matches this implementation', () => {
    const platform = spec.platforms['react-native'];
    expect(platform.name).toBe(Divider.name);
    expect(platform.props).toEqual({ orientation: 'orientation', inset: 'inset', decorative: 'decorative' });
  });

  test('the enum values under test are exactly the spec values', () => {
    const values = (name: string) => spec.props.find((p) => p.name === name)?.values;
    expect(values('orientation')).toEqual(['horizontal', 'vertical'] satisfies DividerOrientation[]);
    expect(values('inset')).toEqual(['none', 'start', 'both'] satisfies DividerInset[]);
  });

  test('defaults follow the spec: horizontal, no inset, decorative', async () => {
    await mount();
    expect(viewStyle(host())).toEqual({ alignSelf: 'stretch', height: tokens.lineThickness });
    expect(viewStyle(line())).toMatchObject({ start: 0, end: 0, top: 0, bottom: 0 });
    expect(host().props.accessible).toBe(false);
  });
});

describe('behavior', () => {
  test.each([
    ['light', 'light'],
    ['dark', 'dark'],
  ] as const)('DIV-1: a horizontal divider is one line of line.thickness in line.color along the full inline size (%s)', async (_name, theme) => {
    const scheme: TanreiScheme = theme;
    await mount({}, { theme });
    // The full width of its container: stretched across the column, exactly the thickness high.
    expect(viewStyle(host())).toMatchObject({ alignSelf: 'stretch', height: tokens.lineThickness });
    expect(viewStyle(host()).width).toBeUndefined();
    expect(viewStyle(line())).toMatchObject({ position: 'absolute', top: 0, bottom: 0, start: 0, end: 0, backgroundColor: painted(tokens.lineColor, scheme) });
    // One line: the line is the only thing drawn.
    expect(viewStyle(host()).backgroundColor).toBeUndefined();
    expect(host().children).toHaveLength(1);
  });

  test('DIV-1: a vertical divider is one line along the full block size of its container', async () => {
    await mount({ orientation: 'vertical' });
    expect(viewStyle(host())).toEqual({ alignSelf: 'stretch', width: tokens.lineThickness });
    expect(viewStyle(line())).toMatchObject({ position: 'absolute', start: 0, end: 0, top: 0, bottom: 0, backgroundColor: painted(tokens.lineColor) });
  });

  test.each(['horizontal', 'vertical'] as const)('DIV-2: a %s divider takes exactly line.thickness across and adds no margin or padding of its own', async (orientation) => {
    await mount({ orientation });
    const style = viewStyle(host());
    expect(style[orientation === 'horizontal' ? 'height' : 'width']).toBe(tokens.lineThickness);
    const spacing = Object.keys(style).filter((key) => /^(margin|padding)/.test(key));
    expect(spacing).toEqual([]);
    for (const inset of ['start', 'both'] as const) {
      await screen.rerender(
        <TanreiProvider theme="light">
          <Divider testID={ID} orientation={orientation} inset={inset} />
        </TanreiProvider>,
      );
      expect(Object.keys(viewStyle(host())).filter((key) => /^(margin|padding)/.test(key))).toEqual([]);
      expect(Object.keys(viewStyle(line())).filter((key) => /^(margin|padding)/.test(key))).toEqual([]);
    }
  });

  test('DIV-2: layout overrides are the caller\'s (a margin in `style` is applied, never one of the divider\'s own)', async () => {
    await mount({ style: { marginVertical: 8 } });
    expect(viewStyle(host())).toMatchObject({ marginVertical: 8, height: tokens.lineThickness });
  });

  test.each([
    ['horizontal', 'start', { start: tokens.lineInset, end: 0, top: 0, bottom: 0 }],
    ['horizontal', 'both', { start: tokens.lineInset, end: tokens.lineInset, top: 0, bottom: 0 }],
    ['vertical', 'start', { top: tokens.lineInset, bottom: 0, start: 0, end: 0 }],
    ['vertical', 'both', { top: tokens.lineInset, bottom: tokens.lineInset, start: 0, end: 0 }],
  ] as const)('DIV-3: a %s divider with inset %s is shortened by line.inset there, and the inset stretch draws nothing', async (orientation, inset, placement) => {
    await mount({ orientation, inset });
    expect(viewStyle(line())).toMatchObject(placement);
    // The host itself draws nothing: the stretch the line leaves is empty.
    expect(viewStyle(host()).backgroundColor).toBeUndefined();
  });

  test('DIV-4: a horizontal inset is on the logical start (the right end in right-to-left); a vertical inset stays at the top', async () => {
    await mount({ inset: 'start' });
    expect(viewStyle(line())).toMatchObject({ start: tokens.lineInset, end: 0 });
    expect(physicalEdges(viewStyle(line()))).toEqual([]);
    await screen.rerender(
      <TanreiProvider theme="light">
        <View style={{ direction: 'rtl' }}>
          <Divider testID={ID} orientation="vertical" inset="start" />
        </View>
      </TanreiProvider>,
    );
    // Top and bottom do not change with the direction; start / end are both 0, so the line spans the thickness.
    expect(viewStyle(line())).toMatchObject({ top: tokens.lineInset, bottom: 0, start: 0, end: 0 });
    expect(physicalEdges(viewStyle(line()))).toEqual([]);
  });

  test('DIV-5: a decorative divider (the default) is hidden from assistive technology and not focusable', async () => {
    await mount();
    expect(screen.queryByTestId(ID)).toBeNull();
    expect(host().props).toMatchObject({ accessible: false, accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants', focusable: false });
    expect(host().props.role).toBeUndefined();
    expect(screen.queryByRole('separator')).toBeNull();
  });

  test.each(['horizontal', 'vertical'] as const)('DIV-6: decorative false exposes a %s separator with no accessible name, never focusable', async (orientation) => {
    await mount({ orientation, decorative: false });
    const separator = screen.getByRole('separator');
    expect(separator).toBe(host());
    expect(separator.props).toMatchObject({ accessible: true, focusable: false });
    expect(separator.props.accessibilityLabel).toBeUndefined();
    expect(separator.props['aria-label']).toBeUndefined();
    expect(separator.props.importantForAccessibility).toBeUndefined();
    // React Native has no orientation semantics (no aria-orientation, no native trait): the orientation is what is
    // drawn.
    expect(viewStyle(separator)[orientation === 'horizontal' ? 'height' : 'width']).toBe(tokens.lineThickness);
  });

  test.each([
    ['orientation', { orientation: 'diagonal' }, { orientation: 'horizontal' }, 'Divider orientation "diagonal" is not defined; using "horizontal"'],
    ['inset', { inset: 'end' }, { inset: 'none' }, 'Divider inset "end" is not defined; using "none"'],
  ] as const)('DIV-7: an unknown %s renders as the default and is reported in development builds', async (_prop, unknown, fallback, message) => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const expected = await mount(fallback as Partial<DividerProps>);
    const drawn = JSON.stringify(expected.toJSON());
    await expected.unmount();
    expect(warn).not.toHaveBeenCalled();
    const view = await mount(unknown as unknown as Partial<DividerProps>);
    expect(JSON.stringify(view.toJSON())).toBe(drawn);
    expect(warn.mock.calls.map(([text]) => String(text))).toEqual([expect.stringContaining(message)]);
  });

  test('DIV-7: a release build renders the default silently', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const dev = (globalThis as { __DEV__?: boolean }).__DEV__;
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
    try {
      await mount({ orientation: 'diagonal' as DividerOrientation });
      expect(viewStyle(host())).toMatchObject({ height: tokens.lineThickness });
      expect(warn).not.toHaveBeenCalled();
    } finally {
      (globalThis as { __DEV__?: boolean }).__DEV__ = dev;
    }
  });

  test.each([
    [2, 1, 1],
    [3, 1, 1],
    [3, 1.2, 4 / 3],
    [3, 0.2, 1 / 3],
    [2, 0.5, 0.5],
    [2, 0.1, 0.5],
    [1, 0.4, 1],
  ])('DIV-8: at pixel ratio %d a line.thickness of %d is drawn %d thick — whole device pixels, at least one', async (ratio, thickness, drawn) => {
    jest.spyOn(PixelRatio, 'get').mockReturnValue(ratio);
    await mount({}, { theme: 'light', system: withDivider({ lineThickness: thickness }) });
    expect(viewStyle(host()).height).toBeCloseTo(drawn, 10);
    expect(Number.isInteger(Math.round(drawn * ratio * 1e9) / 1e9)).toBe(true);
    expect(drawn * ratio).toBeGreaterThanOrEqual(1 - 1e-9);
  });

  test('DIV-8: the inset is snapped to the device pixel grid too, so the line starts on a pixel edge', async () => {
    jest.spyOn(PixelRatio, 'get').mockReturnValue(3);
    await mount({ inset: 'both' }, { theme: 'light', system: withDivider({ lineInset: 16.1 }) });
    expect(viewStyle(line()).start).toBeCloseTo(16, 10);
    expect(viewStyle(line()).end).toBeCloseTo(16, 10);
  });
});

describe('the system drives rendering', () => {
  test('changed line tokens reach the line: color, thickness and inset', async () => {
    const system = withDivider({ lineColor: literal(10, 20, 30), lineThickness: 3, lineInset: 24 });
    await mount({ inset: 'both' }, { theme: 'light', system });
    expect(viewStyle(host()).height).toBe(3);
    expect(viewStyle(line())).toMatchObject({ start: 24, end: 24, backgroundColor: painted(literal(10, 20, 30)) });
  });

  test('a line color that resolves to nothing draws nothing (no backgroundColor), and the divider still takes its thickness', async () => {
    await mount({}, { theme: 'light', system: withDivider({ lineColor: { kind: 'none' } }) });
    expect(viewStyle(line()).backgroundColor).toBeUndefined();
    expect(viewStyle(host()).height).toBe(tokens.lineThickness);
  });
});

describe('accessibility', () => {
  test('the line itself is never an accessibility element: only the host is exposed (as a separator) or hidden', async () => {
    await mount({ decorative: false });
    expect(line().props.accessible).toBeUndefined();
    expect(line().props.role).toBeUndefined();
    expect(screen.getAllByRole('separator')).toHaveLength(1);
  });

  test('the caller cannot make a decorative divider focusable or exposed by passing props through', async () => {
    await mount({ focusable: true, accessible: true } as Partial<DividerProps>);
    expect(host().props).toMatchObject({ focusable: false, accessible: false, importantForAccessibility: 'no-hide-descendants' });
  });
});

describe('fixtures', () => {
  describeFixtureBaselines(dividerSubject);

  test('the fixtures cover each orientation, each inset and the separator', () => {
    const covered = (name: string) => new Set(spec.fixtures.map((fixture) => fixture.props[name] ?? spec.props.find((p) => p.name === name)?.default));
    expect([...covered('orientation')].sort()).toEqual(['horizontal', 'vertical']);
    expect([...covered('inset')].sort()).toEqual(['both', 'none', 'start']);
    expect(covered('decorative')).toEqual(new Set([true, false]));
  });
});
