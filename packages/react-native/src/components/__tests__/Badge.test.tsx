// Badge — behaviour, accessibility, token binding and fixture baselines.
// Cases come from specs/badge.spec.json; every behaviour id is cited by the test that covers it.
import { fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, View } from 'react-native';
import { tanrei } from '../../generated/systems/tanrei';
import type { TanreiBadgeTokens, TanreiPaint, TanreiScheme, TanreiSystem } from '../../generated/vocabulary';
import { describeFixtureBaselines, painted, settleMotion, textStyle, viewStyle, withComponent, type Instance } from '../../testing/harness';
import { loadSpec } from '../../testing/spec';
import { createTanreiTheme, TanreiProvider, type TanreiProviderProps } from '../../theme/TanreiProvider';
import { Badge, badgeContent, type BadgeProps } from '../Badge';
import { IconButton } from '../IconButton';
import { badgeSubject } from './Badge.subject';

const spec = loadSpec('badge');
const tokens: TanreiBadgeTokens = tanrei.components.badge;
const ID = 'badge';
const FSI = '\u2068';
const PDI = '\u2069';

const hidden = { includeHiddenElements: true } as const;
const host = (): Instance => screen.getByTestId(ID);
const part = (name: string): Instance | null => screen.queryByTestId(`${ID}.${name}`, hidden);
const anchor = (): Instance => screen.getByRole('button', { name: 'Inbox' });
const literal = (r: number, g: number, b: number, a = 1): TanreiPaint => ({ kind: 'literal', r, g, b, a });
const withBadge = (overrides: Partial<TanreiBadgeTokens>, base: TanreiSystem = tanrei) => withComponent(base, 'badge', overrides);
/** The drawn label's text, without the directional isolates around it. */
const shownText = () => String(part('label')!.props.children).replace(FSI, '').replace(PDI, '');

/** A badge on an icon button named "Inbox" — the anchor the spec's accessibility notes describe. */
function mount(props: Partial<BadgeProps> = {}, provider: Omit<TanreiProviderProps, 'children'> = { theme: 'light' }, onPress?: () => void) {
  return render(
    <TanreiProvider {...provider}>
      <Badge testID={ID} {...props}>
        {props.children ?? (
          <IconButton accessibilityLabel="Inbox" onPress={onPress} testID="anchor">
            inbox
          </IconButton>
        )}
      </Badge>
    </TanreiProvider>,
  );
}

settleMotion();
let warn: jest.SpyInstance;
beforeEach(() => {
  warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
const badgeWarnings = () => warn.mock.calls.map(([message]) => String(message)).filter((message) => message.includes('Badge'));

describe('spec contract', () => {
  test('the React Native mapping in the spec matches this implementation', () => {
    const platform = spec.platforms['react-native'];
    expect(platform.name).toBe(Badge.name);
    expect(platform.props).toEqual({ count: 'count', max: 'max', label: 'label' });
  });

  test('defaults follow the spec: no count is the dot, max 999, no label', async () => {
    await mount({ label: 'New' });
    expect(part('dot')).not.toBeNull();
    expect(part('container')).toBeNull();
    expect(badgeContent(1000, 999).text).toBe('999+');
    expect(spec.props.find((p) => p.name === 'max')?.default).toBe(999);
  });
});

describe('behavior', () => {
  test.each([
    ['light', 'light'],
    ['dark', 'dark'],
  ] as const)('BDG-1: no count draws a circle of diameter dot.size in container.color with no label, its center dot.offset inside the top-end corner (%s)', async (_name, theme) => {
    const scheme: TanreiScheme = theme;
    await mount({ label: 'New messages' }, { theme });
    const reach = tokens.dotOffset - tokens.dotSize / 2;
    expect(viewStyle(part('dot')!)).toMatchObject({
      position: 'absolute',
      top: reach,
      end: reach,
      width: tokens.dotSize,
      height: tokens.dotSize,
      borderRadius: tokens.dotSize / 2,
      backgroundColor: painted(tokens.containerColor, scheme),
    });
    // The dot's center: dot.offset in from the end edge and from the top edge.
    expect(reach + tokens.dotSize / 2).toBe(tokens.dotOffset);
    expect(part('label')).toBeNull();
  });

  test('BDG-1: the dot is a circle whatever corners the container has', async () => {
    await mount({ label: 'New' }, { theme: 'light', system: withBadge({ containerShape: 1, dotSize: 8 }) });
    expect(viewStyle(part('dot')!)).toMatchObject({ width: 8, height: 8, borderRadius: 4 });
    expect(viewStyle(part('outline')!).borderRadius).toBe(4 + tokens.outlineWidth);
  });

  test.each([
    ['light', 'light'],
    ['dark', 'dark'],
  ] as const)('BDG-2: a count draws a pill at least container.height high and wide, with container.padding-inline, container.shape, container.color and a centered label (%s)', async (_name, theme) => {
    const scheme: TanreiScheme = theme;
    await mount({ count: 3 }, { theme });
    expect(viewStyle(part('container')!)).toMatchObject({
      minHeight: tokens.containerHeight,
      minWidth: tokens.containerHeight,
      paddingStart: tokens.containerPaddingInline,
      paddingEnd: tokens.containerPaddingInline,
      borderRadius: tokens.containerShape,
      backgroundColor: painted(tokens.containerColor, scheme),
      alignItems: 'center',
      justifyContent: 'center',
    });
    const expectedType = createTanreiTheme(tanrei, scheme).text(tokens.labelTypescale);
    expect(textStyle(part('label')!)).toMatchObject({ ...expectedType, color: painted(tokens.labelColor, scheme), textAlign: 'center' });
    expect(shownText()).toBe('3');
  });

  test('BDG-3: the center of the pill\'s leading circle sits container.offset inside the top-end corner; the pill grows toward the end', async () => {
    for (const system of [tanrei, withBadge({ containerOffset: 4, containerHeight: 20 })]) {
      const view = await mount({ count: 42 }, { theme: 'light', system });
      const { containerOffset, containerHeight } = system.components.badge;
      const style = viewStyle(part('container')!);
      // The pill's start edge is `offset + height / 2` before the anchor's end edge, its top `height / 2 - offset` above it:
      // the leading `height` square is centred `offset` inside the corner on both axes.
      expect(style).toMatchObject({ position: 'absolute', top: containerOffset - containerHeight / 2, start: '100%', marginStart: -(containerOffset + containerHeight / 2) });
      // Positioned by its start only: a longer count widens it toward the end, away from the anchor.
      expect(style.end).toBeUndefined();
      expect(style.width).toBeUndefined();
      await view.unmount();
    }
  });

  test.each([
    [3, undefined, '3'],
    [42, undefined, '42'],
    [999, undefined, '999'],
    [1000, undefined, '999+'],
    [1200, undefined, '999+'],
    [99, 99, '99'],
    [120, 99, '99+'],
    [5, 1, '1+'],
  ])('BDG-4: count %d with max %s shows "%s"', async (count, max, text) => {
    await mount({ count, ...(max === undefined ? {} : { max }) });
    expect(shownText()).toBe(text);
  });

  test('BDG-5: count 0 draws nothing, exposes nothing, and leaves the anchor exactly as it is without a badge', async () => {
    const onPress = jest.fn();
    const badged = await mount({ count: 0, label: 'No unread messages' }, { theme: 'light' }, onPress);
    for (const name of ['dot', 'container', 'label', 'outline']) expect(part(name)).toBeNull();
    // The anchor's rendered tree (functions dropped), inside the badge's box and alone.
    const tree = (json: unknown) => JSON.stringify(json);
    const withBadgeZero = tree((screen.toJSON() as { children: unknown[] }).children[0]);
    expect(anchor().props.accessibilityValue?.text).toBeUndefined();
    await badged.unmount();
    await render(
      <TanreiProvider theme="light">
        <IconButton accessibilityLabel="Inbox" onPress={onPress} testID="anchor">
          inbox
        </IconButton>
      </TanreiProvider>,
    );
    expect(tree(screen.toJSON())).toBe(withBadgeZero);
  });

  test.each([
    ['the dot', {}, 'dot'],
    ['the pill', { count: 3 }, 'container'],
  ] as const)('BDG-6: %s is ringed by outline.width of outline.color, outside its edge, without changing its size or place', async (_name, props, form) => {
    await mount({ label: 'New', ...props });
    const outline = part('outline')!;
    const reach = tokens.outlineWidth;
    expect(viewStyle(outline)).toMatchObject({ position: 'absolute', top: -reach, right: -reach, bottom: -reach, left: -reach, borderWidth: tokens.outlineWidth, borderColor: painted(tokens.outlineColor), pointerEvents: 'none' });
    // A ring grows the radius by its reach, so it follows the shape (the dot's is always a circle).
    expect(viewStyle(outline).borderRadius).toBe((form === 'dot' ? tokens.dotSize / 2 : tokens.containerShape) + reach);
    // The badge's own box is untouched: no border, same size and place as without an outline.
    const drawn = viewStyle(part(form)!);
    expect(drawn.borderWidth).toBeUndefined();
    await screen.rerender(
      <TanreiProvider theme="light" system={withBadge({ outlineColor: { kind: 'none' } })}>
        <Badge testID={ID} label="New" {...props}>
          <IconButton accessibilityLabel="Inbox">inbox</IconButton>
        </Badge>
      </TanreiProvider>,
    );
    expect(part('outline')).toBeNull();
    expect(viewStyle(part(form)!)).toEqual(drawn);
  });

  test('BDG-7: the badge takes no space, never changes its anchor, and takes no input — a press over it reaches the anchor', async () => {
    const onPress = jest.fn();
    await mount({ count: 3 }, { theme: 'light' }, onPress);
    // The box around the anchor has no padding, border or size of its own.
    expect(Object.keys(viewStyle(host())).sort()).toEqual(['alignSelf', 'flexDirection']);
    const badge = viewStyle(part('container')!);
    expect(badge).toMatchObject({ position: 'absolute', pointerEvents: 'none' });
    expect(part('container')!.props.focusable).toBeUndefined();
    await fireEvent.press(screen.getByTestId('anchor'));
    expect(onPress).toHaveBeenCalledTimes(1);
    // The dot, too.
    await screen.rerender(
      <TanreiProvider theme="light">
        <Badge testID={ID} label="New">
          <IconButton accessibilityLabel="Inbox" testID="anchor">
            inbox
          </IconButton>
        </Badge>
      </TanreiProvider>,
    );
    expect(viewStyle(part('dot')!)).toMatchObject({ position: 'absolute', pointerEvents: 'none' });
  });

  test('BDG-8: the drawn badge is hidden; label joins the anchor\'s accessible description after its own name', async () => {
    await mount({ count: 3, label: '3 unread' });
    expect(anchor().props.accessibilityValue).toEqual({ text: '3 unread' });
    expect(screen.getByRole('button', { name: 'Inbox' })).toBe(screen.getByTestId('anchor'));
    for (const name of ['container', 'label']) {
      expect(screen.queryByTestId(`${ID}.${name}`)).toBeNull();
      expect(part(name)).not.toBeNull();
    }
    expect(part('container')!.props).toMatchObject({ accessible: false, accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' });
    // The number is never read twice: nothing in the accessible tree carries "3" but the anchor's value.
    expect(screen.queryByText(`${FSI}3${PDI}`)).toBeNull();
  });

  test('BDG-8: without a label, the displayed text is the description (999+)', async () => {
    await mount({ count: 1200 });
    expect(anchor().props.accessibilityValue).toEqual({ text: '999+' });
  });

  test('BDG-8: a dot adds its label; an anchor\'s own value text comes first', async () => {
    await mount({ label: 'New messages' });
    expect(anchor().props.accessibilityValue).toEqual({ text: 'New messages' });
    await screen.rerender(
      <TanreiProvider theme="light">
        <Badge testID={ID} count={2} label="2 unread">
          <IconButton accessibilityLabel="Inbox" accessibilityValue={{ text: 'Work' }}>
            inbox
          </IconButton>
        </Badge>
      </TanreiProvider>,
    );
    expect(anchor().props.accessibilityValue).toEqual({ text: 'Work, 2 unread' });
  });

  test('BDG-8: a string anchor (the spec\'s fixtures) is the glyph at sys.icon.large in on-surface-variant, named by its glyph name and carrying the label as its value, never both; several nodes are grouped into one described element', async () => {
    await mount({ count: 3, label: '3 unread', children: 'notifications' });
    const glyph = screen.getByText('notifications');
    expect({ accessible: glyph.props.accessible, name: glyph.props.accessibilityLabel, value: glyph.props.accessibilityValue, scaling: glyph.props.allowFontScaling }).toEqual({
      accessible: true,
      name: 'notifications',
      value: { text: '3 unread' },
      scaling: false,
    });
    expect(textStyle(glyph)).toMatchObject({ fontSize: tanrei.measure.icon.large, fontFamily: tanrei.icon.family.unselected.families[0], color: painted({ kind: 'role', role: 'onSurfaceVariant' }) });
    await screen.rerender(
      <TanreiProvider theme="light">
        <Badge testID={ID} count={3} label="3 unread">
          <View testID="a" />
          <View testID="b" />
        </Badge>
      </TanreiProvider>,
    );
    const group = screen.getByTestId('a').parent!;
    expect({ accessible: group.props.accessible, value: group.props.accessibilityValue }).toEqual({ accessible: true, value: { text: '3 unread' } });
    expect(screen.getByTestId('b').parent).toBe(group);
  });

  test('BDG-9: a dot without a label still renders, and development builds say it tells assistive technology nothing', async () => {
    await mount();
    expect(part('dot')).not.toBeNull();
    expect(badgeWarnings()).toEqual([expect.stringContaining('draws a dot with no label')]);
    warn.mockClear();
    await mount({ label: 'New messages' });
    expect(badgeWarnings()).toEqual([]);
    // A count reads its displayed text: no report without a label.
    await mount({ count: 3 });
    expect(badgeWarnings()).toEqual([]);
  });

  test('BDG-10: a new count or label updates the anchor\'s description and announces nothing', async () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    await mount({ count: 3, label: '3 unread' });
    const rerender = (props: Partial<BadgeProps>) =>
      screen.rerender(
        <TanreiProvider theme="light">
          <Badge testID={ID} {...props}>
            <IconButton accessibilityLabel="Inbox" testID="anchor">
              inbox
            </IconButton>
          </Badge>
        </TanreiProvider>,
      );
    await rerender({ count: 4, label: '4 unread' });
    expect(anchor().props.accessibilityValue).toEqual({ text: '4 unread' });
    await rerender({ count: 5 });
    expect(anchor().props.accessibilityValue).toEqual({ text: '5' });
    await rerender({ count: 0 });
    expect(anchor().props.accessibilityValue?.text).toBeUndefined();
    expect(announce).not.toHaveBeenCalled();
    // Nothing is a live region either.
    expect(JSON.stringify(screen.toJSON())).not.toContain('accessibilityLiveRegion');
  });

  test('BDG-11: placement is logical (the top-left corner in right-to-left, growing to the left), and the label is isolated so 999+ keeps its plus sign after the digits', async () => {
    await mount({ count: 1200 });
    const physical = (style: object) => Object.keys(style).filter((key) => /^(left|right|marginLeft|marginRight|paddingLeft|paddingRight)$/.test(key));
    expect(physical(viewStyle(part('container')!))).toEqual([]);
    expect(String(part('label')!.props.children)).toBe(`${FSI}999+${PDI}`);
    await screen.rerender(
      <TanreiProvider theme="light">
        <Badge testID={ID} label="New">
          <IconButton accessibilityLabel="Inbox">inbox</IconButton>
        </Badge>
      </TanreiProvider>,
    );
    expect(physical(viewStyle(part('dot')!))).toEqual([]);
    expect(viewStyle(part('dot')!).end).toBeDefined();
  });

  test('BDG-12: the count uses the current locale\'s digits with no grouping separator, drawn with tabular figures', async () => {
    await mount({ count: 1200, max: 5000 });
    expect(shownText()).toBe('1200');
    expect(textStyle(part('label')!).fontVariant).toEqual(['tabular-nums']);
    // The locale is the runtime's (no locale argument); grouping is off.
    const format = jest.spyOn(Intl, 'NumberFormat');
    await mount({ count: 7 });
    expect(format).toHaveBeenCalledWith(undefined, expect.objectContaining({ useGrouping: false }));
    // A locale whose digits are not ASCII draws its own digits.
    format.mockImplementation(() => ({ format: (value: number) => String(value).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]!) }) as unknown as Intl.NumberFormat);
    expect(badgeContent(1200, 999).text).toBe('٩٩٩+');
  });

  test('BDG-13: with enlarged text the pill grows with its label and keeps the center of its leading circle — a square of the grown height — in place; the dot keeps dot.size', async () => {
    const system = withBadge({ containerOffset: 2 });
    await mount({ count: 42 }, { theme: 'light', system });
    const pill = viewStyle(part('container')!);
    expect(pill.height).toBeUndefined();
    expect(pill.width).toBeUndefined();
    expect(pill).toMatchObject({ minHeight: tokens.containerHeight, minWidth: tokens.containerHeight, top: 2 - tokens.containerHeight / 2, marginStart: -(2 + tokens.containerHeight / 2) });
    expect(part('label')!.props.allowFontScaling).toBe(true);
    expect(part('label')!.props.numberOfLines).toBeUndefined();
    // The label grew the pill to 28 (text at twice the size): the leading circle is a 28 square whose center stays
    // 2 inside the corner, and the pill is at least as wide as it is now high.
    await fireEvent(part('container')!, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 36, height: 28 } } });
    expect(viewStyle(part('container')!)).toMatchObject({ top: 2 - 14, marginStart: -(2 + 14), minWidth: 28, minHeight: tokens.containerHeight });
    // Text back to normal: the drawn height is the minimum again.
    await fireEvent(part('container')!, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 16, height: tokens.containerHeight } } });
    expect(viewStyle(part('container')!)).toMatchObject({ top: 2 - tokens.containerHeight / 2, minWidth: tokens.containerHeight });
    await mount({ label: 'New' });
    expect(viewStyle(part('dot')!)).toMatchObject({ width: tokens.dotSize, height: tokens.dotSize });
  });

  test.each([
    [-3, undefined, 'none', '', 'count -3 is negative'],
    [2.7, undefined, 'count', '2', 'count 2.7 is not a whole number; using 2'],
    [0.5, undefined, 'none', '', 'count 0.5 is not a whole number; using 0'],
    [1500, 0, 'count', '999+', 'max 0 is below 1; using 999'],
    [1500, -5, 'count', '999+', 'max -5 is below 1; using 999'],
    [Number.NaN, undefined, 'none', '', 'count NaN is not a number; drawing nothing, as for 0'],
  ] as const)('BDG-14: count %d, max %s renders as the corrected value and is reported in development builds', async (count, max, form, text, message) => {
    const shown = badgeContent(count, max ?? 999);
    expect({ form: shown.form, text: shown.text }).toEqual({ form, text });
    await mount({ count, ...(max === undefined ? {} : { max }), label: 'Unread' });
    if (form === 'none') {
      expect(part('container')).toBeNull();
      expect(part('dot')).toBeNull();
      expect(anchor().props.accessibilityValue?.text).toBeUndefined();
    } else expect(shownText()).toBe(text);
    expect(badgeWarnings()).toEqual([expect.stringContaining(message)]);
  });

  test('BDG-14: a count that is not a number — NaN, or a string from untyped code — draws nothing and announces nothing, as for 0', async () => {
    for (const count of [Number.NaN, 'lots' as unknown as number]) {
      await mount({ count, label: 'Unread' });
      expect(part('container')).toBeNull();
      expect(part('dot')).toBeNull();
      expect(anchor().props.accessibilityValue?.text).toBeUndefined();
    }
    expect(badgeWarnings()).toEqual([expect.stringContaining('count NaN is not a number'), expect.stringContaining('count lots is not a number')]);
    // Infinity is a number: above any max, it shows max+.
    expect(badgeContent(Number.POSITIVE_INFINITY, 99)).toMatchObject({ form: 'count', text: '99+' });
  });

  test('BDG-14: a release build corrects the values silently', async () => {
    const dev = (globalThis as { __DEV__?: boolean }).__DEV__;
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
    try {
      await mount({ count: -1 });
      await mount({});
      expect(badgeWarnings()).toEqual([]);
    } finally {
      (globalThis as { __DEV__?: boolean }).__DEV__ = dev;
    }
  });
});

describe('the system drives rendering', () => {
  test('changed badge tokens reach the dot, the pill, the label and the outline', async () => {
    const system = withBadge({
      containerColor: literal(200, 0, 0),
      labelColor: literal(255, 255, 255),
      labelTypescale: 'caption',
      containerHeight: 20,
      containerPaddingInline: 6,
      containerShape: 4,
      dotSize: 8,
      dotOffset: 4,
      outlineColor: literal(0, 0, 255),
      outlineWidth: 1,
    });
    await mount({ count: 3 }, { theme: 'light', system });
    expect(viewStyle(part('container')!)).toMatchObject({ minHeight: 20, minWidth: 20, paddingStart: 6, borderRadius: 4, backgroundColor: painted(literal(200, 0, 0)) });
    expect(textStyle(part('label')!)).toMatchObject({ ...createTanreiTheme(system, 'light').text('caption'), color: painted(literal(255, 255, 255)) });
    expect(viewStyle(part('outline')!)).toMatchObject({ borderWidth: 1, borderColor: painted(literal(0, 0, 255)) });
    await mount({ label: 'New' }, { theme: 'light', system });
    expect(viewStyle(part('dot')!)).toMatchObject({ width: 8, height: 8, top: 0, end: 0 });
  });

  test('a container color that resolves to nothing draws no fill', async () => {
    await mount({ count: 3 }, { theme: 'light', system: withBadge({ containerColor: { kind: 'none' } }) });
    expect(viewStyle(part('container')!).backgroundColor).toBeUndefined();
  });
});

describe('accessibility', () => {
  test('the badge has no role or name of its own and is never focusable', async () => {
    await mount({ count: 3, label: '3 unread' });
    expect(host().props.accessible).toBeUndefined();
    expect(host().props.accessibilityRole).toBeUndefined();
    expect(host().props.role).toBeUndefined();
    expect(host().props.accessibilityLabel).toBeUndefined();
    // Exactly one element is exposed: the anchor.
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  test('the spec\'s example: "Inbox, button, 3 unread"', async () => {
    await mount({ count: 3, label: '3 unread' });
    const button = screen.getByRole('button', { name: 'Inbox' });
    expect([button.props.accessibilityLabel, button.props.accessibilityRole, button.props.accessibilityValue.text]).toEqual(['Inbox', 'button', '3 unread']);
  });
});

describe('fixtures', () => {
  describeFixtureBaselines(badgeSubject);

  test('every fixture labels its badge, so none of them reports BDG-9', () => {
    for (const fixture of spec.fixtures) expect(fixture.props.label).toBeTruthy();
  });
});
